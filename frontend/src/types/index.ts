// F1 Crowd Intelligence Platform - TypeScript Domain Types

export type RiskSeverity = 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface NodeState {
  id: string;
  type: string;
  capacity: number;
  occupancy: number;
  densityRatio: number;
  riskScore: number;
  riskSeverity: RiskSeverity;
  queueLength?: number;
  waitMinutes?: number;
  coordinates?: { x: number; y: number; lat?: number; lng?: number };
}

export interface EdgeState {
  id: string;
  from: string;
  to: string;
  distance_m: number;
  capacity_per_min: number;
  flowRate: number;
  isBlocked: boolean;
}

export interface WeatherState {
  condition: string;
  intensity?: number;
  rain_probability?: number;
  temperature_c?: number;
}

export interface SimulationTickPayload {
  simulationId: string;
  tick: number;
  simTime: string; // HH:MM
  activeEvent: string;
  weather: WeatherState;
  nodes: NodeState[];
  edges: EdgeState[];
  agentsSummary?: {
    total: number;
    walking: number;
    queued: number;
    arrived: number;
  };
}

export interface DensityPrediction {
  nodeId: string;
  currentDensity: number;
  predictedDensity10min: number;
  delta: number;
}

export interface PredictionPayload {
  simulationId: string;
  timestamp: string;
  predictions: DensityPrediction[];
}

export type ActionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface RecommendationPayload {
  id: string;
  timestamp: string;
  actionType: 'REROUTE_CROWD' | 'REDIRECT_FLOW' | 'OPEN_GATE' | 'DEPLOY_STAFF' | 'MAINTAIN_MONITORING';
  targetNode: string;
  priority: ActionPriority;
  title: string;
  reasoning: string;
  recommendedEdgeToBlock?: string;
  isFallback: boolean;
}

export interface IncidentPayload {
  id?: string;
  time: string;
  type: 'route_closure' | 'weather_change' | 'medical_incident' | 'GATE_SHUTDOWN' | 'CROWD_SURGE';
  edge_id?: string;
  node_id?: string;
  value?: string | number;
}

export interface RiskSummaryPayload {
  timestamp: string;
  nodes: NodeState[];
  highRiskCount: number;
  criticalCount: number;
  highestRiskNode?: NodeState;
}

export interface WhatIfScenarioRequest {
  scenarioType: 'CLOSE_GATE_B' | 'CLOSE_E16' | 'HEAVY_RAIN' | 'MEDICAL_GS_B' | 'CUSTOM';
  parameterOverrides?: {
    blockedEdges?: string[];
    weatherCondition?: string;
    weatherIntensity?: number;
    nodeSurges?: Record<string, number>;
  };
}

export interface WhatIfScenarioResponse {
  status: string;
  scenarioType: string;
  simulatedTicks: number;
  simulatedMinutes: number;
  appliedChanges: any;
  baseline: {
    simTime: string;
    activeEvent: string;
    weather: string;
    maxRiskScore: number;
    highRiskNodeCount: number;
  };
  sandbox: {
    simTime: string;
    activeEvent: string;
    weather: string;
    maxRiskScore: number;
    highRiskNodeCount: number;
  };
  differential: {
    riskDelta: number;
    highRiskNodeCountDelta: number;
    newlyImpactedNodes: string[];
    recommendedMitigation: string;
  };
}

export interface SpectatorStateResponse {
  circuit: string;
  activeEvent: string;
  weather: WeatherState;
  nodes: Array<{
    id: string;
    type: string;
    isCongested: boolean;
    queueWaitMinutes: number;
  }>;
  blockedEdges: string[];
}

export interface SpectatorRouteResponse {
  origin: string;
  destination: string;
  optimalPath: string[]; // Node IDs
  totalDistanceM: number;
  estimatedWalkMinutes: number;
  avoidsBlockedEdges: boolean;
  warnings: string[];
  recommendedExit?: string;
}
