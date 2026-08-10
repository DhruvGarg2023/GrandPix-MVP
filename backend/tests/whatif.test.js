import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { WhatIfSandboxEngine } from '../src/whatif/WhatIfSandboxEngine.js';

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

async function dispatchRoute(app, method, url, reqBody = {}) {
  const req = { method, url, body: reqBody, query: {}, params: {} };
  const res = createMockRes();

  for (const layer of app._router.stack) {
    if (layer.route) {
      const routePath = layer.route.path;
      const routeMethod = Object.keys(layer.route.methods)[0].toUpperCase();

      if (routeMethod !== method) continue;

      const paramNames = [];
      const regexPattern = routePath.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });

      const regex = new RegExp(`^${regexPattern}$`);
      const match = url.split('?')[0].match(regex);

      if (match) {
        req.params = {};
        paramNames.forEach((name, idx) => {
          req.params[name] = match[idx + 1];
        });

        await layer.route.stack[0].handle(req, res);
        return res;
      }
    }
  }

  res.status(404).json({ error: 'Not Found' });
  return res;
}

describe('Backend Milestone 10 - Sandbox What-If Simulation Engine Tests', () => {
  it('should run What-If scenario in sandbox without mutating live simulation state', async () => {
    const { simEngine, storage } = createApp();
    const sandboxEngine = new WhatIfSandboxEngine(simEngine, storage);

    const liveTimeBefore = liveSimStateTime(simEngine);
    const liveE16BlockedBefore = storage.getVenueGraphSync().getEdge('E16').isBlocked;

    const result = await sandboxEngine.runScenario('EDGE_E16_CLOSURE', { nTicks: 6 });

    const liveE16BlockedAfter = storage.getVenueGraphSync().getEdge('E16').isBlocked;

    // 1. Verify differential metrics structure
    assert.equal(result.status, 'ok');
    assert.equal(result.scenarioType, 'EDGE_E16_CLOSURE');
    assert.equal(result.simulatedTicks, 6);
    assert.ok(result.baseline);
    assert.ok(result.sandbox);
    assert.ok(result.differential);

    // 2. Verify live production state was NOT mutated
    assert.equal(liveTimeBefore, liveSimStateTime(simEngine));
    assert.equal(liveE16BlockedBefore, false);
    assert.equal(liveE16BlockedAfter, false);
  });

  it('should support dynamic user-customized scenario parameters (blocked_edges, weather, node_surges)', async () => {
    const { app, simEngine, storage } = createApp();

    const customRes = await dispatchRoute(app, 'POST', '/api/simulations/sim_default/scenarios', {
      scenarioType: 'Custom Multi-Incident Test',
      blocked_edges: ['E16', 'E2'],
      weather: 'heavy_rain',
      node_surges: [{ node_id: 'GS_B', multiplier: 1.8 }],
      nTicks: 3
    });

    assert.equal(customRes.statusCode, 200);
    assert.equal(customRes.body.status, 'ok');
    assert.equal(customRes.body.scenarioType, 'Custom Multi-Incident Test');
    assert.deepEqual(customRes.body.appliedChanges.blockedEdges, ['E16', 'E2']);
    assert.equal(customRes.body.sandbox.weather, 'heavy_rain');

    // Ensure live state was completely untouched
    assert.equal(storage.getVenueGraphSync().getEdge('E16').isBlocked, false);
    assert.equal(storage.getVenueGraphSync().getEdge('E2').isBlocked, false);
  });
});

function liveSimStateTime(simEngine) {
  return simEngine.getState().simTime;
}
