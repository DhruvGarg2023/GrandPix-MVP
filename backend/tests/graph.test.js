import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataLoader } from '../src/loader/DataLoader.js';
import { InMemoryStorage } from '../src/storage/InMemoryStorage.js';
import { VenueGraph } from '../src/graph/VenueGraph.js';
import { Agent, AgentStatus } from '../src/models/Agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, '../../data');

describe('Backend Milestone 2 - Venue Graph & Crowd Agent Model Tests', () => {
  it('should construct VenueGraph with 18 nodes and 23 edges', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();
    const graph = VenueGraph.fromMasterInput(masterData);

    assert.equal(graph.getNodes().length, 18);
    assert.equal(graph.getEdges().length, 23);

    const gateA = graph.getNode('GATE_A');
    assert.ok(gateA, 'GATE_A node should exist');
    assert.equal(gateA.type, 'gate');
    assert.equal(gateA.capacity, 6000);

    const edgeE1 = graph.getEdge('E1');
    assert.ok(edgeE1, 'Edge E1 should exist');
    assert.equal(edgeE1.from, 'GATE_A');
    assert.equal(edgeE1.to, 'FAN_ZONE');
    assert.equal(edgeE1.distanceM, 450);
  });

  it('should support adjacency lookups and edge blocking', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();
    const graph = VenueGraph.fromMasterInput(masterData);

    const outgoing = graph.getOutgoingEdges('GATE_A');
    assert.equal(outgoing.length, 1);
    assert.equal(outgoing[0].id, 'E1');

    const edgeBetween = graph.getEdgeBetween('FAN_ZONE', 'GS_A');
    assert.ok(edgeBetween);
    assert.equal(edgeBetween.id, 'E5');

    // Test blocking edge
    assert.equal(edgeBetween.isBlocked, false);
    assert.equal(edgeBetween.isTraversable(), true);

    graph.blockEdge('E5');
    assert.equal(edgeBetween.isBlocked, true);
    assert.equal(edgeBetween.isTraversable(), false);

    graph.unblockEdge('E5');
    assert.equal(edgeBetween.isBlocked, false);
  });

  it('should compute node density correctly', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();
    const graph = VenueGraph.fromMasterInput(masterData);

    const node = graph.getNode('GS_A');
    assert.equal(node.capacity, 18000);
    assert.equal(node.densityRatio, 0);

    node.setOccupancy(9000);
    assert.equal(node.densityRatio, 0.5);

    node.setOccupancy(18000);
    assert.equal(node.densityRatio, 1.0);
  });

  it('should load 2,000 agents with valid properties into storage', async () => {
    const storage = new InMemoryStorage();
    const loader = new DataLoader(dataPath);

    loader.loadAndHydrate(storage);

    const agents = await storage.getAgents();
    assert.equal(agents.length, 2000);

    const validPersonas = new Set(['hardcore_fan', 'family', 'tourist', 'vip', 'photographer']);
    const graph = await storage.getVenueGraph();
    const nodeIds = new Set(graph.getNodes().map(n => n.id));

    for (const agent of agents) {
      assert.ok(agent instanceof Agent, 'Agent must be an instance of Agent class');
      assert.ok(validPersonas.has(agent.persona), `Persona ${agent.persona} must be valid`);
      assert.ok(nodeIds.has(agent.entryGate), `Entry gate ${agent.entryGate} must exist`);
      assert.ok(nodeIds.has(agent.destination), `Destination ${agent.destination} must exist`);
      assert.ok(agent.speedMps > 0, `Speed ${agent.speedMps} must be positive`);
      assert.ok(agent.patience > 0 && agent.patience <= 1.0, `Patience ${agent.patience} must be in range (0, 1]`);
      assert.ok(agent.groupSize >= 1, `Group size ${agent.groupSize} must be >= 1`);
      assert.ok(Object.values(AgentStatus).includes(agent.status), `Status ${agent.status} must be valid`);
    }
  });

  it('should track agent route progress correctly', () => {
    const agent = new Agent({
      id: 'TEST_A01',
      persona: 'tourist',
      entryGate: 'GATE_A',
      initialDestination: 'GS_A',
      speedMps: 1.2,
      patience: 0.7,
      groupSize: 2
    });

    assert.equal(agent.status, AgentStatus.WAITING);

    agent.setRoute(['GATE_A', 'FAN_ZONE', 'GS_A']);
    assert.equal(agent.status, AgentStatus.WALKING);
    assert.equal(agent.currentNode, 'GATE_A');
    assert.equal(agent.getNextNode(), 'FAN_ZONE');

    // Advance 1 step
    const hasNext1 = agent.advanceToNextNode();
    assert.equal(hasNext1, true);
    assert.equal(agent.currentNode, 'FAN_ZONE');
    assert.equal(agent.getNextNode(), 'GS_A');
    assert.equal(agent.status, AgentStatus.WALKING);

    // Advance 2nd step to destination
    const hasNext2 = agent.advanceToNextNode();
    assert.equal(hasNext2, true);
    assert.equal(agent.currentNode, 'GS_A');
    assert.equal(agent.getNextNode(), null);
    assert.equal(agent.status, AgentStatus.ARRIVED);
  });
});
