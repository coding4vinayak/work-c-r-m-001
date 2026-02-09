import { Worker, Queue } from 'bullmq';
import { pool } from './config/database';
import { redisConnection } from './config/redis';
import dotenv from 'dotenv';
import { logger } from './utils/logging';

dotenv.config();

// Initialize BullMQ queues for different types of background jobs
const customerQueue = new Queue('customer-operations', { connection: redisConnection });
const leadQueue = new Queue('lead-operations', { connection: redisConnection });
const notificationQueue = new Queue('notifications', { connection: redisConnection });
const fileQueue = new Queue('file-processing', { connection: redisConnection });
const reportQueue = new Queue('reports', { connection: redisConnection });
const backupQueue = new Queue('backups', { connection: redisConnection });

// Customer Operations Worker - Handles all customer-related background tasks
const customerOperationsWorker = new Worker(
  'customer-operations',
  async (job) => {
    logger.info(`Processing customer operation job: ${job.id}`, {
      jobId: job.id,
      operation: job.name,
      tenantId: job.data.tenantId,
      userId: job.data.userId
    });

    try {
      switch(job.name) {
        case 'sync-customer':
          // Sync customer data across systems
          logger.info(`Syncing customer: ${job.data.customerId}`, { 
            customerId: job.data.customerId,
            tenantId: job.data.tenantId
          });
          // Add actual customer sync logic here
          break;
          
        case 'update-customer-index':
          // Update customer search index
          logger.info(`Updating customer index: ${job.data.customerId}`, { 
            customerId: job.data.customerId,
            tenantId: job.data.tenantId
          });
          // Add actual index update logic here
          break;
          
        case 'calculate-customer-analytics':
          // Calculate customer analytics and metrics
          logger.info(`Calculating customer analytics: ${job.data.customerId}`, { 
            customerId: job.data.customerId,
            tenantId: job.data.tenantId
          });
          // Add actual analytics calculation logic here
          break;
          
        default:
          logger.warn(`Unknown customer operation: ${job.name}`, {
            operation: job.name,
            data: job.data
          });
      }

      logger.info(`Customer operation completed: ${job.id}`, {
        jobId: job.id,
        operation: job.name,
        success: true
      });

      return { success: true, operation: job.name, data: job.data };
    } catch (error: any) {
      logger.error(`Error processing customer operation: ${error.message}`, {
        jobId: job.id,
        operation: job.name,
        error: error.message,
        stack: error.stack,
        data: job.data
      });
      throw error;
    }
  },
  { 
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 100, // Max 100 jobs per time window
      duration: 30000, // 30 second time window
    }
  }
);

// Lead Processing Worker - Handles lead qualification, scoring, and follow-ups
const leadProcessingWorker = new Worker(
  'lead-operations',
  async (job) => {
    logger.info(`Processing lead operation job: ${job.id}`, {
      jobId: job.id,
      operation: job.name,
      tenantId: job.data.tenantId,
      userId: job.data.userId
    });

    try {
      switch(job.name) {
        case 'qualify-lead':
          // Qualify lead based on criteria
          logger.info(`Qualifying lead: ${job.data.leadId}`, { 
            leadId: job.data.leadId,
            tenantId: job.data.tenantId
          });
          // Add actual lead qualification logic here
          break;
          
        case 'score-lead':
          // Score lead based on engagement and fit
          logger.info(`Scoring lead: ${job.data.leadId}`, { 
            leadId: job.data.leadId,
            tenantId: job.data.tenantId
          });
          // Add actual lead scoring logic here
          break;
          
        case 'schedule-followup':
          // Schedule follow-up tasks for lead
          logger.info(`Scheduling follow-up for lead: ${job.data.leadId}`, { 
            leadId: job.data.leadId,
            tenantId: job.data.tenantId
          });
          // Add actual follow-up scheduling logic here
          break;
          
        case 'assign-lead':
          // Assign lead to sales representative
          logger.info(`Assigning lead: ${job.data.leadId}`, { 
            leadId: job.data.leadId,
            assigneeId: job.data.assigneeId,
            tenantId: job.data.tenantId
          });
          // Add actual lead assignment logic here
          break;
          
        default:
          logger.warn(`Unknown lead operation: ${job.name}`, {
            operation: job.name,
            data: job.data
          });
      }

      logger.info(`Lead operation completed: ${job.id}`, {
        jobId: job.id,
        operation: job.name,
        success: true
      });

      return { success: true, operation: job.name, data: job.data };
    } catch (error: any) {
      logger.error(`Error processing lead operation: ${error.message}`, {
        jobId: job.id,
        operation: job.name,
        error: error.message,
        stack: error.stack,
        data: job.data
      });
      throw error;
    }
  },
  { 
    connection: redisConnection,
    concurrency: 3, // Process up to 3 jobs concurrently
    limiter: {
      max: 50, // Max 50 jobs per time window
      duration: 30000, // 30 second time window
    }
  }
);

