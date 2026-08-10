import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { io as ioClient } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { SocketGateway } from '../src/websocket/SocketGateway.js';

describe('Backend Milestone 9 - Socket.IO Real-Time Gateway Tests', () => {
  let httpServer;
  let socketGateway;
  let port;
  let clientSocket;

  before(async () => {
    const { app, simEngine } = createApp();
    httpServer = http.createServer(app);
    socketGateway = new SocketGateway(httpServer, simEngine);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        port = httpServer.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.close();
    }
    if (socketGateway) {
      await socketGateway.close();
    }
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  it('should connect Socket.IO client and receive initial simulation:tick emission', async () => {
    clientSocket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      reconnection: true
    });

    const tickData = await new Promise((resolve) => {
      clientSocket.on('simulation:tick', (data) => {
        resolve(data);
      });
    });

    assert.ok(tickData);
    assert.equal(tickData.simulationId, 'sim_default');
    assert.equal(tickData.nodes.length, 18);
    assert.equal(tickData.edges.length, 23);
    assert.ok(tickData.simTime);
  });

  it('should broadcast risk:updated, prediction:updated, recommendation:new, and incident:created', async () => {
    const riskPromise = new Promise(resolve => clientSocket.on('risk:updated', resolve));
    const predPromise = new Promise(resolve => clientSocket.on('prediction:updated', resolve));
    const recPromise = new Promise(resolve => clientSocket.on('recommendation:new', resolve));
    const incPromise = new Promise(resolve => clientSocket.on('incident:created', resolve));

    socketGateway.broadcastRiskUpdate({ status: 'ok', highRiskCount: 1 });
    socketGateway.broadcastPredictionUpdate({ status: 'ok', count: 18 });
    socketGateway.broadcastRecommendation({ id: 'rec_101', title: 'Test Rec' });
    socketGateway.broadcastIncident({ type: 'route_closure', edge_id: 'E16' });

    const riskData = await riskPromise;
    const predData = await predPromise;
    const recData = await recPromise;
    const incData = await incPromise;

    assert.equal(riskData.highRiskCount, 1);
    assert.equal(predData.count, 18);
    assert.equal(recData.id, 'rec_101');
    assert.equal(incData.edge_id, 'E16');
  });

  it('should handle client request_state and reconnection cleanly', async () => {
    const statePromise = new Promise(resolve => {
      clientSocket.on('simulation:tick', resolve);
    });

    clientSocket.emit('simulation:request_state');
    const stateData = await statePromise;

    assert.equal(stateData.nodes.length, 18);

    // Disconnect and reconnect
    clientSocket.disconnect();
    assert.equal(clientSocket.connected, false);

    clientSocket.connect();
    await new Promise(resolve => {
      clientSocket.on('connect', resolve);
    });
    assert.equal(clientSocket.connected, true);
  });
});
