import { Worker, Queue, Job } from 'bullmq';
import { pool } from '../config/database';
import { createTransporter } from '../utils/email';
import Redis from 'redis';

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
};

// Define different queue types for various background tasks
export const emailQueue = new Queue('email processing', { connection: redisConnection });
export const notificationQueue = new Queue('notifications', { connection: redisConnection });
export const backupQueue = new Queue('backup tasks', { connection: redisConnection });
export const workflowQueue = new Queue('workflow execution', { connection: redisConnection });
export const reportQueue = new Queue('report generation', { connection: redisConnection });
export const reminderQueue = new Queue('reminders', { connection: redisConnection });

// Email processing worker
export const emailWorker = new Worker('email processing', async (job: Job) => {
  const { to, subject, body, template, tenantId } = job.data;
  
  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html: body
    });
    
    // Log email activity
    await pool.query(
      `INSERT INTO tenant_data.activities (tenant_id, user_id, type, subject, description, date_time)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [tenantId, job.data.sentBy, 'email', subject, `Email sent to ${to}`]
    );
    
    console.log(`Email sent successfully to ${to}`);
    return { success: true, messageId: result.messageId, jobId: job.id };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error; // This will trigger retry mechanism
  }
}, { 
  connection: redisConnection,
  concurrency: 5 // Process up to 5 emails concurrently
});

// Notification processing worker
export const notificationWorker = new Worker('notifications', async (job: Job) => {
  const { userId, title, message, type, relatedEntity, tenantId } = job.data;
  
  try {
    // Create notification in database
    const result = await pool.query(
      `INSERT INTO tenant_data.notifications (tenant_id, user_id, title, message, type, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [tenantId, userId, title, message, type, relatedEntity?.type, relatedEntity?.id]
    );
    
    console.log(`Notification created for user ${userId}`);
    return { success: true, notificationId: result.rows[0].id, jobId: job.id };
  } catch (error) {
    console.error(`Failed to create notification for user ${userId}:`, error);
    throw error;
  }
}, { 
  connection: redisConnection,
  concurrency: 10
});

// Backup worker
export const backupWorker = new Worker('backup tasks', async (job: Job) => {
  const { backupType, retentionDays, tenantId } = job.data;
  
  try {
    console.log(`Starting ${backupType} backup for tenant ${tenantId}...`);
    
    // In a real implementation, this would connect to the database
    // and create a backup file
    // This is a simplified simulation
    const backupResult = {
      id: job.id,
      type: backupType,
      timestamp: new Date(),
      status: 'completed',
      size: '150MB', // Would be calculated in real implementation
      tenantId
    };
    
    // Log backup activity
    await pool.query(
      `INSERT INTO tenant_data.activities (tenant_id, user_id, type, subject, description, date_time)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [tenantId, null, 'system', 'Backup', `${backupType} backup completed`]
    );
    
    console.log(`${backupType} backup completed successfully for tenant ${tenantId}`);
    return backupResult;
  } catch (error) {
    console.error(`Backup failed for tenant ${tenantId}:`, error);
    throw error;
  }
}, { 
  connection: redisConnection,
  concurrency: 1 // Only run one backup at a time
});

// Workflow execution worker
export const workflowWorker = new Worker('workflow execution', async (job: Job) => {
  const { workflowId, triggerData, tenantId } = job.data;
  
  try {
    // Fetch workflow details
    const workflowResult = await pool.query(
      `SELECT * FROM tenant_data.workflows WHERE id = $1 AND tenant_id = $2`,
      [workflowId, tenantId]
    );
    
    if (workflowResult.rows.length === 0) {
      throw new Error(`Workflow ${workflowId} not found for tenant ${tenantId}`);
    }
    
    const workflow = workflowResult.rows[0];
    const actions = JSON.parse(workflow.actions);
    
    // Execute workflow actions
    const results = [];
    for (const action of actions) {
      let actionResult;
      
      switch (action.type) {
        case 'create_task':
          const taskResult = await pool.query(
            `INSERT INTO tenant_data.tasks (tenant_id, title, description, assigned_to, created_by, category_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [tenantId, action.title, action.description, action.assignedTo, triggerData.triggeredBy, action.categoryId]
          );
          actionResult = { type: 'task_created', id: taskResult.rows[0].id };
          break;
          
        case 'send_email':
          // Add email to email queue for processing
          await emailQueue.add('workflow email', {
            to: action.recipient,
            subject: action.subject,
            body: action.body,
            tenantId,
            sentBy: triggerData.triggeredBy
          });
          actionResult = { type: 'email_queued', recipient: action.recipient };
          break;
          
        case 'create_notification':
          await notificationQueue.add('workflow notification', {
            userId: action.userId,
            title: action.title,
            message: action.message,
            type: action.notificationType,
            tenantId,
            relatedEntity: action.relatedEntity
          });
          actionResult = { type: 'notification_queued', userId: action.userId };
          break;
          
        case 'update_field':
          // Update a field in the triggering entity
          const updateQuery = `UPDATE tenant_data.${action.entityType} 
                              SET ${action.fieldName} = $1 
                              WHERE id = $2 AND tenant_id = $3`;
          await pool.query(updateQuery, [action.newValue, triggerData.entityId, tenantId]);
          actionResult = { type: 'field_updated', field: action.fieldName, value: action.newValue };
          break;
          
        default:
          console.warn(`Unknown action type: ${action.type}`);
          actionResult = { type: 'unknown_action', action: action.type };
      }
      
      results.push(actionResult);
    }
    
    // Log workflow execution
    await pool.query(
      `INSERT INTO tenant_data.workflow_history (tenant_id, workflow_id, entity_type, entity_id, executed_by, execution_result, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tenantId, workflowId, triggerData.entityType, triggerData.entityId, triggerData.triggeredBy, JSON.stringify(results), 'success']
    );
    
    console.log(`Workflow ${workflowId} executed successfully for tenant ${tenantId}`);
    return { success: true, workflowId, results, jobId: job.id };
  } catch (error) {
    console.error(`Workflow execution failed for workflow ${workflowId}:`, error);
    throw error;
  }
}, { 
  connection: redisConnection,
  concurrency: 3
});

// Report generation worker
export const reportWorker = new Worker('report generation', async (job: Job) => {
  const { reportType, filters, tenantId, userId } = job.data;
  
  try {
    let reportData;
    
    switch (reportType) {
      case 'sales':
        // Generate sales report
        const salesResult = await pool.query(
          `SELECT 
            COUNT(i.id) as total_invoices,
            SUM(i.total_amount) as total_revenue,
            SUM(i.amount_due) as outstanding_amount,
            COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices,
            COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_invoices
           FROM tenant_data.invoices i
           WHERE i.tenant_id = $1
             AND i.issue_date >= $2 AND i.issue_date <= $3`,
          [tenantId, filters.startDate, filters.endDate]
        );
        reportData = salesResult.rows[0];
        break;
        
      case 'leads':
        // Generate leads report
        const leadsResult = await pool.query(
          `SELECT 
            COUNT(l.id) as total_leads,
            COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) as qualified_leads,
            COUNT(CASE WHEN l.status = 'closed_won' THEN 1 END) as won_leads,
            COUNT(CASE WHEN l.status = 'closed_lost' THEN 1 END) as lost_leads
           FROM tenant_data.leads l
           WHERE l.tenant_id = $1
             AND l.created_at >= $2 AND l.created_at <= $3`,
          [tenantId, filters.startDate, filters.endDate]
        );
        reportData = leadsResult.rows[0];
        break;
        
      case 'deals':
        // Generate deals report
        const dealsResult = await pool.query(
          `SELECT 
            COUNT(d.id) as total_deals,
            SUM(CASE WHEN ds.name = 'Closed Won' THEN d.value ELSE 0 END) as won_value,
            SUM(CASE WHEN ds.name = 'Closed Lost' THEN d.value ELSE 0 END) as lost_value,
            AVG(d.value) as average_deal_value
           FROM tenant_data.deals d
           LEFT JOIN tenant_data.deal_stages ds ON d.stage_id = ds.id
           WHERE d.tenant_id = $1
             AND d.created_at >= $2 AND d.created_at <= $3`,
          [tenantId, filters.startDate, filters.endDate]
        );
        reportData = dealsResult.rows[0];
        break;
        
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
    
    // Store report result
    const reportResult = await pool.query(
      `INSERT INTO tenant_data.reports (tenant_id, report_type, filters, data, generated_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [tenantId, reportType, JSON.stringify(filters), JSON.stringify(reportData), userId]
    );
    
    console.log(`Report ${reportType} generated successfully for tenant ${tenantId}`);
    return { 
      success: true, 
      reportId: reportResult.rows[0].id,
      data: reportData,
      jobId: job.id
    };
  } catch (error) {
    console.error(`Report generation failed:`, error);
    throw error;
  }
}, { 
  connection: redisConnection,
  concurrency: 2
});