// Notification Worker - Handles all types of notifications (email, SMS, push)
const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    logger.info(`Processing notification job: ${job.id}`, {
      jobId: job.id,
      notificationType: job.name,
      tenantId: job.data.tenantId,
      userId: job.data.userId
    });

    try {
      switch(job.name) {
        case 'send-email':
          // Send email notification
          logger.info(`Sending email to: ${job.data.recipient}`, { 
            recipient: job.data.recipient,
            subject: job.data.subject,
            tenantId: job.data.tenantId
          });
          
          // Update notification status in database
          await pool.query(
            'UPDATE tenant_data.notifications SET is_sent = true, sent_at = NOW() WHERE id = $1',
            [job.data.notificationId]
          );
          break;
          
        case 'send-sms':
          // Send SMS notification
          logger.info(`Sending SMS to: ${job.data.phoneNumber}`, { 
            phoneNumber: job.data.phoneNumber,
            tenantId: job.data.tenantId
          });
          
          // Update notification status in database
          await pool.query(
            'UPDATE tenant_data.notifications SET is_sent = true, sent_at = NOW() WHERE id = $1',
            [job.data.notificationId]
          );
          break;
          
        case 'send-push':
          // Send push notification
          logger.info(`Sending push notification to: ${job.data.deviceToken}`, { 
            deviceToken: job.data.deviceToken,
            tenantId: job.data.tenantId
          });
          
          // Update notification status in database
          await pool.query(
            'UPDATE tenant_data.notifications SET is_sent = true, sent_at = NOW() WHERE id = $1',
            [job.data.notificationId]
          );
          break;
          
        case 'remind-task':
          // Send task reminder notification
          logger.info(`Sending task reminder to: ${job.data.userId}`, { 
            userId: job.data.userId,
            taskId: job.data.taskId,
            tenantId: job.data.tenantId
          });
          break;
          
        default:
          logger.warn(`Unknown notification type: ${job.name}`, {
            notificationType: job.name,
            data: job.data
          });
      }

      logger.info(`Notification completed: ${job.id}`, {
        jobId: job.id,
        notificationType: job.name,
        success: true
      });

      return { success: true, notificationType: job.name, data: job.data };
    } catch (error: any) {
      logger.error(`Error processing notification: ${error.message}`, {
        jobId: job.id,
        notificationType: job.name,
        error: error.message,
        stack: error.stack,
        data: job.data
      });
      
      // Update notification status as failed
      await pool.query(
        'UPDATE tenant_data.notifications SET is_sent = false, error_message = $1 WHERE id = $2',
        [error.message, job.data.notificationId]
      );
      
      throw error;
    }
  },
  { 
    connection: redisConnection,
    concurrency: 10, // Process up to 10 jobs concurrently
    limiter: {
      max: 200, // Max 200 jobs per time window
      duration: 30000, // 30 second time window
    }
  }
);

