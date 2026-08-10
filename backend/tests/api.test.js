import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

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

async function dispatchRoute(app, method, url, reqBody = {}, queryParams = {}) {
  const req = {
    method,
    url,
    body: reqBody,
    query: queryParams,
    params: {}
  };
  const res = createMockRes();

  // Simple route matcher against Express router stack
  for (const layer of app._router.stack) {
    if (layer.route) {
      const routePath = layer.route.path;
      const routeMethod = Object.keys(layer.route.methods)[0].toUpperCase();

      if (routeMethod !== method) continue;

      // Extract parameter matchers
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

describe('Backend Milestone 8 - Complete REST API Gateway Tests', () => {
  it('POST /api/simulations/sim_default/start & GET state should start and return state', async () => {
    const { app } = createApp();

    const startRes = await dispatchRoute(app, 'POST', '/api/simulations/sim_default/start');
    assert.equal(startRes.statusCode, 200);
    assert.equal(startRes.body.status, 'ok');
    assert.equal(startRes.body.state.isRunning, true);

    const stateRes = await dispatchRoute(app, 'GET', '/api/simulations/sim_default/state');
    assert.equal(stateRes.statusCode, 200);
    assert.equal(stateRes.body.simulationId, 'sim_default');
    assert.equal(stateRes.body.nodes.length, 18);
  });

  it('GET /api/simulations/sim_default/predictions & risks should return analytics payload', async () => {
    const { app } = createApp();

    const predRes = await dispatchRoute(app, 'GET', '/api/simulations/sim_default/predictions');
    assert.equal(predRes.statusCode, 200);
    assert.equal(predRes.body.count, 18);

    const riskRes = await dispatchRoute(app, 'GET', '/api/simulations/sim_default/risks');
    assert.equal(riskRes.statusCode, 200);
    assert.equal(riskRes.body.nodes.length, 18);
  });

  it('POST /api/simulations/sim_default/incidents should handle valid and invalid incident requests', async () => {
    const { app } = createApp();

    // 1. Valid edge closure E16
    const validInc = await dispatchRoute(app, 'POST', '/api/simulations/sim_default/incidents', {
      type: 'route_closure',
      edge_id: 'E16'
    });
    assert.equal(validInc.statusCode, 201);
    assert.equal(validInc.body.incident.edge_id, 'E16');

    // 2. Invalid incident type => 400 Bad Request
    const invalidType = await dispatchRoute(app, 'POST', '/api/simulations/sim_default/incidents', {
      type: 'unknown_type'
    });
    assert.equal(invalidType.statusCode, 400);

    // 3. Non-existent edge ID => 404 Not Found
    const invalidEdge = await dispatchRoute(app, 'POST', '/api/simulations/sim_default/incidents', {
      type: 'route_closure',
      edge_id: 'NON_EXISTENT_EDGE'
    });
    assert.equal(invalidEdge.statusCode, 404);
  });

  it('GET /api/spectator/state & /api/spectator/routes should handle spectator navigation requests', async () => {
    const { app } = createApp();

    const specState = await dispatchRoute(app, 'GET', '/api/spectator/state');
    assert.equal(specState.statusCode, 200);
    assert.equal(specState.body.circuit, 'F1 Demo Circuit');

    // Valid route query
    const validRoute = await dispatchRoute(app, 'GET', '/api/spectator/routes', {}, { from: 'GATE_A', to: 'GS_A' });
    assert.equal(validRoute.statusCode, 200);
    assert.equal(validRoute.body.from, 'GATE_A');
    assert.equal(validRoute.body.to, 'GS_A');
    assert.deepEqual(validRoute.body.path, ['GATE_A', 'FAN_ZONE', 'GS_A']);
    assert.ok(validRoute.body.totalDistanceM > 0);

    // Missing required parameter 'to' => 400 Bad Request
    const missingParam = await dispatchRoute(app, 'GET', '/api/spectator/routes', {}, { from: 'GATE_A' });
    assert.equal(missingParam.statusCode, 400);
  });

  it('POST /api/ai/copilot should return operational recommendation', async () => {
    const { app } = createApp();

    const copilotRes = await dispatchRoute(app, 'POST', '/api/ai/copilot');
    assert.equal(copilotRes.statusCode, 200);
    assert.equal(copilotRes.body.status, 'ok');
    assert.ok(copilotRes.body.recommendation);
  });
});
