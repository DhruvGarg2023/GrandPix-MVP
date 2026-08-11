import express from 'express';
import cors from 'cors';
import { DataLoader } from './loader/DataLoader.js';
import { InMemoryStorage } from './storage/InMemoryStorage.js';
import { SimulationEngine } from './engine/SimulationEngine.js';
import { PythonPredictionAdapter } from './prediction/PythonPredictionAdapter.js';
import { SimulationController } from './controllers/simulationController.js';
import { IncidentController } from './controllers/incidentController.js';
import { WhatIfController } from './controllers/whatIfController.js';
import { SpectatorController } from './controllers/spectatorController.js';
import { AIController } from './controllers/aiController.js';

export function createApp(dataPath = '../data') {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Instantiate Storage & Load Dataset
  const storage = new InMemoryStorage();
  const loader = new DataLoader(dataPath);
  const dataStats = loader.loadAndHydrate(storage);

  // Instantiate Simulation Engine & AI Adapters
  const simEngine = new SimulationEngine(storage);
  const predictionAdapter = new PythonPredictionAdapter();

  // Instantiate REST Controllers
  const simController = new SimulationController(simEngine, predictionAdapter);
  const incidentController = new IncidentController(simEngine, storage);
  const whatIfController = new WhatIfController(simEngine, storage);
  const spectatorController = new SpectatorController(simEngine, storage);
  const aiController = new AIController(simEngine, predictionAdapter);

  // Health Endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      datasetLoaded: true,
      nodesCount: dataStats.nodesCount,
      edgesCount: dataStats.edgesCount,
      agentsCount: dataStats.agentsCount,
      scenario: dataStats.scenario,
      circuit: dataStats.scenario.circuit
    });
  });

  // REST API Routes

  // 1. Simulation Controls & State
  app.post('/api/simulations', simController.initSimulation);
  app.post('/api/simulations/:id/start', simController.startSimulation);
  app.post('/api/simulations/:id/pause', simController.pauseSimulation);
  app.post('/api/simulations/:id/resume', simController.resumeSimulation);
  app.post('/api/simulations/:id/reset', simController.resetSimulation);
  app.post('/api/simulations/:id/tick', simController.advanceTick);
  app.post('/api/simulations/:id/speed', simController.setSpeed);
  app.post('/api/simulations/:id/import', simController.importDataset);
  app.get('/api/simulations/:id/state', simController.getSimulationState);

  // 2. Predictions & Risks
  app.get('/api/simulations/:id/predictions', simController.getPredictions);
  app.get('/api/simulations/:id/risks', simController.getRisks);

  // 3. Incidents
  app.post('/api/simulations/:id/incidents', incidentController.triggerIncident);

  // 4. Sandbox What-If Scenarios
  app.post('/api/simulations/:id/scenarios', whatIfController.runWhatIfScenario);

  // 5. Spectator Endpoints
  app.get('/api/spectator/state', spectatorController.getSpectatorState);
  app.get('/api/spectator/routes', spectatorController.getSpectatorRoute);

  // 6. AI Copilot Recommendation
  app.post('/api/ai/copilot', aiController.getCopilotRecommendation);

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error('[Express Error]', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return {
    app,
    storage,
    simEngine,
    predictionAdapter,
    dataStats
  };
}