// File Processing Worker - Handles file uploads, conversions, and storage
const fileProcessingWorker = new Worker(
  'file-processing',
  async (job) => {
    logger.info(`Processing file job: ${job.id}`, {
      jobId: job.id,
      operation: job.name,
      tenantId: job.data.tenantId,
      userId: job.data.userId
    });

    try {
      switch(job.name) {
        case 'upload-file':
          // Process file upload to storage
          logger.info(`Uploading file: ${job.data.fileName}`, { 
            fileName: job.data.fileName,
            fileSize: job.data.fileSize,
            tenantId: job.data.tenantId
          });
          // Add actual file upload logic here
          break;
          
        case 'convert-document':
          // Convert document to different format
          logger.info(`Converting document: ${job.data.fileName}`, { 
            fileName: job.data.fileName,
            fromFormat: job.data.fromFormat,
            toFormat: job.data.toFormat,
            tenantId: job.data.tenantId
          });
          // Add actual document conversion logic here
          break;
          
        case 'resize-image':
          // Resize image to different dimensions
          logger.info(`Resizing image: ${job.data.fileName}`, { 
            fileName: job.data.fileName,
            width: job.data.width,
            height: job.data.height,
            tenantId: job.data.tenantId
          });
          // Add actual image resizing logic here
          break;
          
        case 'generate-thumbnail':
          // Generate thumbnail for file
          logger.info(`Generating thumbnail: ${job.data.fileName}`, { 
            fileName: job.data.fileName,
            tenantId: job.data.tenantId
          });
          // Add actual thumbnail generation logic here
          break;
          
        case 'scan-virus':
          // Scan file for viruses/malware
          logger.info(`Scanning file for viruses: ${job.data.fileName}`, { 
            fileName: job.data.fileName,
            tenantId: job.data.tenantId
          });
          // Add actual virus scanning logic here
          break;
          
        default:
          logger.warn(`Unknown file operation: ${job.name}`, {
            operation: job.name,
            data: job.data
          });
      }

      // Update file processing status
      await pool.query(
        'UPDATE tenant_data.files SET processing_status = $1, processed_at = NOW() WHERE id = $2',
        ['completed', job.data.fileId]
      );

      logger.info(`File operation completed: ${job.id}`, {
        jobId: job.id,
        operation: job.name,
        success: true
      });

      return { success: true, operation: job.name, data: job.data };
    } catch (error: any) {
      logger.error(`Error processing file: ${error.message}`, {
        jobId: job.id,
        operation: job.name,
        error: error.message,
        stack: error.stack,
        data: job.data
      });
      
      // Update file processing status as failed
      await pool.query(
        'UPDATE tenant_data.files SET processing_status = $1, error_message = $2 WHERE id = $3',
        ['failed', error.message, job.data.fileId]
      );
      
      throw error;
    }
  },
  { 
    connection: redisConnection,
    concurrency: 2, // Process up to 2 jobs concurrently (resource intensive)
    limiter: {
      max: 20, // Max 20 jobs per time window (resource intensive)
      duration: 60000, // 60 second time window
    }
  }
);

