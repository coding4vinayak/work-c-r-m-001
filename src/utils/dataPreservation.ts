import { Pool } from 'pg';
import { createClient } from 'redis';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { scheduleAutomaticBackups, backupManager } from './backup';

const execPromise = promisify(exec);

// Data preservation configuration
interface PreservationConfig {
  retentionPeriod: number; // Days to retain soft-deleted data
  backupFrequency: number; // Hours between backups
  enableAuditLogging: boolean;
  enableSoftDelete: boolean;
  encryptionEnabled: boolean;
}

const defaultPreservationConfig: PreservationConfig = {
  retentionPeriod: parseInt(process.env.DATA_RETENTION_PERIOD || '30'),
  backupFrequency: parseInt(process.env.BACKUP_FREQUENCY_HOURS || '24'),
  enableAuditLogging: process.env.AUDIT_LOGGING_ENABLED === 'true',
  enableSoftDelete: process.env.SOFT_DELETE_ENABLED !== 'false',
  encryptionEnabled: process.env.ENCRYPTION_ENABLED === 'true'
};

class DataPreservationManager {
  private config: PreservationConfig;
  private dbPool: Pool;
  private redisClient: any;

  constructor(config: PreservationConfig) {
    this.config = config;
    this.dbPool = new Pool({
      connectionString: process.env.DATABASE_URL || 
        `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    });
    
    if (process.env.REDIS_URL) {
      this.redisClient = createClient({ url: process.env.REDIS_URL });
      this.redisClient.connect();
    }
  }

  // Initialize data preservation system
  async initialize(): Promise<void> {
    console.log('Initializing data preservation system...');
    
    // Create necessary database tables for data preservation
    await this.setupDatabasePreservationTables();
    
    // Schedule automatic backups
    scheduleAutomaticBackups();
    
    // Set up data retention policies
    await this.setupDataRetentionPolicies();
    
    console.log('Data preservation system initialized successfully');
  }

  // Set up database tables for data preservation
  private async setupDatabasePreservationTables(): Promise<void> {
    // Create audit log table
    await this.dbPool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        user_id UUID,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create soft delete columns for all tenant data tables
    const tenantTables = [
      'tenant_data.customers',
      'tenant_data.leads', 
      'tenant_data.deals',
      'tenant_data.tasks',
      'tenant_data.quotes',
      'tenant_data.invoices',
      'tenant_data.payments',
      'tenant_data.files',
      'tenant_data.tags'
    ];

    for (const table of tenantTables) {
      try {
        // Add deleted_at column if it doesn't exist
        await this.dbPool.query(`
          ALTER TABLE ${table} 
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        `);
        
        // Create indexes for soft delete queries
        await this.dbPool.query(`
          CREATE INDEX IF NOT EXISTS idx_${table.replace('.', '_')}_deleted_at 
          ON ${table}(deleted_at) WHERE deleted_at IS NOT NULL;
        `);
        
        console.log(`Added preservation columns to ${table}`);
      } catch (error) {
        console.error(`Error adding preservation columns to ${table}:`, error);
      }
    }
  }

  // Set up data retention policies
  private async setupDataRetentionPolicies(): Promise<void> {
    // Create a background job to periodically clean up old soft-deleted records
    setInterval(async () => {
      await this.purgeExpiredRecords();
    }, this.config.retentionPeriod * 24 * 60 * 60 * 1000); // Run daily
  }

  // Soft delete a record with audit trail
  async softDeleteRecord(
    table: string, 
    recordId: string, 
    tenantId: string, 
    userId: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<boolean> {
    if (!this.config.enableSoftDelete) {
      // If soft delete is disabled, perform hard delete
      return await this.hardDeleteRecord(table, recordId);
    }

    try {
      // Get the current record values before deletion for audit purposes
      const currentRecord = await this.dbPool.query(
        `SELECT * FROM ${table} WHERE id = $1 AND tenant_id = $2`, 
        [recordId, tenantId]
      );

      if (currentRecord.rows.length === 0) {
        console.warn(`Record ${recordId} not found in ${table} for tenant ${tenantId}`);
        return false;
      }

      // Perform soft delete
      await this.dbPool.query(
        `UPDATE ${table} 
         SET deleted_at = CURRENT_TIMESTAMP, is_deleted = TRUE 
         WHERE id = $1 AND tenant_id = $2`,
        [recordId, tenantId]
      );

      // Log the deletion in audit trail
      if (this.config.enableAuditLogging) {
        await this.dbPool.query(
          `INSERT INTO audit_log 
           (tenant_id, user_id, action, resource_type, resource_id, old_values, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            tenantId,
            userId,
            'SOFT_DELETE',
            table,
            recordId,
            JSON.stringify(currentRecord.rows[0]),
            ipAddress,
            userAgent
          ]
        );
      }

      console.log(`Soft deleted record ${recordId} from ${table} for tenant ${tenantId}`);
      return true;
    } catch (error) {
      console.error(`Error soft deleting record ${recordId} from ${table}:`, error);
      return false;
    }
  }

  // Hard delete a record (use with caution)
  async hardDeleteRecord(table: string, recordId: string): Promise<boolean> {
    try {
      await this.dbPool.query(
        `DELETE FROM ${table} WHERE id = $1`, 
        [recordId]
      );
      
      console.log(`Hard deleted record ${recordId} from ${table}`);
      return true;
    } catch (error) {
      console.error(`Error hard deleting record ${recordId} from ${table}:`, error);
      return false;
    }
  }

  // Restore a soft-deleted record
  async restoreRecord(
    table: string, 
    recordId: string, 
    tenantId: string, 
    userId: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<boolean> {
    try {
      // Restore the record
      await this.dbPool.query(
        `UPDATE ${table} 
         SET deleted_at = NULL, is_deleted = FALSE 
         WHERE id = $1 AND tenant_id = $2`,
        [recordId, tenantId]
      );

      // Log the restoration in audit trail
      if (this.config.enableAuditLogging) {
        await this.dbPool.query(
          `INSERT INTO audit_log 
           (tenant_id, user_id, action, resource_type, resource_id, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            tenantId,
            userId,
            'RESTORE',
            table,
            recordId,
            ipAddress,
            userAgent
          ]
        );
      }

      console.log(`Restored record ${recordId} in ${table} for tenant ${tenantId}`);
      return true;
    } catch (error) {
      console.error(`Error restoring record ${recordId} in ${table}:`, error);
      return false;
    }
  }

  // Permanently purge expired soft-deleted records
  private async purgeExpiredRecords(): Promise<void> {
    console.log('Starting expired records purge...');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriod);
    const cutoffDateString = cutoffDate.toISOString();

    const tenantTables = [
      'tenant_data.customers',
      'tenant_data.leads', 
      'tenant_data.deals',
      'tenant_data.tasks',
      'tenant_data.quotes',
      'tenant_data.invoices',
      'tenant_data.payments',
      'tenant_data.files',
      'tenant_data.tags'
    ];

    for (const table of tenantTables) {
      try {
        // Permanently delete records that have been soft-deleted beyond retention period
        const result = await this.dbPool.query(
          `DELETE FROM ${table} 
           WHERE deleted_at IS NOT NULL 
           AND deleted_at < $1`,
          [cutoffDateString]
        );

        if (result.rowCount && result.rowCount > 0) {
          console.log(`Purged ${result.rowCount} expired records from ${table}`);
        }
      } catch (error) {
        console.error(`Error purging expired records from ${table}:`, error);
      }
    }

    console.log('Expired records purge completed');
  }

  // Get soft-deleted records for a tenant
  async getSoftDeletedRecords(tenantId: string, table: string, limit: number = 50): Promise<any[]> {
    try {
      const result = await this.dbPool.query(
        `SELECT * FROM ${table} 
         WHERE tenant_id = $1 AND is_deleted = TRUE 
         ORDER BY deleted_at DESC LIMIT $2`,
        [tenantId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error(`Error getting soft-deleted records from ${table}:`, error);
      return [];
    }
  }

  // Create a snapshot of all tenant data
  async createDataSnapshot(tenantId: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `tenant-${tenantId}-snapshot-${timestamp}.sql`;
    const filePath = path.join('./snapshots', fileName);

    // Ensure snapshots directory exists
    await fs.mkdir('./snapshots', { recursive: true });

    try {
      // Create a filtered dump for this specific tenant
      const dumpCommand = `pg_dump "${process.env.DATABASE_URL}" ` +
                         `--table='tenant_data.*' ` +
                         `--where="tenant_id='${tenantId}'" ` +
                         `> "${filePath}"`;
      
      await execPromise(dumpCommand);
      
      console.log(`Data snapshot created for tenant ${tenantId}: ${filePath}`);
      
      // Optionally encrypt the snapshot
      if (this.config.encryptionEnabled) {
        await this.encryptFile(filePath);
      }
      
      return filePath;
    } catch (error) {
      console.error(`Data snapshot failed for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  // Encrypt a file using openssl
  private async encryptFile(filePath: string): Promise<void> {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not provided');
    }
    
    const encryptedFilePath = `${filePath}.enc`;
    
    const encryptCommand = `openssl enc -aes-256-cbc -salt -in "${filePath}" -out "${encryptedFilePath}" -k "${encryptionKey}"`;
    await execPromise(encryptCommand);
    
    // Replace original file with encrypted version
    await fs.rename(encryptedFilePath, filePath);
    console.log(`File encrypted: ${filePath}`);
  }

  // Validate data integrity for a tenant
  async validateDataIntegrity(tenantId: string): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check for orphaned records
      const orphanedChecks = [
        { table: 'tenant_data.leads', refTable: 'tenant_data.customers', refColumn: 'customer_id' },
        { table: 'tenant_data.deals', refTable: 'tenant_data.leads', refColumn: 'lead_id' },
        { table: 'tenant_data.tasks', refTable: 'tenant_data.users', refColumn: 'assigned_to' },
        { table: 'tenant_data.invoices', refTable: 'tenant_data.quotes', refColumn: 'quote_id' }
      ];

      for (const check of orphanedChecks) {
        const result = await this.dbPool.query(
          `SELECT COUNT(*) as count FROM ${check.table} t1 
           LEFT JOIN ${check.refTable} t2 ON t1.${check.refColumn} = t2.id 
           WHERE t1.tenant_id = $1 AND t2.id IS NULL AND t1.${check.refColumn} IS NOT NULL`,
          [tenantId]
        );

        const count = result.rows[0].count ? parseInt(result.rows[0].count) : 0;
        if (count > 0) {
          issues.push(`Found ${count} orphaned records in ${check.table}`);
        }
      }

      // Check for soft-deleted records that should be purged
      const expiredRecordsResult = await this.dbPool.query(
        `SELECT COUNT(*) as count FROM tenant_data.customers 
         WHERE tenant_id = $1 AND deleted_at IS NOT NULL 
         AND deleted_at < NOW() - INTERVAL '${this.config.retentionPeriod} days'`,
        [tenantId]
      );

      const expiredCount = expiredRecordsResult.rows[0].count ? parseInt(expiredRecordsResult.rows[0].count) : 0;
      if (expiredCount > 0) {
        issues.push(`Found ${expiredCount} expired soft-deleted records`);
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error(`Error validating data integrity for tenant ${tenantId}:`, error);
      return {
        isValid: false,
        issues: [`Data validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
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

// Initialize the data preservation manager
export const dataPreservationManager = new DataPreservationManager(defaultPreservationConfig);

// Initialize the system when imported
dataPreservationManager.initialize()
  .catch(error => {
    console.error('Failed to initialize data preservation system:', error);
    console.warn('Continuing without data preservation features');
  });

// Function to safely delete records with confirmation
export const safelyDeleteRecord = async (
  table: string,
  recordId: string,
  tenantId: string,
  userId: string,
  ipAddress: string,
  userAgent: string,
  confirmAction: boolean = false
): Promise<boolean> => {
  if (!confirmAction) {
    console.warn(`Deletion of ${table} record ${recordId} requires confirmation`);
    return false;
  }

  return await dataPreservationManager.softDeleteRecord(
    table,
    recordId,
    tenantId,
    userId,
    ipAddress,
    userAgent
  );
};

// Function to restore records
export const restoreRecord = async (
  table: string,
  recordId: string,
  tenantId: string,
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<boolean> => {
  return await dataPreservationManager.restoreRecord(
    table,
    recordId,
    tenantId,
    userId,
    ipAddress,
    userAgent
  );
};

// Function to get soft-deleted records
export const getSoftDeletedRecords = async (tenantId: string, table: string): Promise<any[]> => {
  return await dataPreservationManager.getSoftDeletedRecords(tenantId, table);
};

// Function to validate data integrity
export const validateTenantDataIntegrity = async (tenantId: string): Promise<{ isValid: boolean; issues: string[] }> => {
  return await dataPreservationManager.validateDataIntegrity(tenantId);
};