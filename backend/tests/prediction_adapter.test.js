import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PythonPredictionAdapter } from '../src/prediction/PythonPredictionAdapter.js';

describe('Backend Milestone 6 - Python Prediction Adapter Tests', () => {
  it('should generate valid deterministic fallback predictions when Python service is offline', async () => {
    // Port 9999 ensures connection fail / fallback trigger
    const adapter = new PythonPredictionAdapter('http://localhost:9999');

    const nodeItems = [
      { zone: 'GS_A', current_density_ratio: 0.82, flow_rate_ratio: 0.9, queue_length: 100, blocked_route: 0 },
      { zone: 'FAN_ZONE', current_density_ratio: 0.45, flow_rate_ratio: 0.3, queue_length: 0, blocked_route: 0 }
    ];

    const predictionsMap = await adapter.predictBatch(nodeItems);
    assert.equal(predictionsMap.size, 2);

    const gsAPred = predictionsMap.get('GS_A');
    assert.ok(gsAPred);
    assert.equal(gsAPred.isFallback, true);
    assert.ok(gsAPred.predictedDensity10minRatio >= 0.82);
    assert.equal(gsAPred.zone, 'GS_A');
  });

  it('should format node feature items correctly', async () => {
    const adapter = new PythonPredictionAdapter('http://localhost:9999');
    const emptyMap = await adapter.predictBatch([]);
    assert.equal(emptyMap.size, 0);
  });
});