// Reporting Worker - Generates reports and analytics
const reportingWorker = new Worker(
  'reports',
  async (job) => {
    logger.info(`Processing report job: ${job.id}`, {
      jobId: job.id,
      reportType: job.name,
      tenantId: job.data.tenantId,
      userId: job.data.userId
    });

    try {
      switch(job.name) {
        case 'generate-sales-report':
          // Generate sales performance report
          logger.info(`Generating sales report for tenant: ${job.data.tenantId}`, { 
            tenantId: job.data.tenantId,
            dateRange: job.data.dateRange
          });
          // Add actual report generation logic here
          break;
          
        case 'generate-leads-report':
          // Generate lead generation report
          logger.info(`Generating leads report for tenant: ${job.data.tenantId}`, { 
            tenantId: job.data.tenantId,
            dateRange: job.data.dateRange
          });
          // Add actual report generation logic here
          break;
          
        case 'generate-deal-pipeline':
          // Generate deal pipeline report
          logger.info(`Generating deal pipeline report for tenant: ${job.data.tenantId}`, { 
            tenantId: job.data.tenantId,
            dateRange: job.data.dateRange
          });
          // Add actual report generation logic here
          break;
          
        case 'generate-customer-analytics':
          // Generate customer analytics report
          logger.info(`Generating customer analytics for tenant: ${job.data.tenantId}`, { 
            tenantId: job.data.tenantId,
            dateRange: job.data.dateRange
          });
          // Add actual report generation logic here
          break;
          
        default:
          logger.warn(`Unknown report type: ${job.name}`, {
            reportType: job.name,
            data: job.data
          });
      }

      logger.info(`Report generation completed: ${job.id}`, {
        jobId: job.id,
        reportType: job.name,
        success: true
      });

      return { success: true, reportType: job.name, data: job.data };
    } catch (error: any) {
      logger.error(`Error generating report: ${error.message}`, {
        jobId: job.id,
        reportType: job.name,
        error: error.message,
        stack: error.stack,
        data: job.data
      });
      throw error;
    }
  },
  { 
    connection: redisConnection,
    concurrency: 1, // Process 1 report at a time (resource intensive)
    limiter: {
      max: 5, // Max 5 reports per time window (resource intensive)
      duration: 120000, // 120 second time window
    }
  }
);

// Backup Worker - Handles data backups and maintenance
const backupWorker = new Worker(
  'backups',
  async (job) => {
    logger.info(`Processing backup job: ${job.id}`, {
      jobId: job.id,
      backupType: job.name,
      tenantId: job.data.tenantId
    });

    try {
      switch(job.name) {
        case 'daily-backup':
          // Perform daily data backup
          logger.info(`Performing daily backup for tenant: ${job.data.tenantId}`, { 
            tenantId: job.data.tenantId,
            backupDate: new Date().toISOString()
          });
          // Add actual backup logic here
          break;
          
        case 'weekly-backup':
          // Perform weekly comprehensive backup
          logger.info(`Performing weekly backup for tenant: ${job.data.tenantId}`, { 
            tenantId: job.data.tenantId,
            backupDate: new Date().toISOString()
          });
          // Add actual backup logic here
          break;
          
        case 'monthly-backup':
          // Perform monthly archival backup
          logger.info(`Performing monthly backup for tenant: ${job.data.tenantId}`, { 
            tenantId: job.data.tenantId,
            backupDate: new Date().toISOString()
          });
          // Add actual backup logic here
          break;
          
        case 'cleanup-old-data':
          // Clean up old/unused data
          logger.info(`Cleaning up old data for tenant: ${job.data.tenantId}`, { 
            tenantId: job.data.tenantId,
            cleanupCriteria: job.data.criteria
          });
          // Add actual cleanup logic here
          break;
          
        default:
          logger.warn(`Unknown backup operation: ${job.name}`, {
            backupType: job.name,
            data: job.data
          });
      }

      logger.info(`Backup operation completed: ${job.id}`, {
        jobId: job.id,
        backupType: job.name,
        success: true
      });

      return { success: true, backupType: job.name, data: job.data };
    } catch (error: any) {
      logger.error(`Error processing backup: ${error.message}`, {
        jobId: job.id,
        backupType: job.name,
        error: error.message,
        stack: error.stack,
        data: job.data
      });
      throw error;
    }
  },
  { 
    connection: redisConnection,
    concurrency: 1, // Process 1 backup at a time (critical operation)
    limiter: {
      max: 2, // Max 2 backup jobs per time window
      duration: 300000, // 300 second time window (5 minutes)
    }
  }
);

// Handle worker events
customerOperationsWorker.on('completed', (job) => {
  if (job) {
    logger.info(`Customer operation job completed`, {
      jobId: job.id,
      operation: job.name,
      tenantId: job.data?.tenantId
    });
  }
});

customerOperationsWorker.on('failed', (job, err) => {
  if (job) {
    logger.error(`Customer operation job failed`, {
      jobId: job.id,
      operation: job.name,
      error: err.message,
      tenantId: job.data?.tenantId
    });
  } else {
    logger.error(`Customer operation job failed`, {
      error: err.message
    });
  }
});