// Reminder worker - handles follow-ups, appointment reminders, etc.
export const reminderWorker = new Worker('reminders', async (job: Job) => {
  const { reminderType, recipientId, message, tenantId, relatedEntity } = job.data;
  
  try {
    console.log(`Processing ${reminderType} reminder for user ${recipientId}`);
    
    // Create notification for the reminder
    await notificationQueue.add('reminder notification', {
      userId: recipientId,
      title: `${reminderType.charAt(0).toUpperCase() + reminderType.slice(1)} Reminder`,
      message,
      type: 'reminder',
      tenantId,
      relatedEntity
    });
    
    // Log reminder activity
    await pool.query(
      `INSERT INTO tenant_data.activities (tenant_id, user_id, type, subject, description, date_time)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [tenantId, recipientId, 'reminder', `${reminderType} reminder`, message]
    );
    
    console.log(`${reminderType} reminder processed for user ${recipientId}`);
    return { success: true, reminderType, recipientId, jobId: job.id };
  } catch (error) {
    console.error(`Reminder processing failed for ${reminderType}:`, error);
    throw error;
  }
}, { 
  connection: redisConnection,
  concurrency: 5
});

// Function to schedule a reminder
export const scheduleReminder = async (reminderData: any) => {
  // Calculate delay based on reminder time
  const now = new Date();
  const reminderTime = new Date(reminderData.time);
  const delay = reminderTime.getTime() - now.getTime();
  
  // Add job to queue with delay
  const job = await reminderQueue.add('scheduled reminder', reminderData, {
    delay: Math.max(delay, 0), // Ensure delay is not negative
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
  
  return job;
};

// Function to trigger a workflow
export const triggerWorkflow = async (workflowId: string, triggerData: any, tenantId: string) => {
  const job = await workflowQueue.add('workflow trigger', {
    workflowId,
    triggerData,
    tenantId
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  });
  
  return job;
};

// Graceful shutdown for all workers
export const shutdownWorkers = async () => {
  console.log('Shutting down background workers...');
  
  await Promise.all([
    emailWorker.close(),
    notificationWorker.close(),
    backupWorker.close(),
    workflowWorker.close(),
    reportWorker.close(),
    reminderWorker.close()
  ]);
  
  console.log('All background workers shut down successfully');
};

// Process any unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdownWorkers();
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully');
  await shutdownWorkers();
  process.exit(0);
});

console.log('Background workers initialized and ready to process jobs');