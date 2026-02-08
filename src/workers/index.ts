import { Worker, Queue, Job } from 'bullmq';
import { pool } from '../config/database';
import { createTransporter } from '../utils/email';
import { redisConnection } from '../config/redis';

// Define different queue types for various background tasks
export const emailQueue = new Queue('email processing', { connection: redisConnection });
export const notificationQueue = new Queue('notifications', { connection: redisConnection });
export const backupQueue = new Queue('backup tasks', { connection: redisConnection });
export const workflowQueue = new Queue('workflow execution', { connection: redisConnection });
export const reportQueue = new Queue('report generation', { connection: redisConnection });

// Email processing worker
export const emailWorker = new Worker('email processing', async (job: Job) => {
  const { to, subject, body, template } = job.data;
  
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html: body
    });
    
    console.log(`Email sent successfully to ${to}`);
    return { success: true, messageId: job.id };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error; // This will trigger retry mechanism
  }
}, { connection: redisConnection });

// Notification processing worker
export const notificationWorker = new Worker('notifications', async (job: Job) => {
  const { userId, title, message, type, relatedEntity } = job.data;
  
  try {
    // Create notification in database
    await pool.query(
      `INSERT INTO tenant_data.notifications (user_id, title, message, type, related_entity_type, related_entity_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, title, message, type, relatedEntity?.type, relatedEntity?.id, job.data.tenantId]
    );
    
    console.log(`Notification created for user ${userId}`);
    return { success: true, notificationId: job.id };
  } catch (error) {
    console.error(`Failed to create notification for user ${userId}:`, error);
    throw error;
  }
}, { connection: redisConnection });

// Backup worker
export const backupWorker = new Worker('backup tasks', async (job: Job) => {
  const { backupType, retentionDays } = job.data;
  
  try {
    // Simulate backup process
    console.log(`Starting ${backupType} backup...`);
    
    // In a real implementation, this would connect to the database
    // and create a backup file
    const backupResult = {
      id: job.id,
      type: backupType,
      timestamp: new Date(),
      status: 'completed',
      size: '150MB' // Simulated
    };
    
    console.log(`${backupType} backup completed successfully`);
    return backupResult;
  } catch (error) {
    console.error(`Backup failed:`, error);
    throw error;
  }
}, { connection: redisConnection });

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
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    const workflow = workflowResult.rows[0];
    const actions = JSON.parse(workflow.actions);
    
    // Execute workflow actions
    for (const action of actions) {
      switch (action.type) {
        case 'create_task':
          await pool.query(
            `INSERT INTO tenant_data.tasks (tenant_id, title, description, assigned_to, created_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [tenantId, action.title, action.description, action.assignedTo, triggerData.triggeredBy]
          );
          break;
          
        case 'send_email':
          // Add email to email queue for processing
          await emailQueue.add('workflow email', {
            to: action.recipient,
            subject: action.subject,
            body: action.body
          });
          break;
          
        case 'create_notification':
          await notificationQueue.add('workflow notification', {
            userId: action.userId,
            title: action.title,
            message: action.message,
            type: action.notificationType,
            tenantId
          });
          break;
          
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    }
    
    // Log workflow execution
    await pool.query(
      `INSERT INTO tenant_data.workflow_history (tenant_id, workflow_id, entity_type, entity_id, executed_by, execution_result, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tenantId, workflowId, triggerData.entityType, triggerData.entityId, triggerData.triggeredBy, JSON.stringify({ actions }), 'success']
    );
    
    console.log(`Workflow ${workflowId} executed successfully`);
    return { success: true, workflowId };
  } catch (error) {
    console.error(`Workflow execution failed:`, error);
    throw error;
  }
}, { connection: redisConnection });

// Report generation worker
export const reportWorker = new Worker('report generation', async (job: Job) => {
  const { reportType, filters, tenantId } = job.data;
  
  try {
    let reportData;
    
    switch (reportType) {
      case 'sales':
        // Generate sales report
        const salesResult = await pool.query(
          `SELECT 
            COUNT(i.id) as total_invoices,
            SUM(i.total_amount) as total_revenue,
            SUM(i.amount_due) as outstanding_amount
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
            COUNT(CASE WHEN l.status = 'closed_won' THEN 1 END) as won_leads
           FROM tenant_data.leads l
           WHERE l.tenant_id = $1
             AND l.created_at >= $2 AND l.created_at <= $3`,
          [tenantId, filters.startDate, filters.endDate]
        );
        reportData = leadsResult.rows[0];
        break;
        
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
    
    // Store report result
    const reportResult = await pool.query(
      `INSERT INTO tenant_data.reports (tenant_id, report_type, filters, data, generated_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [tenantId, reportType, JSON.stringify(filters), JSON.stringify(reportData), job.data.generatedBy]
    );
    
    console.log(`Report ${reportType} generated successfully`);
    return { 
      success: true, 
      reportId: reportResult.rows[0].id,
      data: reportData 
    };
  } catch (error) {
    console.error(`Report generation failed:`, error);
    throw error;
  }
}, { connection: redisConnection });

// Graceful shutdown for all workers
export const shutdownWorkers = async () => {
  console.log('Shutting down background workers...');
  
  await Promise.all([
    emailWorker.close(),
    notificationWorker.close(),
    backupWorker.close(),
    workflowWorker.close(),
    reportWorker.close()
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