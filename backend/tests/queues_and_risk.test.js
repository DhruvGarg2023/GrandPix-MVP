import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataLoader } from '../src/loader/DataLoader.js';
import { InMemoryStorage } from '../src/storage/InMemoryStorage.js';
import { VenueGraph } from '../src/graph/VenueGraph.js';
import { QueueEngine } from '../src/queue/QueueEngine.js';
import { RiskEngine, RiskSeverity } from '../src/risk/RiskEngine.js';
import { SimulationEngine } from '../src/engine/SimulationEngine.js';
import { Agent, AgentStatus } from '../src/models/Agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, '../../data');

describe('Backend Milestone 5 - Queue Engine & Deterministic Risk Engine Tests', () => {
  it('should initialize QueueEngine with correct metadata specs', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();
    const queueEngine = new QueueEngine(masterData.queue_service);

    assert.equal(queueEngine.isQueueFacility('FOOD_N'), true);
    assert.equal(queueEngine.isQueueFacility('MERCH'), true);
    assert.equal(queueEngine.isQueueFacility('GS_A'), false);

    assert.equal(queueEngine.getQueueCapacity('FOOD_N'), 1000);
    assert.equal(queueEngine.getQueueLength('FOOD_N'), 0);
    assert.equal(queueEngine.getWaitTimeMinutes('FOOD_N'), 0);
  });

  it('should calculate queue wait times and process tick discharge', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();
    const queueEngine = new QueueEngine(masterData.queue_service);

    const testAgent1 = new Agent({ id: 'Q1', persona: 'family', entryGate: 'GATE_A', initialDestination: 'FOOD_N', speedMps: 1.0, patience: 0.5, groupSize: 1 });
    const testAgent2 = new Agent({ id: 'Q2', persona: 'tourist', entryGate: 'GATE_A', initialDestination: 'FOOD_N', speedMps: 1.2, patience: 0.6, groupSize: 1 });

    queueEngine.enqueue('FOOD_N', testAgent1);
    queueEngine.enqueue('FOOD_N', testAgent2);

    assert.equal(queueEngine.getQueueLength('FOOD_N'), 2);
    assert.equal(testAgent1.status, AgentStatus.QUEUED);
    assert.equal(testAgent2.status, AgentStatus.QUEUED);

    // FOOD_N service rate = 150 per min => 2.5 per sec. In 10s tick = 25 capacity
    const serviced = queueEngine.processTick(10, null);

    assert.equal(serviced.length, 2);
    assert.equal(queueEngine.getQueueLength('FOOD_N'), 0);
    assert.equal(testAgent1.status, AgentStatus.ARRIVED);
    assert.equal(testAgent2.status, AgentStatus.ARRIVED);
  });

  it('should compute multi-factor risk scores and severity classifications deterministically', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();
    const graph = VenueGraph.fromMasterInput(masterData);
    const riskEngine = new RiskEngine();
    const queueEngine = new QueueEngine(masterData.queue_service);

    const gsB = graph.getNode('GS_B');
    gsB.setOccupancy(0);

    const weatherSunny = { condition: 'sunny', intensity: 0.1 };
    let risk = riskEngine.calculateNodeRisk(gsB, graph, queueEngine, weatherSunny);

    assert.ok(risk.riskScore < 0.25, `Baseline risk ${risk.riskScore} should be SAFE`);
    assert.equal(risk.severity, RiskSeverity.SAFE);

    // Increase occupancy to 90%
    gsB.setOccupancy(gsB.capacity * 0.9);
    risk = riskEngine.calculateNodeRisk(gsB, graph, queueEngine, weatherSunny);

    assert.ok(risk.riskScore >= 0.25, `90% occupancy risk ${risk.riskScore} should be MODERATE or higher`);
    assert.ok([RiskSeverity.MODERATE, RiskSeverity.HIGH, RiskSeverity.CRITICAL].includes(risk.severity));

    // Test Heavy Rain impact + Blocked Edge E16
    graph.blockEdge('E16');
    const weatherHeavyRain = { condition: 'heavy_rain', intensity: 0.9 };
    risk = riskEngine.calculateNodeRisk(gsB, graph, queueEngine, weatherHeavyRain);

    assert.ok(risk.riskScore >= 0.50, `Heavy rain + blocked edge risk ${risk.riskScore} should be HIGH or CRITICAL`);
    assert.ok([RiskSeverity.HIGH, RiskSeverity.CRITICAL].includes(risk.severity));
  });

  it('should integrate QueueEngine and RiskEngine into SimulationEngine state output', () => {
    const storage = new InMemoryStorage();
    const loader = new DataLoader(dataPath);
    loader.loadAndHydrate(storage);

    const simEngine = new SimulationEngine(storage, '16:20');
    simEngine.start();

    // Advance 10 ticks
    for (let i = 0; i < 10; i++) {
      simEngine.tick();
    }

    const state = simEngine.getState();
    assert.ok(state.nodes.length === 18);

    for (const node of state.nodes) {
      assert.ok(typeof node.riskScore === 'number');
      assert.ok(Object.values(RiskSeverity).includes(node.riskSeverity));
      assert.ok(typeof node.queueLength === 'number');
      assert.ok(typeof node.queueWaitTimeMin === 'number');
    }

    assert.ok(state.queues.FOOD_N, 'Queue summary for FOOD_N should exist');
  });
});
