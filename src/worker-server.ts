import { 
  emailWorker, 
  notificationWorker, 
  backupWorker, 
  workflowWorker, 
  reportWorker, 
  reminderWorker,
  shutdownWorkers 
} from './workers/worker-manager';

console.log('Starting ABETWORKS WORKCRM Background Workers...');

// Initialize all workers
const initializeWorkers = async () => {
  try {
    console.log('All background workers started successfully!');
    console.log('Listening for jobs on the following queues:');
    console.log('- Email processing');
    console.log('- Notifications');
    console.log('- Backup tasks');
    console.log('- Workflow execution');
    console.log('- Report generation');
    console.log('- Reminders');
  } catch (error) {
    console.error('Failed to initialize workers:', error);
    process.exit(1);
  }
};

initializeWorkers();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal');
  await shutdownWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT signal');
  await shutdownWorkers();
  process.exit(0);
});