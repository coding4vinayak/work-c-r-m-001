require('dotenv').config();
const app = require('./dist/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`ABETWORKS WORKCRM server running on port ${PORT}`);
  console.log('Ready to handle requests...');
});