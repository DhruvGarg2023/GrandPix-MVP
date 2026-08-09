import { timeToSeconds, secondsToTime, ScheduleWeatherManager } from './ScheduleWeatherManager.js';
import { DestinationSelector } from './DestinationSelector.js';
import { SeededRNG } from '../utils/random.js';
import { AgentStatus } from '../models/Agent.js';
import { AStarRouter } from '../graph/AStarRouter.js';

export class SimulationEngine {
  constructor(storage, initialTimeStr = '16:20') {
    this.storage = storage;
    this.initialTimeStr = initialTimeStr;
    this.currentSeconds = timeToSeconds(initialTimeStr);
    this.tickCount = 0;
    this.tickSeconds = 10;
    this.isRunning = false;

    this.rng = new SeededRNG(42);
    this.router = new AStarRouter({ congestionWeight: 3.0 });
    
    this.metadata = storage.metadata || {};
    this.scheduleManager = new ScheduleWeatherManager(
      this.metadata.schedule,
      this.metadata.weather
    );
    this.destinationSelector = new DestinationSelector(this.metadata, this.rng);

    this.activeEvent = this.scheduleManager.getActiveEvent(this.currentSeconds);
    this.activeWeather = this.scheduleManager.getWeatherAt(this.currentSeconds);
    
    this.edgeTraversalsThisTick = new Map(); // edgeId -> count of agents on edge
  }

  start() {
    this.isRunning = true;
    return this.getState();
  }

  pause() {
    this.isRunning = false;
    return this.getState();
  }

  resume() {
    this.isRunning = true;
    return this.getState();
  }

  reset() {
    this.isRunning = false;
    this.currentSeconds = timeToSeconds(this.initialTimeStr);
    this.tickCount = 0;
    this.rng = new SeededRNG(42);

    const graph = this.storage.getVenueGraphSync();
    if (graph) {
      graph.resetOccupancies();
      const initialOccupancy = this.metadata.initialOccupancy || {};
      for (const [nodeId, count] of Object.entries(initialOccupancy)) {
        const node = graph.getNode(nodeId);
        if (node) {
          node.setOccupancy(count);
        }
      }
    }

    const agents = this.storage.agentsMap;
    for (const agent of agents.values()) {
      agent.currentNode = agent.entryGate;
      agent.destination = agent.initialDestination;
      agent.route = [];
      agent.routeIndex = 0;
      agent.distanceWalkedOnCurrentEdge = 0;
      agent.status = (agent.currentNode === agent.destination) ? AgentStatus.ARRIVED : AgentStatus.WAITING;
    }

    this.activeEvent = this.scheduleManager.getActiveEvent(this.currentSeconds);
    this.activeWeather = this.scheduleManager.getWeatherAt(this.currentSeconds);

    return this.getState();
  }

  tick() {
    this.tickCount += 1;
    this.currentSeconds += this.tickSeconds;

    const simTimeStr = secondsToTime(this.currentSeconds);
    const prevEvent = this.activeEvent;
    
    this.activeEvent = this.scheduleManager.getActiveEvent(this.currentSeconds);
    this.activeWeather = this.scheduleManager.getWeatherAt(this.currentSeconds);

    const graph = this.storage.getVenueGraphSync();
    const agents = Array.from(this.storage.agentsMap.values());

    const eventChanged = (this.activeEvent !== prevEvent);

    // Track edge flow rates for this tick
    const edgeFlows = new Map();

    for (const agent of agents) {
      // 1. If active event changed or agent arrived, update destination
      if (eventChanged || agent.status === AgentStatus.ARRIVED) {
        if (eventChanged) {
          const newDest = this.destinationSelector.selectDestination(agent.persona, this.activeEvent);
          if (newDest && newDest !== agent.destination) {
            agent.destination = newDest;
            agent.status = AgentStatus.WAITING;
          }
        }
      }

      // 2. If agent is waiting or has no route, calculate route using A* Router
      if ((agent.status === AgentStatus.WAITING || agent.route.length === 0) && agent.currentNode !== agent.destination) {
        const path = this.router.findPath(graph, agent.currentNode, agent.destination);
        if (path && path.length > 1) {
          agent.setRoute(path);
        }
      }

      // 3. Advance agent if walking
      if (agent.status === AgentStatus.WALKING && agent.route.length > 1) {
        const nextNodeId = agent.getNextNode();
        if (nextNodeId) {
          const edge = graph.getEdgeBetween(agent.currentNode, nextNodeId);
          if (edge && edge.isTraversable()) {
            const stepDistance = agent.speedMps * this.activeWeather.speedMultiplier * this.tickSeconds;
            agent.distanceWalkedOnCurrentEdge += stepDistance;

            // Track edge flow
            edgeFlows.set(edge.id, (edgeFlows.get(edge.id) || 0) + 1);

            if (agent.distanceWalkedOnCurrentEdge >= edge.distanceM) {
              // Agent completes edge traversal
              const oldNode = graph.getNode(agent.currentNode);
              if (oldNode) oldNode.removeOccupancy(1);

              agent.advanceToNextNode();

              const newNode = graph.getNode(agent.currentNode);
              if (newNode) newNode.addOccupancy(1);
            }
          } else {
            // Edge blocked or non-traversable, force instant route recalculation
            agent.route = [];
            agent.status = AgentStatus.WAITING;
          }
        }
      }
    }

    // Update edge flow rates (scaled to flow per minute)
    for (const edge of graph.getEdges()) {
      const count = edgeFlows.get(edge.id) || 0;
      edge.currentFlowRate = Math.round((count / this.tickSeconds) * 60);
    }

    return this.getState();
  }

  getState() {
    const graph = this.storage.getVenueGraphSync();
    const simTime = secondsToTime(this.currentSeconds);

    return {
      simulationId: 'sim_default',
      tick: this.tickCount,
      simTime,
      isRunning: this.isRunning,
      activeEvent: this.activeEvent,
      weather: this.activeWeather,
      nodes: graph ? graph.getNodes().map(n => n.toJSON()) : [],
      edges: graph ? graph.getEdges().map(e => e.toJSON()) : [],
      agentCount: this.storage.agentsMap.size
    };
  }
}
