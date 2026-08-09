import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { InMemoryStorage } from './storage/InMemoryStorage.js';
import { DataLoader } from './loader/DataLoader.js';

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

  // Health endpoint
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

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error('[Express Error]', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return { app, storage, datasetStats };
}
