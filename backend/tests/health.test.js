import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

describe('Backend Milestone 1 - Health Endpoint Integration Test', () => {
  it('GET /health should return 200 OK and valid dataset statistics', async () => {
    const { app } = createApp();

    // Mock request handler for /health
    const req = {};
    let responseStatus = 200;
    let responseData = null;

    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    // Obtain the route handler directly
    const healthLayer = app._router.stack.find(s => s.route && s.route.path === '/health');
    assert.ok(healthLayer, 'Health endpoint route layer should exist');

    await healthLayer.route.stack[0].handle(req, res);

    assert.equal(responseStatus, 200);
    assert.equal(responseData.status, 'ok');
    assert.equal(responseData.datasetLoaded, true);
    assert.equal(responseData.nodesCount, 18);
    assert.equal(responseData.edgesCount, 23);
    assert.equal(responseData.agentsCount, 2000);
    assert.equal(responseData.scenario.circuit, 'F1 Demo Circuit');
  });
});
