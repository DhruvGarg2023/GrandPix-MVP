import { timeToSeconds, secondsToTime, ScheduleWeatherManager } from './ScheduleWeatherManager.js';
import { DestinationSelector } from './DestinationSelector.js';
import { SeededRNG } from '../utils/random.js';
import { AgentStatus } from '../models/Agent.js';
import { AStarRouter } from '../graph/AStarRouter.js';
import { QueueEngine } from '../queue/QueueEngine.js';
import { RiskEngine } from '../risk/RiskEngine.js';
import { DataLoader } from '../loader/DataLoader.js';

export class SimulationEngine {
  constructor(storage, initialTimeStr = '16:20') {
    this.storage = storage;
    this.initialTimeStr = initialTimeStr;
    this.currentSeconds = timeToSeconds(initialTimeStr);
    this.tickCount = 0;
    this.tickSeconds = 10;
    this.isRunning = false;
    this.speedMultiplier = 1;
    this.timerId = null;
    this.socketGateway = null;

    this.rng = new SeededRNG(42);
    this.router = new AStarRouter({ congestionWeight: 3.0 });
    
    this.metadata = storage.metadata || {};
    this.scheduleManager = new ScheduleWeatherManager(
      Array.isArray(this.metadata.schedule) ? this.metadata.schedule : [],
      Array.isArray(this.metadata.weather) ? this.metadata.weather : []
    );
    this.destinationSelector = new DestinationSelector(this.metadata, this.rng);

    this.queueEngine = new QueueEngine(this.metadata.queueService || {});
    this.riskEngine = new RiskEngine();
    this.weatherOverride = null;

    this.activeEvent = this.scheduleManager.getActiveEvent(this.currentSeconds);
    this.activeWeather = this.scheduleManager.getWeatherAt(this.currentSeconds);
    
    this.edgeTraversalsThisTick = new Map(); // edgeId -> count of agents on edge
  }

  start() {
    this.isRunning = true;
    this.startBackgroundTimer();
    return this.getState();
  }

  pause() {
    this.isRunning = false;
    this.stopBackgroundTimer();
    return this.getState();
  }

  resume() {
    this.isRunning = true;
    this.startBackgroundTimer();
    return this.getState();
  }

  reset() {
    this.isRunning = false;
    this.stopBackgroundTimer();
    this.currentSeconds = timeToSeconds(this.initialTimeStr);
    this.tickCount = 0;
    this.rng = new SeededRNG(42);
    this.queueEngine = new QueueEngine(this.metadata.queueService || {});

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

    this.weatherOverride = null;
    this.activeEvent = this.scheduleManager.getActiveEvent(this.currentSeconds);
    this.activeWeather = this.scheduleManager.getWeatherAt(this.currentSeconds);

    return this.getState();
  }

  startBackgroundTimer() {
    this.stopBackgroundTimer();
    
    const runTick = () => {
      if (!this.isRunning) return;
      
      this.tick();
      
      if (this.socketGateway) {
        this.socketGateway.broadcastTick(this.getState());
        
        // Also broadcast risks update automatically to keep clients in sync
        const state = this.getState();
        const highRiskNodes = state.nodes.filter(n => n.riskScore >= 0.50 || n.riskSeverity === 'HIGH' || n.riskSeverity === 'CRITICAL');
        this.socketGateway.broadcastRiskUpdate({
          simulationId: state.simulationId,
          timestamp: new Date().toISOString(),
          highRiskCount: highRiskNodes.length,
          nodes: state.nodes
        });
      }
      
      const interval = 1000 / (this.speedMultiplier || 1);
      this.timerId = setTimeout(runTick, interval);
    };

    const interval = 1000 / (this.speedMultiplier || 1);
    this.timerId = setTimeout(runTick, interval);
  }

  stopBackgroundTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  updateTimerSpeed() {
    if (this.isRunning) {
      this.startBackgroundTimer();
    }
  }

  tick() {
    this.tickCount += 1;
    this.currentSeconds += this.tickSeconds;

    const simTimeStr = secondsToTime(this.currentSeconds);
    const prevEvent = this.activeEvent;
    
    this.activeEvent = this.scheduleManager.getActiveEvent(this.currentSeconds);
    if (this.weatherOverride) {
      const val = this.weatherOverride;
      this.activeWeather = {
        condition: val,
        intensity: val === 'heavy_rain' ? 0.9 : val === 'rain' ? 0.75 : val === 'cloudy' ? 0.25 : 0.1,
        speedMultiplier: val === 'heavy_rain' ? 0.70 : val === 'rain' ? 0.85 : val === 'cloudy' ? 0.95 : 1.0
      };
    } else {
      this.activeWeather = this.scheduleManager.getWeatherAt(this.currentSeconds);
    }

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
          const nextNode = graph.getNode(nextNodeId);
          if (edge && edge.isTraversable() && (!nextNode || !nextNode.isDisabled)) {
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

              // If agent arrived at a queue facility at destination, enqueue
              if (agent.status === AgentStatus.ARRIVED && this.queueEngine.isQueueFacility(agent.currentNode)) {
                this.queueEngine.enqueue(agent.currentNode, agent);
              }
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

    // Process facility queue service tick
    this.queueEngine.processTick(this.tickSeconds, graph);

    return this.getState();
  }

  getState() {
    const graph = this.storage.getVenueGraphSync();
    const simTime = secondsToTime(this.currentSeconds);

    const risks = graph ? this.riskEngine.calculateAllRisks(graph, this.queueEngine, this.activeWeather) : new Map();

    const nodesJson = graph ? graph.getNodes().map(n => {
      const nodeObj = n.toJSON();
      const risk = risks.get(n.id);
      const queueLen = this.queueEngine.getQueueLength(n.id);
      const waitTimeMin = this.queueEngine.getWaitTimeMinutes(n.id);
      let dispersedTo = null;
      if (n.isDisabled) {
        dispersedTo = graph.getNearestActiveNeighbor(n.id);
      }
      return {
        ...nodeObj,
        riskScore: risk ? risk.riskScore : 0,
        riskSeverity: risk ? risk.severity : 'SAFE',
        riskBreakdown: risk ? risk.breakdown : null,
        queueLength: queueLen,
        queueWaitTimeMin: waitTimeMin,
        dispersedTo
      };
    }) : [];

    return {
      simulationId: 'sim_default',
      tick: this.tickCount,
      simTime,
      isRunning: this.isRunning,
      activeEvent: this.activeEvent,
      weather: this.activeWeather,
      nodes: nodesJson,
      edges: graph ? graph.getEdges().map(e => e.toJSON()) : [],
      queues: this.queueEngine.toJSON(),
      agentCount: this.storage.agentsMap.size
    };
  }

  loadCustomDataset(graphJson, agentsCsvText, scheduleCsvText) {
    const loader = new DataLoader('');
    const dataStats = loader.loadCustomAndHydrate(
      this.storage,
      graphJson,
      agentsCsvText,
      scheduleCsvText
    );

    this.metadata = this.storage.metadata || {};
    this.scheduleManager = new ScheduleWeatherManager(
      Array.isArray(this.metadata.schedule) ? this.metadata.schedule : [],
      Array.isArray(this.metadata.weather) ? this.metadata.weather : []
    );
    this.destinationSelector = new DestinationSelector(this.metadata, this.rng);
    this.queueEngine = new QueueEngine(this.metadata.queueService || {});

    this.reset();
    
    if (this.socketGateway) {
      this.socketGateway.broadcastTick(this.getState());
    }

    return dataStats;
  }
}
