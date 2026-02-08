import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import { createClient } from 'redis';

const execPromise = promisify(exec);

// Configuration for backup settings
interface BackupConfig {
  retentionDays: number;
  backupDirectory: string;
  databaseUrl: string;
  s3Bucket?: string;
  s3Region?: string;
  encryptionKey?: string;
}

// Default configuration
const defaultConfig: BackupConfig = {
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
  backupDirectory: process.env.BACKUP_DIRECTORY || './backups',
  databaseUrl: process.env.DATABASE_URL || process.env.DB_HOST 
    ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    : '',
  s3Bucket: process.env.S3_BACKUP_BUCKET,
  s3Region: process.env.S3_REGION,
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY
};

class BackupManager {
  private config: BackupConfig;
  private dbPool: Pool;
  private redisClient: any;

  constructor(config: BackupConfig) {
    this.config = config;
    this.dbPool = new Pool({
      connectionString: config.databaseUrl
    });
    
    if (process.env.REDIS_URL) {
      this.redisClient = createClient({ url: process.env.REDIS_URL });
      this.redisClient.connect();
    }
  }

  // Create a database backup
  async createDatabaseBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `abetworks-workcrm-db-backup-${timestamp}.sql`;
    const filePath = path.join(this.config.backupDirectory, fileName);

    // Ensure backup directory exists
    await fs.mkdir(this.config.backupDirectory, { recursive: true });

    try {
      // Use pg_dump to create the backup
      const dumpCommand = `pg_dump "${this.config.databaseUrl}" > "${filePath}"`;
      await execPromise(dumpCommand);
      
      console.log(`Database backup created: ${filePath}`);
      
      // Optionally encrypt the backup
      if (this.config.encryptionKey) {
        await this.encryptFile(filePath);
      }
      
      // Optionally upload to S3
      if (this.config.s3Bucket) {
        await this.uploadToS3(filePath);
      }
      
      return filePath;
    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }

  // Create a Redis backup (dump all keys)
  async createRedisBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `abetworks-workcrm-redis-backup-${timestamp}.rdb`;
    const filePath = path.join(this.config.backupDirectory, fileName);

