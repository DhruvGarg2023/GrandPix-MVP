// Typed REST API Client for F1 Crowd Intelligence Backend

import {
  SimulationTickPayload,
  PredictionPayload,
  RecommendationPayload,
  IncidentPayload,
  RiskSummaryPayload,
  WhatIfScenarioRequest,
  WhatIfScenarioResponse,
  SpectatorStateResponse,
  SpectatorRouteResponse
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error [${response.status}] ${endpoint}: ${errorText}`);
  }

  return response.json();
}

export const api = {
  // Health Check
  async getHealth(): Promise<{ status: string; datasetLoaded: boolean; nodesCount: number; edgesCount: number; agentsCount: number }> {
    return fetchJSON('/health');
  },

  // Simulation Controls
  async initSimulation(): Promise<{ simulationId: string; state: SimulationTickPayload }> {
    return fetchJSON('/api/simulations', { method: 'POST' });
  },

  async startSimulation(id: string = 'sim_default'): Promise<{ success: boolean; isRunning: boolean }> {
    return fetchJSON(`/api/simulations/${id}/start`, { method: 'POST' });
  },

  async pauseSimulation(id: string = 'sim_default'): Promise<{ success: boolean; isRunning: boolean }> {
    return fetchJSON(`/api/simulations/${id}/pause`, { method: 'POST' });
  },

  async resumeSimulation(id: string = 'sim_default'): Promise<{ success: boolean; isRunning: boolean }> {
    return fetchJSON(`/api/simulations/${id}/resume`, { method: 'POST' });
  },

  async resetSimulation(id: string = 'sim_default'): Promise<{ success: boolean; state: SimulationTickPayload }> {
    return fetchJSON(`/api/simulations/${id}/reset`, { method: 'POST' });
  },

  async setSimulationSpeed(id: string = 'sim_default', multiplier: number): Promise<{ success: boolean }> {
    return fetchJSON(`/api/simulations/${id}/speed`, {
      method: 'POST',
      body: JSON.stringify({ multiplier }),
    });
  },

  async getSimulationState(id: string = 'sim_default'): Promise<SimulationTickPayload> {
    const data = await fetchJSON<any>(`/api/simulations/${id}/state`);
    return data.state || data;
  },

  // Predictions & Risks
  async getPredictions(id: string = 'sim_default'): Promise<PredictionPayload> {
    const data = await fetchJSON<any>(`/api/simulations/${id}/predictions`);
    return data.predictions || data;
  },

  async getRisks(id: string = 'sim_default'): Promise<RiskSummaryPayload> {
    const data = await fetchJSON<any>(`/api/simulations/${id}/risks`);
    return data.risks || data;
  },

  // Incidents
  async triggerIncident(id: string = 'sim_default', incident: Partial<IncidentPayload>): Promise<{ success: boolean; incident: IncidentPayload }> {
    return fetchJSON(`/api/simulations/${id}/incidents`, {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  },

  async resolveIncident(id: string = 'sim_default', incident: Partial<IncidentPayload>): Promise<{ success: boolean }> {
    return fetchJSON(`/api/simulations/${id}/incidents/resolve`, {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  },

  // What-If Scenarios
  async runWhatIfScenario(id: string = 'sim_default', scenario: WhatIfScenarioRequest): Promise<WhatIfScenarioResponse> {
    const data = await fetchJSON<WhatIfScenarioResponse>(`/api/simulations/${id}/scenarios`, {
      method: 'POST',
      body: JSON.stringify(scenario),
    });
    return data;
  },

  // Spectator Endpoints
  async getSpectatorState(): Promise<SpectatorStateResponse> {
    const data = await fetchJSON<SpectatorStateResponse>('/api/spectator/state');
    return data;
  },

  async getSpectatorRoutes(from: string, to: string): Promise<SpectatorRouteResponse> {
    const data = await fetchJSON<any>(`/api/spectator/routes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    return {
      origin: data.from,
      destination: data.to,
      optimalPath: data.path,
      totalDistanceM: data.totalDistanceM,
      estimatedWalkMinutes: data.estimatedWalkingTimeMin,
      avoidsBlockedEdges: false,
      warnings: [],
      recommendedExit: data.recommendedExit
    };
  },

  // AI Copilot
  async getAICopilotRecommendation(id: string = 'sim_default'): Promise<RecommendationPayload> {
    const data = await fetchJSON<{ success: boolean; recommendation: RecommendationPayload }>('/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({ simulationId: id }),
    });
    return data.recommendation;
  }
};
