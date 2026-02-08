#!/usr/bin/env ts-node

import runMigrations from './src/migrations/data-preservaton-migration';

// Run the data preservation migrations
runMigrations()
  .then(() => {
    console.log('Data preservation migrations completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Data preservation migrations failed:', error);
    process.exit(1);
  });