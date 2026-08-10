import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { InMemoryStorage } from './storage/InMemoryStorage.js';
import { DataLoader } from './loader/DataLoader.js';
import { SimulationEngine } from './engine/SimulationEngine.js';
import { PythonPredictionAdapter } from './prediction/PythonPredictionAdapter.js';
import { SimulationController } from './controllers/simulationController.js';
import { IncidentController } from './controllers/incidentController.js';
import { SpectatorController } from './controllers/spectatorController.js';
import { AIController } from './controllers/aiController.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({ origin: config.frontendUrl }));
  app.use(express.json());

  // Storage & Data Loading Initialization
  const storage = new InMemoryStorage();
  const dataLoader = new DataLoader(config.dataPath);
  
  let datasetStats = null;
  let datasetError = null;

  try {
    datasetStats = dataLoader.loadAndHydrate(storage);
    console.log('[DataLoader] Dataset loaded successfully:', datasetStats);
  } catch (err) {
    datasetError = err.message;
    console.error('[DataLoader] Dataset load error:', err);
  }

  // Domain Engines & Adapters
  const simEngine = new SimulationEngine(storage, '16:20');
  const predictionAdapter = new PythonPredictionAdapter();

  // Controllers
  const simController = new SimulationController(simEngine, predictionAdapter);
  const incidentController = new IncidentController(simEngine, storage);
  const spectatorController = new SpectatorController(simEngine, storage);
  const aiController = new AIController(simEngine, predictionAdapter);

  // Health Endpoint
  app.get('/health', async (req, res) => {
    if (datasetError) {
      return res.status(500).json({
        status: 'error',
        message: 'Dataset failed to load',
        error: datasetError
      });
    }

    const nodes = await storage.getNodes();
    const edges = await storage.getEdges();
    const agents = await storage.getAgents();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      datasetLoaded: true,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      agentsCount: agents.length,
      scenario: datasetStats?.scenario || null
    });
  });

  // REST API Routes

  // 1. Simulation Controls & State
  app.post('/api/simulations', simController.initSimulation);
  app.post('/api/simulations/:id/start', simController.startSimulation);
  app.post('/api/simulations/:id/pause', simController.pauseSimulation);
  app.post('/api/simulations/:id/resume', simController.resumeSimulation);
  app.post('/api/simulations/:id/reset', simController.resetSimulation);
  app.get('/api/simulations/:id/state', simController.getSimulationState);

  // 2. Predictions & Risks
  app.get('/api/simulations/:id/predictions', simController.getPredictions);
  app.get('/api/simulations/:id/risks', simController.getRisks);

  // 3. Incidents
  app.post('/api/simulations/:id/incidents', incidentController.triggerIncident);

  // 4. Spectator Endpoints
  app.get('/api/spectator/state', spectatorController.getSpectatorState);
  app.get('/api/spectator/routes', spectatorController.getSpectatorRoute);

  // 5. AI Copilot Recommendation
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
    datasetStats
  };
}
