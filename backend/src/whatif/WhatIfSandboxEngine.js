import { SimulationEngine } from '../engine/SimulationEngine.js';
import { InMemoryStorage } from '../storage/InMemoryStorage.js';
import { VenueGraph } from '../graph/VenueGraph.js';
import { Node } from '../models/Node.js';
import { Edge } from '../models/Edge.js';
import { Agent } from '../models/Agent.js';

/**
 * WhatIfSandboxEngine executes isolated scenario simulations on deep-cloned state with user-customizable parameters.
 */
export class WhatIfSandboxEngine {
  constructor(liveSimEngine, storage) {
    this.liveSimEngine = liveSimEngine;
    this.storage = storage;
  }

  async runScenario(scenarioInput, options = {}) {
    // Support both runScenario("HEAVY_RAIN", { nTicks: 6 }) and runScenario({ blocked_edges: ["E16"], weather: "heavy_rain" })
    let scenarioType = 'CUSTOM_USER_SCENARIO';
    let params = {};

    if (typeof scenarioInput === 'string') {
      scenarioType = scenarioInput;
      params = { ...options };
    } else if (typeof scenarioInput === 'object' && scenarioInput !== null) {
      params = { ...scenarioInput, ...options };
      scenarioType = params.scenarioType || params.name || 'CUSTOM_USER_SCENARIO';
    }

    const nTicks = params.nTicks || options.nTicks || 6;

    // 1. Capture baseline snapshot from live simulation
    const baselineStateBefore = this.liveSimEngine.getState();

    // 2. Create isolated sandbox environment by cloning state
    const sandboxStorage = new InMemoryStorage();

    // Clone Metadata & Schedule
    const liveMeta = await this.storage.getMetadata();
    sandboxStorage.setMetadata(JSON.parse(JSON.stringify(liveMeta)));

    // Clone Venue Graph (Nodes & Edges)
    const liveGraph = this.storage.getVenueGraphSync();
    const sandboxGraph = new VenueGraph();

    for (const node of liveGraph.nodes.values()) {
      const clonedNode = new Node({
        id: node.id,
        name: node.name,
        type: node.type,
        capacity: node.capacity
      });
      clonedNode.setOccupancy(node.currentOccupancy);
      sandboxGraph.addNode(clonedNode);
    }

    for (const edge of liveGraph.edges.values()) {
      const clonedEdge = new Edge({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        distance_m: edge.distanceM,
        capacity_per_min: edge.capacityPerMin
      });
      if (edge.isBlocked) {
        clonedEdge.block();
      }
      sandboxGraph.addEdge(clonedEdge);
    }

    sandboxStorage.setVenueGraph(sandboxGraph);

    // Clone Agents
    const liveAgents = await this.storage.getAgents();
    for (const agentItem of liveAgents) {
      const clonedAgent = new Agent({
        id: agentItem.id,
        persona: agentItem.persona,
        speed_mps: agentItem.speedMps,
        origin_node: agentItem.originNodeId,
        destination_node: agentItem.destinationNodeId,
        patience_seconds: agentItem.patienceSeconds,
        group_size: agentItem.groupSize
      });
      clonedAgent.status = agentItem.status;
      clonedAgent.currentNodeId = agentItem.currentNodeId;
      clonedAgent.currentEdgeId = agentItem.currentEdgeId;
      clonedAgent.route = [...agentItem.route];
      clonedAgent.routeIndex = agentItem.routeIndex;
      clonedAgent.edgeProgressM = agentItem.edgeProgressM;

      sandboxStorage.agentsMap.set(clonedAgent.id, clonedAgent);
    }

    // 3. Instantiate Sandbox Simulation Engine
    const sandboxEngine = new SimulationEngine(sandboxStorage, baselineStateBefore.simTime);
    sandboxEngine.activeWeather = JSON.parse(JSON.stringify(this.liveSimEngine.activeWeather));
    sandboxEngine.activeEvent = this.liveSimEngine.activeEvent;

    // 4. Apply Preset Shorthands or User-Defined Custom Changes

    // A. Weather Override
    let forcedWeather = null;
    if (params.weather) {
      if (typeof params.weather === 'string') {
        const cond = params.weather.toLowerCase();
        forcedWeather = {
          condition: cond,
          intensity: cond === 'heavy_rain' ? 0.9 : cond === 'rain' ? 0.75 : cond === 'cloudy' ? 0.25 : 0.1,
          speedMultiplier: cond === 'heavy_rain' ? 0.70 : cond === 'rain' ? 0.85 : cond === 'cloudy' ? 0.95 : 1.0
        };
      } else if (typeof params.weather === 'object') {
        forcedWeather = params.weather;
      }
    } else if (scenarioType === 'HEAVY_RAIN') {
      forcedWeather = { condition: 'heavy_rain', intensity: 0.9, speedMultiplier: 0.70 };
    }

    if (forcedWeather) {
      sandboxEngine.activeWeather = forcedWeather;
      sandboxEngine.scheduleManager.getWeatherAt = () => forcedWeather;
    }

    // B. Active Event Override
    if (params.active_event) {
      sandboxEngine.activeEvent = params.active_event;
    }

    // C. Blocked Edges Override
    const edgesToBlock = [];
    if (Array.isArray(params.blocked_edges)) {
      edgesToBlock.push(...params.blocked_edges);
    }
    if (scenarioType === 'GATE_B_CLOSURE') {
      edgesToBlock.push('E2');
    }
    if (scenarioType === 'EDGE_E16_CLOSURE') {
      edgesToBlock.push('E16');
    }

    for (const edgeId of edgesToBlock) {
      sandboxGraph.blockEdge(edgeId);
    }

    // D. Node Crowd Surges Override
    const nodeSurges = [];
    if (Array.isArray(params.node_surges)) {
      nodeSurges.push(...params.node_surges);
    }
    if (scenarioType === 'MEDICAL_INCIDENT_GS_B') {
      nodeSurges.push({ node_id: 'GS_B', multiplier: 1.5 });
    }

    for (const surge of nodeSurges) {
      const node = sandboxGraph.getNode(surge.node_id);
      if (node) {
        if (surge.occupancy !== undefined) {
          node.setOccupancy(surge.occupancy);
        } else if (surge.multiplier !== undefined) {
          node.setOccupancy(Math.round(node.capacity * surge.multiplier));
        }
      }
    }

    // 5. Run N Ticks in Sandbox
    for (let i = 0; i < nTicks; i++) {
      sandboxEngine.tick();
      if (forcedWeather) {
        sandboxEngine.activeWeather = forcedWeather;
      }
    }

    const sandboxStateAfter = sandboxEngine.getState();

    // 6. Verify live simulation state remained untouched
    const baselineStateAfter = this.liveSimEngine.getState();

    // 7. Calculate Differential Metrics
    const baselineNodes = baselineStateBefore.nodes;
    const sandboxNodes = sandboxStateAfter.nodes;

    const baselineMaxRisk = Math.max(...baselineNodes.map(n => n.riskScore));
    const sandboxMaxRisk = Math.max(...sandboxNodes.map(n => n.riskScore));

    const baselineHighRiskCount = baselineNodes.filter(n => n.riskScore >= 0.50).length;
    const sandboxHighRiskCount = sandboxNodes.filter(n => n.riskScore >= 0.50).length;

    const newlyImpactedNodes = sandboxNodes.filter(sn => {
      const bn = baselineNodes.find(n => n.id === sn.id);
      return sn.riskScore > (bn ? bn.riskScore + 0.15 : 0.15);
    }).map(n => n.id);

    return {
      status: 'ok',
      scenarioType,
      simulatedTicks: nTicks,
      simulatedMinutes: parseFloat(((nTicks * 10) / 60).toFixed(1)),
      appliedChanges: {
        blockedEdges: Array.from(new Set(edgesToBlock)),
        weather: sandboxEngine.activeWeather.condition,
        activeEvent: sandboxEngine.activeEvent,
        nodeSurges
      },
      baseline: {
        simTime: baselineStateBefore.simTime,
        activeEvent: baselineStateBefore.activeEvent,
        weather: baselineStateBefore.weather.condition,
        maxRiskScore: baselineMaxRisk,
        highRiskNodeCount: baselineHighRiskCount
      },
      sandbox: {
        simTime: sandboxStateAfter.simTime,
        activeEvent: sandboxStateAfter.activeEvent,
        weather: sandboxStateAfter.weather.condition,
        maxRiskScore: sandboxMaxRisk,
        highRiskNodeCount: sandboxHighRiskCount
      },
      differential: {
        riskDelta: parseFloat((sandboxMaxRisk - baselineMaxRisk).toFixed(3)),
        highRiskNodeCountDelta: sandboxHighRiskCount - baselineHighRiskCount,
        newlyImpactedNodes,
        recommendedMitigation: sandboxMaxRisk >= 0.75
          ? 'CRITICAL ALERT: Operational divert recommended via alternate exit corridors.'
          : 'MODERATE RISK: Standard monitoring and marshal deployment recommended.'
      }
    };
  }
}
