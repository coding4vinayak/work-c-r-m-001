import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { join } from 'path';

/**
 * Pre-shutdown backup script
 * Creates a backup of the database before shutting down the application
 */

async function createPreShutdownBackup(): Promise<void> {
  console.log('Starting pre-shutdown backup...');

  try {
    // Create a timestamp for the backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `pre-shutdown-backup-${timestamp}.sql`;
    const backupPath = join(process.cwd(), 'backups', backupFileName);

    // Ensure backup directory exists
    const fs = await import('fs');
    const path = await import('path');
    
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create database dump
    const dbUrl = process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

    return new Promise((resolve, reject) => {
      const pgDump = spawn('pg_dump', [dbUrl]);

      // Create write stream for the backup file
      const writeStream = createWriteStream(backupPath);

      // Pipe the dump output to the file
      pgDump.stdout.pipe(writeStream);

      // Handle errors
      pgDump.stderr.on('data', (data) => {
        console.error(`pg_dump stderr: ${data}`);
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          console.log(`Backup created successfully: ${backupPath}`);
          
          // Optionally encrypt the backup
          if (process.env.ENCRYPTION_ENABLED === 'true' && process.env.ENCRYPTION_KEY) {
            encryptBackup(backupPath)
              .then(() => resolve())
              .catch(reject);
          } else {
            resolve();
          }
        } else {
          console.error(`pg_dump exited with code ${code}`);
          reject(new Error(`pg_dump failed with code ${code}`));
        }
      });
    });
  } catch (error) {
    console.error('Pre-shutdown backup failed:', error);
    throw error;
  }
}

async function encryptBackup(backupPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const crypto = require('crypto');
    const fs = require('fs');
    
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      reject(new Error('Encryption key not provided'));
      return;
    }

    // Create cipher
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);

    // Create read and write streams
    const readStream = fs.createReadStream(backupPath);
    const writeStream = fs.createWriteStream(backupPath + '.enc');

    // Add IV to the beginning of the encrypted file
    writeStream.write(iv);

    // Pipe through cipher
    readStream.pipe(cipher).pipe(writeStream);

    writeStream.on('finish', () => {
      // Replace original with encrypted version
      fs.renameSync(backupPath + '.enc', backupPath);
      console.log(`Backup encrypted: ${backupPath}`);
      resolve();
    });

    writeStream.on('error', reject);
  });
}

// Handle shutdown signals
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, creating pre-shutdown backup...');
  try {
    await createPreShutdownBackup();
    console.log('Pre-shutdown backup completed, exiting...');
    process.exit(0);
  } catch (error) {
    console.error('Pre-shutdown backup failed:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, creating pre-shutdown backup...');
  try {
    await createPreShutdownBackup();
    console.log('Pre-shutdown backup completed, exiting...');
    process.exit(0);
  } catch (error) {
    console.error('Pre-shutdown backup failed:', error);
    process.exit(1);
  }
});

// Export the function for use in other modules
export { createPreShutdownBackup };