leadProcessingWorker.on('completed', (job) => {
  if (job) {
    logger.info(`Lead operation job completed`, {
      jobId: job.id,
      operation: job.name,
      tenantId: job.data?.tenantId
    });
  }
});

leadProcessingWorker.on('failed', (job, err) => {
  if (job) {
    logger.error(`Lead operation job failed`, {
      jobId: job.id,
      operation: job.name,
      error: err.message,
      tenantId: job.data?.tenantId
    });
  } else {
    logger.error(`Lead operation job failed`, {
      error: err.message
    });
  }
});

notificationWorker.on('completed', (job) => {
  if (job) {
    logger.info(`Notification job completed`, {
      jobId: job.id,
      notificationType: job.name,
      tenantId: job.data?.tenantId
    });
  }
});

notificationWorker.on('failed', (job, err) => {
  if (job) {
    logger.error(`Notification job failed`, {
      jobId: job.id,
      notificationType: job.name,
      error: err.message,
      tenantId: job.data?.tenantId
    });
  } else {
    logger.error(`Notification job failed`, {
      error: err.message
    });
  }
});

fileProcessingWorker.on('completed', (job) => {
  if (job) {
    logger.info(`File operation job completed`, {
      jobId: job.id,
      operation: job.name,
      tenantId: job.data?.tenantId
    });
  }
});

fileProcessingWorker.on('failed', (job, err) => {
  if (job) {
    logger.error(`File operation job failed`, {
      jobId: job.id,
      operation: job.name,
      error: err.message,
      tenantId: job.data?.tenantId
    });
  } else {
    logger.error(`File operation job failed`, {
      error: err.message
    });
  }
});

reportingWorker.on('completed', (job) => {
  if (job) {
    logger.info(`Report job completed`, {
      jobId: job.id,
      reportType: job.name,
      tenantId: job.data?.tenantId
    });
  }
});

reportingWorker.on('failed', (job, err) => {
  if (job) {
    logger.error(`Report job failed`, {
      jobId: job.id,
      reportType: job.name,
      error: err.message,
      tenantId: job.data?.tenantId
    });
  } else {
    logger.error(`Report job failed`, {
      error: err.message
    });
  }
});

backupWorker.on('completed', (job) => {
  if (job) {
    logger.info(`Backup job completed`, {
      jobId: job.id,
      backupType: job.name,
      tenantId: job.data?.tenantId
    });
  }
});

backupWorker.on('failed', (job, err) => {
  if (job) {
    logger.error(`Backup job failed`, {
      jobId: job.id,
      backupType: job.name,
      error: err.message,
      tenantId: job.data?.tenantId
    });
  } else {
    logger.error(`Backup job failed`, {
      error: err.message
    });
  }
});

logger.info('ABETWORKS WORKCRM Workers started and listening for jobs...', {
  timestamp: new Date().toISOString(),
  workers: [
    'customer-operations',
    'lead-operations', 
    'notifications',
    'file-processing',
    'reports',
    'backups'
  ]
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down workers...', {
    signal: 'SIGTERM',
    timestamp: new Date().toISOString()
  });
  
  await Promise.all([
    customerOperationsWorker.close(),
    leadProcessingWorker.close(),
    notificationWorker.close(),
    fileProcessingWorker.close(),
    reportingWorker.close(),
    backupWorker.close()
  ]);
  
  logger.info('All workers closed', {
    timestamp: new Date().toISOString()
  });
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down workers...', {
    signal: 'SIGINT',
    timestamp: new Date().toISOString()
  });
  
  await Promise.all([
    customerOperationsWorker.close(),
    leadProcessingWorker.close(),
    notificationWorker.close(),
    fileProcessingWorker.close(),
    reportingWorker.close(),
    backupWorker.close()
  ]);
  
  logger.info('All workers closed', {
    timestamp: new Date().toISOString()
  });
  process.exit(0);
});