import { createApp } from './src/app.js';
import { config } from './src/config/env.js';

const { app } = createApp();

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`  F1 Crowd Intelligence Platform - Main Backend`);
  console.log(`  Server running on port: ${config.port}`);
  console.log(`  Health Check: http://localhost:${config.port}/health`);
  console.log(`====================================================`);
});

export { app, server };