    try {
      if (this.redisClient) {
        // Save Redis data to disk temporarily
        await this.redisClient.save();
        
        // Copy the Redis dump file to our backup location
        const redisDumpPath = process.env.REDIS_DUMP_PATH || '/var/lib/redis/dump.rdb';
        const copyCommand = `cp "${redisDumpPath}" "${filePath}"`;
        await execPromise(copyCommand);
        
        console.log(`Redis backup created: ${filePath}`);
        
        // Optionally encrypt the backup
        if (this.config.encryptionKey) {
          await this.encryptFile(filePath);
        }
        
        // Optionally upload to S3
        if (this.config.s3Bucket) {
          await this.uploadToS3(filePath);
        }
        
        return filePath;
      } else {
        console.warn('Redis client not available, skipping Redis backup');
        return '';
      }
    } catch (error) {
      console.error('Redis backup failed:', error);
      throw error;
    }
  }

  // Create a complete system backup
  async createFullBackup(): Promise<{ database: string; redis?: string }> {
    console.log('Starting full system backup...');
    
    const dbBackupPath = await this.createDatabaseBackup();
    let redisBackupPath: string | undefined;
    
    try {
      redisBackupPath = await this.createRedisBackup();
    } catch (error) {
      console.error('Redis backup failed, continuing with database backup only:', error);
    }
    
    // Clean up old backups
    await this.cleanupOldBackups();
    
    console.log('Full system backup completed');
    
    return {
      database: dbBackupPath,
      redis: redisBackupPath
    };
  }

  // Encrypt a file using openssl
  private async encryptFile(filePath: string): Promise<void> {
    const encryptedFilePath = `${filePath}.enc`;
    
    const encryptCommand = `openssl enc -aes-256-cbc -salt -in "${filePath}" -out "${encryptedFilePath}" -k "${this.config.encryptionKey}"`;
    await execPromise(encryptCommand);
    
    // Replace original file with encrypted version
    await fs.rename(encryptedFilePath, filePath);
    console.log(`File encrypted: ${filePath}`);
  }

  // Decrypt a file using openssl
  private async decryptFile(filePath: string): Promise<void> {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not provided');
    }
    
    const decryptedFilePath = filePath.replace('.enc', '');
    
    const decryptCommand = `openssl enc -d -aes-256-cbc -in "${filePath}" -out "${decryptedFilePath}" -k "${this.config.encryptionKey}"`;
    await execPromise(decryptCommand);
    
    console.log(`File decrypted: ${decryptedFilePath}`);
  }

  // Upload backup to S3
  private async uploadToS3(filePath: string): Promise<void> {
    if (!this.config.s3Bucket || !this.config.s3Region) {
      throw new Error('S3 bucket and region not configured');
    }
    
    const fileName = path.basename(filePath);
    const uploadCommand = `aws s3 cp "${filePath}" "s3://${this.config.s3Bucket}/${fileName}" --region ${this.config.s3Region}`;
    await execPromise(uploadCommand);
    
    console.log(`Backup uploaded to S3: s3://${this.config.s3Bucket}/${fileName}`);
  }

  // Download backup from S3
  async downloadFromS3(fileName: string): Promise<string> {
    if (!this.config.s3Bucket || !this.config.s3Region) {
      throw new Error('S3 bucket and region not configured');
    }
    
    const localPath = path.join(this.config.backupDirectory, fileName);
    const downloadCommand = `aws s3 cp "s3://${this.config.s3Bucket}/${fileName}" "${localPath}" --region ${this.config.s3Region}`;
    await execPromise(downloadCommand);
    
    console.log(`Backup downloaded from S3: ${localPath}`);
    return localPath;
  }

  // Restore database from backup
  async restoreDatabase(backupPath: string): Promise<void> {
    if (backupPath.endsWith('.enc') && this.config.encryptionKey) {
      await this.decryptFile(backupPath);
      backupPath = backupPath.replace('.enc', '');
    }
    
    const restoreCommand = `psql "${this.config.databaseUrl}" < "${backupPath}"`;
    await execPromise(restoreCommand);
    
    console.log(`Database restored from: ${backupPath}`);
  }

  // Restore Redis from backup
  async restoreRedis(backupPath: string): Promise<void> {
    if (backupPath.endsWith('.enc') && this.config.encryptionKey) {
      await this.decryptFile(backupPath);
      backupPath = backupPath.replace('.enc', '');
    }
    
    // Stop Redis, replace dump file, restart Redis
    // This is a simplified approach - in production you'd want to handle this more carefully
    const redisDumpPath = process.env.REDIS_DUMP_PATH || '/var/lib/redis/dump.rdb';
    const restoreCommand = `cp "${backupPath}" "${redisDumpPath}"`;
    await execPromise(restoreCommand);
    
    console.log(`Redis restored from: ${backupPath}`);
  }

  // Cleanup old backups based on retention policy
  async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.backupDirectory);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
      
      for (const file of files) {
        const filePath = path.join(this.config.backupDirectory, file);
        const stat = await fs.stat(filePath);
        
        if (stat.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`Deleted old backup: ${filePath}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  // Get list of available backups
  async getAvailableBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.backupDirectory);
      return files.filter(file => file.includes('backup')).sort().reverse();
    } catch (error) {
      console.error('Error getting available backups:', error);
      return [];
    }
  }

  // Perform a backup health check
  async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      // Check if file exists and has content
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        console.error('Backup file is empty');
        return false;
      }
      
      // For database backups, we could run pg_restore --dry-run to verify
      if (backupPath.endsWith('.sql')) {
        const verifyCommand = `pg_restore --dry-run "${backupPath}"`;
        await execPromise(verifyCommand);
      }
      
      console.log(`Backup verified: ${backupPath}`);
      return true;
    } catch (error) {
      console.error(`Backup verification failed for ${backupPath}:`, error);
      return false;
    }
  }

  // Close connections
  async close(): Promise<void> {
    await this.dbPool.end();
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// Initialize backup manager with default config
export const backupManager = new BackupManager(defaultConfig);

// Schedule automatic backups
export const scheduleAutomaticBackups = (): void => {
  const backupIntervalHours = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24');
  
  if (backupIntervalHours > 0) {
    console.log(`Scheduling automatic backups every ${backupIntervalHours} hours`);
    
    // Run initial backup
    backupManager.createFullBackup()
      .catch(error => console.error('Initial backup failed:', error));
    
    // Schedule recurring backups
    setInterval(async () => {
      try {
        console.log('Running scheduled backup...');
        await backupManager.createFullBackup();
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, backupIntervalHours * 60 * 60 * 1000); // Convert hours to milliseconds
  } else {
    console.log('Automatic backups disabled');
  }
};

// Disaster recovery function
export const performDisasterRecovery = async (backupFileName: string): Promise<void> => {
  console.log(`Starting disaster recovery using backup: ${backupFileName}`);
  
  try {
    // Download backup from S3 if configured
    let localBackupPath: string;
    if (defaultConfig.s3Bucket) {
      localBackupPath = await backupManager.downloadFromS3(backupFileName);
    } else {
      localBackupPath = path.join(defaultConfig.backupDirectory, backupFileName);
    }
    
    // Verify backup before restoring
    const isValid = await backupManager.verifyBackup(localBackupPath);
    if (!isValid) {
      throw new Error('Backup verification failed, aborting recovery');
    }
    
    // Restore database
    await backupManager.restoreDatabase(localBackupPath);
    
    // Restore Redis if available
    const redisBackupPath = localBackupPath.replace('db-backup', 'redis-backup');
    if (await fs.access(redisBackupPath).then(() => true).catch(() => false)) {
      await backupManager.restoreRedis(redisBackupPath);
    }
    
    console.log('Disaster recovery completed successfully');
  } catch (error) {
    console.error('Disaster recovery failed:', error);
    throw error;
  }
};