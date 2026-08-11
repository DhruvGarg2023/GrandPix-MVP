import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataLoader } from '../src/loader/DataLoader.js';
import { InMemoryStorage } from '../src/storage/InMemoryStorage.js';
import { SimulationEngine } from '../src/engine/SimulationEngine.js';
import { IncidentController } from '../src/controllers/incidentController.js';
import { RiskEngine } from '../src/risk/RiskEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, '../../data');

describe('Backend Milestone - Node Disabling & Crowd Dispersion Tests', () => {
  it('should mark node as disabled and get correct nearest active neighbor', () => {
    const storage = new InMemoryStorage();
    const loader = new DataLoader(dataPath);
    loader.loadAndHydrate(storage);

    const graph = storage.getVenueGraphSync();
    const testNode = graph.getNode('FOOD_N');
    assert.ok(testNode);
    
    // Initial state
    assert.equal(testNode.isDisabled, false);
    
    // Disable it
    testNode.disable();
    assert.equal(testNode.isDisabled, true);

    // Nearest active neighbor for FOOD_N
    // Neighbors of FOOD_N in SilverStone: FAN_ZONE, GS_A, EXIT_N.
    // Let's find nearest active neighbor
    const nearest = graph.getNearestActiveNeighbor('FOOD_N');
    assert.ok(nearest);
    assert.ok(['FAN_ZONE', 'GS_A', 'EXIT_N'].includes(nearest));

    // If nearest neighbor is also disabled, it should select another neighbor
    const nearestNode = graph.getNode(nearest);
    nearestNode.disable();
    
    const newNearest = graph.getNearestActiveNeighbor('FOOD_N');
    assert.ok(newNearest);
    assert.notEqual(newNearest, nearest);

    // Clean up
    testNode.enable();
    nearestNode.enable();
    assert.equal(testNode.isDisabled, false);
  });

  it('should route around disabled nodes in AStarRouter', () => {
    const storage = new InMemoryStorage();
    const loader = new DataLoader(dataPath);
    loader.loadAndHydrate(storage);

    const graph = storage.getVenueGraphSync();
    const simEngine = new SimulationEngine(storage);

    // Route from GATE_A to GS_A
    const pathNormal = simEngine.router.findPath(graph, 'GATE_A', 'GS_A');
    assert.ok(pathNormal.includes('FAN_ZONE'));

    // Disable FAN_ZONE, which sits between GATE_A and GS_A
    const fanZone = graph.getNode('FAN_ZONE');
    fanZone.disable();

    const pathDetour = simEngine.router.findPath(graph, 'GATE_A', 'GS_A');
    // Path should detour and NOT contain FAN_ZONE (which is disabled)
    assert.ok(!pathDetour.slice(1).includes('FAN_ZONE'), 'Path must detour around disabled node');

    // Re-enable FAN_ZONE
    fanZone.enable();
  });

  it('should disperse crowd from disabled node to nearest active node in IncidentController', async () => {
    const storage = new InMemoryStorage();
    const loader = new DataLoader(dataPath);
    loader.loadAndHydrate(storage);

    const simEngine = new SimulationEngine(storage);
    const incidentController = new IncidentController(simEngine, storage);

    const graph = storage.getVenueGraphSync();
    const foodN = graph.getNode('FOOD_N');
    const nearestId = graph.getNearestActiveNeighbor('FOOD_N');
    const nearestNode = graph.getNode(nearestId);

    // Seed some occupancies
    foodN.setOccupancy(100);
    nearestNode.setOccupancy(200);

    // Set agents current node to FOOD_N to test agent movement
    const agents = Array.from(storage.agentsMap.values());
    let seededAgentCount = 0;
    for (let i = 0; i < 50; i++) {
      if (agents[i]) {
        agents[i].currentNode = 'FOOD_N';
        seededAgentCount++;
      }
    }
    
    // Set node occupancy to match agent count
    foodN.setOccupancy(seededAgentCount);

    const req = {
      body: {
        type: 'node_disable',
        node_id: 'FOOD_N',
        isDisabled: true
      }
    };
    
    let broadcastIncidentCalled = false;
    let broadcastTickCalled = false;

    const mockGateway = {
      broadcastIncident() { broadcastIncidentCalled = true; },
      broadcastTick() { broadcastTickCalled = true; }
    };
    incidentController.socketGateway = mockGateway;

    // Trigger incident
    const res = {
      status(code) {
        assert.equal(code, 201);
        return this;
      },
      json(data) {
        assert.equal(data.status, 'ok');
        assert.equal(data.incident.isDisabled, true);
        assert.equal(data.incident.dispersedCount, seededAgentCount);
      }
    };

    await incidentController.triggerIncident(req, res);

    assert.equal(foodN.isDisabled, true);
    assert.equal(foodN.currentOccupancy, 0);
    assert.equal(nearestNode.currentOccupancy, 200 + seededAgentCount);

    // Verify agents got moved
    let remainingOnFoodN = 0;
    for (const agent of agents) {
      if (agent.currentNode === 'FOOD_N') {
        remainingOnFoodN++;
      }
    }
    assert.equal(remainingOnFoodN, 0);

    assert.ok(broadcastIncidentCalled);
    assert.ok(broadcastTickCalled);
  });

  it('should import custom dataset and update simulation engine state', async () => {
    const storage = new InMemoryStorage();
    const loader = new DataLoader(dataPath);
    loader.loadAndHydrate(storage);

    const simEngine = new SimulationEngine(storage);

    const graphJson = {
      version: "2.0",
      scenario: {
        circuit: "Custom Test Oval",
        attendance: 500
      },
      nodes: [
        { id: "START", type: "gate", capacity: 1000 },
        { id: "END", type: "exit", capacity: 1000 }
      ],
      edges: [
        { id: "TEST_E1", from: "START", to: "END", distance_m: 100, capacity_per_min: 60 }
      ],
      initial_occupancy: {
        "START": 10
      }
    };

    const agentsCsv = "agent_id,persona,entry_gate,initial_destination,speed_mps,patience,group_size\n" +
                     "A1,family,START,END,1.5,500,2\n" +
                     "A2,family,START,END,1.5,500,1\n";

    const scheduleCsv = "time,event,demand_multiplier\n" +
                       "16:20,RACE,2.0\n" +
                       "17:00,EXIT_RUSH,1.5\n";

    const stats = simEngine.loadCustomDataset(graphJson, agentsCsv, scheduleCsv);

    assert.equal(stats.nodesCount, 2);
    assert.equal(stats.edgesCount, 1);
    assert.equal(stats.agentsCount, 2);
    assert.equal(stats.scenario.circuit, "Custom Test Oval");

    const state = simEngine.getState();
    assert.equal(state.nodes.length, 2);
    assert.equal(state.edges.length, 1);
    assert.equal(state.agentCount, 2);
    assert.equal(state.activeEvent, "RACE");
  });

  it('should raise risk score on active nodes if all exits are closed', async () => {
    const storage = new InMemoryStorage();
    const loader = new DataLoader(dataPath);
    loader.loadAndHydrate(storage);

    const graph = storage.getVenueGraphSync();
    
    // Disable all exit nodes
    const exits = graph.getNodes().filter(n => n.type === 'exit');
    for (const exit of exits) {
      exit.disable();
    }

    const riskEngine = new RiskEngine();
    const risks = riskEngine.calculateAllRisks(graph, null, null);

    // Verify all active nodes have elevated risk, and exits themselves are SAFE (0)
    for (const node of graph.getNodes()) {
      const risk = risks.get(node.id);
      if (node.type === 'exit') {
        assert.equal(risk.riskScore, 0);
        assert.equal(risk.severity, 'SAFE');
      } else {
        // Active node risk should include the evacuationBlocked factor
        assert.ok(risk.riskScore >= 0.35);
        assert.equal(risk.breakdown.evacuationBlocked, 0.35);
      }
    }
  });
});
