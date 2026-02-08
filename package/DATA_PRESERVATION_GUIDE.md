# ABETWORKS WORKCRM - Data Preservation System

## Overview

The ABETWORKS WORKCRM system includes a comprehensive data preservation system designed to prevent accidental data loss and ensure data integrity. This system implements soft deletes, audit logging, data validation, and automated backup procedures.

## Key Features

### 1. Soft Delete Mechanism
- Records are never permanently deleted immediately
- Instead, they are marked with `deleted_at` and `is_deleted` flags
- Records remain recoverable for a configurable retention period
- Automatic cleanup of expired soft-deleted records

### 2. Audit Trail
- All data modifications are logged in the `audit_log` table
- Tracks who made changes, when, and what changed
- Includes IP addresses and user agents for security auditing
- Maintains old and new values for change tracking

### 3. Data Validation
- Integrity checks to detect orphaned records
- Validation of foreign key relationships
- Detection of expired soft-deleted records

### 4. Automated Backups
- Scheduled backups of database and Redis
- Encrypted backup files
- S3 storage option for remote backup
- Tenant-specific data snapshots

### 5. Safety Nets
- Prevention of bulk delete operations
- Blocking of potentially dangerous SQL patterns
- Confirmation requirements for destructive operations

## Configuration

The data preservation system is configured through environment variables:

```bash
# Data retention period (in days)
DATA_RETENTION_PERIOD=30

# Backup frequency (in hours)
BACKUP_FREQUENCY_HOURS=24

# Enable audit logging
AUDIT_LOGGING_ENABLED=true

# Enable soft delete (disable to use hard deletes)
SOFT_DELETE_ENABLED=true

# Enable encryption for backups
ENCRYPTION_ENABLED=true

# Encryption key for backup files
ENCRYPTION_KEY=your-very-long-encryption-key-here

# S3 configuration for remote backups
S3_BACKUP_BUCKET=your-backup-bucket
S3_REGION=us-east-1
```

## API Endpoints

### Soft Delete
- `DELETE /api/{resource}/{id}` - Marks a record for deletion (soft delete)
- The record remains in the database but is flagged as deleted

### Restore Deleted Records
- `POST /api/{resource}/{id}/restore` - Restores a soft-deleted record

### View Soft-Deleted Records
- `GET /api/{resource}/deleted` - Retrieves soft-deleted records for a tenant

### Data Integrity Validation
- `GET /api/validation/integrity` - Validates data integrity for the current tenant

## Database Schema Changes

The data preservation system adds the following columns to all data tables:

- `deleted_at` (TIMESTAMP) - When the record was marked for deletion
- `is_deleted` (BOOLEAN) - Whether the record is marked as deleted

Indexes are created to optimize queries for these columns.

## Migration

To apply the data preservation schema changes:

```bash
npm run migrate:data-preservation
```

This will:
- Create the `audit_log` table
- Add preservation columns to all tenant data tables
- Create necessary indexes
- Install database functions for safe operations

## Security Measures

- All delete operations are intercepted and converted to soft deletes
- Bulk delete operations are blocked by default
- Dangerous SQL patterns in queries are detected and blocked
- All data modifications are logged with user context
- Encryption is used for backup files

## Recovery Procedures

### Individual Record Recovery
1. Identify the record ID that needs to be recovered
2. Call the restore endpoint: `POST /api/{resource}/{id}/restore`
3. The record will be restored and available again

### Full Tenant Recovery
1. Use the data snapshot feature to create a backup of the tenant's data
2. In case of major data loss, restore from the backup
3. Apply any necessary transformations to merge with current data

## Best Practices

- Always use the API endpoints rather than direct database manipulation
- Monitor the audit logs regularly for suspicious activity
- Configure appropriate retention periods based on business requirements
- Test the recovery procedures regularly
- Keep backup encryption keys secure
- Monitor the system for orphaned records

## Monitoring

The system includes monitoring for:
- Soft-deleted record counts
- Audit log volume
- Backup success/failure rates
- Data integrity validation results

These metrics are available through the `/metrics` endpoint for Prometheus integration.

## Emergency Procedures

In case of accidental mass deletion:
1. Immediately stop the application to prevent further changes
2. Check the audit logs to identify what was affected
3. Contact administrators for manual recovery if needed
4. Restore from backups if necessary