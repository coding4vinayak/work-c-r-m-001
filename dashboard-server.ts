import express from 'express';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Serve static files from the root directory
app.use(express.static('.'));

// Serve the main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Serve other dashboard pages
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/customers.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../customers.html'));
});

app.get('/leads.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../leads.html'));
});

app.get('/projects.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../projects.html'));
});

app.get('/apps-tasks.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../apps-tasks.html'));
});

app.get('/analytics.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../analytics.html'));
});

app.get('/reports-*.html', (req, res) => {
  res.sendFile(path.join(__dirname, `../${req.path}`));
});

app.get('/settings-*.html', (req, res) => {
  res.sendFile(path.join(__dirname, `../${req.path}`));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Dashboard server running',
    timestamp: new Date().toISOString(),
    features: ['Static file serving', 'Dashboard UI', 'HTML templates']
  });
});

app.listen(PORT, () => {
  console.log(`ABETWORKS WORKCRM Dashboard server running on http://localhost:${PORT}`);
  console.log('Available pages:');
  console.log('- Main Dashboard: http://localhost:3000/');
  console.log('- Customers: http://localhost:3000/customers.html');
  console.log('- Leads: http://localhost:3000/leads.html');
  console.log('- Deals: http://localhost:3000/projects.html');
  console.log('- Tasks: http://localhost:3000/apps-tasks.html');
  console.log('- Analytics: http://localhost:3000/analytics.html');
  console.log('- Health Check: http://localhost:3000/health');
});

export default app;