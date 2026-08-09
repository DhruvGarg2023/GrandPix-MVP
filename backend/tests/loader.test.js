import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataLoader } from '../src/loader/DataLoader.js';
import { InMemoryStorage } from '../src/storage/InMemoryStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, '../../data');

describe('Backend Milestone 1 - Dataset Loader & Storage Tests', () => {
  it('should load master input JSON without throwing errors', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();
    assert.ok(masterData, 'Master input should not be null');
    assert.equal(masterData.scenario.circuit, 'F1 Demo Circuit');
    assert.equal(masterData.nodes.length, 18);
    assert.equal(masterData.edges.length, 23);
  });

  it('should load crowd agents CSV cleanly', () => {
    const loader = new DataLoader(dataPath);
    const agents = loader.loadCrowdAgentsCSV();
    assert.equal(agents.length, 2000);
    assert.equal(agents[0].id, 'A00001');
    assert.ok(agents[0].speedMps > 0);
  });

  it('should validate dataset integrity and hydrate storage correctly', async () => {
    const storage = new InMemoryStorage();
    const loader = new DataLoader(dataPath);

    const stats = loader.loadAndHydrate(storage);
    assert.equal(stats.nodesCount, 18);
    assert.equal(stats.edgesCount, 23);
    assert.equal(stats.agentsCount, 2000);

    const nodes = await storage.getNodes();
    const edges = await storage.getEdges();
    const agents = await storage.getAgents();

    assert.equal(nodes.length, 18);
    assert.equal(edges.length, 23);
    assert.equal(agents.length, 2000);

    const nodeIds = new Set(nodes.map(n => n.id));

    // Verify edge references
    for (const edge of edges) {
      assert.ok(nodeIds.has(edge.from), `Edge ${edge.id} from node ${edge.from} must exist in nodes`);
      assert.ok(nodeIds.has(edge.to), `Edge ${edge.id} to node ${edge.to} must exist in nodes`);
    }

    // Verify agent gate and destination references
    for (const agent of agents) {
      assert.ok(nodeIds.has(agent.entryGate), `Agent ${agent.id} entry gate ${agent.entryGate} must exist`);
      assert.ok(nodeIds.has(agent.initialDestination), `Agent ${agent.id} destination ${agent.initialDestination} must exist`);
    }
  });

  it('should catch invalid node references during validation', () => {
    const loader = new DataLoader(dataPath);
    const invalidMaster = {
      nodes: [{ id: 'NODE_A', capacity: 100 }],
      edges: [{ id: 'E1', from: 'NODE_A', to: 'NON_EXISTENT', distance_m: 100, capacity_per_min: 50 }]
    };
    const validAgents = [];

    assert.throws(() => {
      loader.validateDataset(invalidMaster, validAgents);
    }, /references invalid 'to' node ID/);
  });
});
