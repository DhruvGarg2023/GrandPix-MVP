import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataLoader } from '../src/loader/DataLoader.js';
import { InMemoryStorage } from '../src/storage/InMemoryStorage.js';
import { VenueGraph } from '../src/graph/VenueGraph.js';
import { AStarRouter } from '../src/graph/AStarRouter.js';
import { SimulationEngine } from '../src/engine/SimulationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, '../../data');

describe('Backend Milestone 4 - A* Routing & Dynamic Rerouting Tests', () => {
  it('should find shortest baseline route under normal unblocked conditions', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();
    const graph = VenueGraph.fromMasterInput(masterData);
    const router = new AStarRouter();

    // Route from GATE_A to GS_A (GATE_A -> FAN_ZONE -> GS_A)
    const pathA = router.findPath(graph, 'GATE_A', 'GS_A');
    assert.deepEqual(pathA, ['GATE_A', 'FAN_ZONE', 'GS_A']);

    // Direct route from GS_B to EXIT_E via edge E16
    const pathE16 = router.findPath(graph, 'GS_B', 'EXIT_E');
    assert.deepEqual(pathE16, ['GS_B', 'EXIT_E']);
  });

  it('should dynamically reroute around blocked edge E16', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();
    const graph = VenueGraph.fromMasterInput(masterData);
    const router = new AStarRouter();

    // Block edge E16 (GS_B -> EXIT_E)
    graph.blockEdge('E16');

    // Route from GS_B to EXIT_E should now detour via PIT_WALK (GS_B -> PIT_WALK -> EXIT_E)
    const detourPath = router.findPath(graph, 'GS_B', 'EXIT_E');
    assert.deepEqual(detourPath, ['GS_B', 'PIT_WALK', 'EXIT_E']);

    // Unblock edge E16 and verify original path is restored
    graph.unblockEdge('E16');
    const restoredPath = router.findPath(graph, 'GS_B', 'EXIT_E');
    assert.deepEqual(restoredPath, ['GS_B', 'EXIT_E']);
  });

  it('should compute congestion-aware edge costs correctly', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();
    const graph = VenueGraph.fromMasterInput(masterData);
    const router = new AStarRouter({ congestionWeight: 3.0 });

    const edge = graph.getEdge('E1'); // distance 450m
    const targetNode = graph.getNode('FAN_ZONE');

    // Baseline cost (density = 0) => cost = 450 * (1 + 3 * 0) = 450
    targetNode.setOccupancy(0);
    const baseCost = router.calculateEdgeCost(edge, targetNode);
    assert.equal(baseCost, 450);

    // Full capacity cost (density = 1.0) => cost = 450 * (1 + 3 * 1^2) = 1800
    targetNode.setOccupancy(targetNode.capacity);
    const congestedCost = router.calculateEdgeCost(edge, targetNode);
    assert.equal(congestedCost, 1800);
  });

  it('should handle unreachable destinations gracefully without crashing', () => {
    const loader = new DataLoader(dataPath);
    const masterData = loader.loadMasterInput();
    const graph = VenueGraph.fromMasterInput(masterData);
    const router = new AStarRouter();

    // Block all outgoing edges from GATE_A (E1)
    graph.blockEdge('E1');

    const unreachable = router.findPath(graph, 'GATE_A', 'GS_A');
    assert.deepEqual(unreachable, ['GATE_A']);
  });

  it('should integrate with SimulationEngine and dynamically reroute agents on edge closure', () => {
    const storage = new InMemoryStorage();
    const loader = new DataLoader(dataPath);
    loader.loadAndHydrate(storage);

    const simEngine = new SimulationEngine(storage, '16:20');
    simEngine.start();

    // Advance 5 ticks
    for (let i = 0; i < 5; i++) {
      simEngine.tick();
    }

    const graph = storage.getVenueGraphSync();

    // Block edge E16 mid-simulation
    graph.blockEdge('E16');

    // Run another tick to trigger dynamic agent rerouting
    simEngine.tick();

    // Find any agent with destination EXIT_E or crossing GS_B
    const agents = Array.from(storage.agentsMap.values());
    const reroutedAgents = agents.filter(a => a.destination === 'EXIT_E' && a.route.length > 0);

    for (const agent of reroutedAgents) {
      // None of the active routes should contain blocked edge E16 (GS_B -> EXIT_E consecutive pair)
      for (let i = 0; i < agent.route.length - 1; i++) {
        const from = agent.route[i];
        const to = agent.route[i + 1];
        const isE16Pair = (from === 'GS_B' && to === 'EXIT_E');
        assert.equal(isE16Pair, false, `Agent ${agent.id} route must not use blocked edge E16`);
      }
    }
  });
});
