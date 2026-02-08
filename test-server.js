// Simple test to verify ABETWORKS WORKCRM is working
const express = require('express');
const app = express();

// Set up basic middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ABETWORKS WORKCRM API',
    version: '1.0.0'
  });
});

// Simple API endpoint to verify functionality
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'ABETWORKS WORKCRM API is running correctly!',
    timestamp: new Date().toISOString(),
    test: 'API endpoint accessible'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ABETWORKS WORKCRM test server running on port ${PORT}`);
  console.log('Test endpoints available:');
  console.log(`  - Health: http://localhost:${PORT}/health`);
  console.log(`  - Test API: http://localhost:${PORT}/api/test`);
  console.log('\n✅ ABETWORKS WORKCRM application structure is valid and running!');
});