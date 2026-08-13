import http from 'http';
import { createApp } from './src/app.js';
import { config } from './src/config/env.js';
import { SocketGateway } from './src/websocket/SocketGateway.js';

const { app, simEngine, predictionAdapter } = createApp();

const httpServer = http.createServer(app);
const socketGateway = new SocketGateway(httpServer, simEngine, predictionAdapter);

// Bind socketGateway to app for route controllers if needed
app.set('socketGateway', socketGateway);

const server = httpServer.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`  F1 Crowd Intelligence Platform - Main Backend`);
  console.log(`  Server running on port: ${config.port}`);
  console.log(`  Health Check: http://localhost:${config.port}/health`);
  console.log(`  Socket.IO Gateway: Ready on port ${config.port}`);
  console.log(`====================================================`);
});

export { app, httpServer, server, socketGateway };
