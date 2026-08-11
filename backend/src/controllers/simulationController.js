export class SimulationController {
  constructor(simEngine, predictionAdapter) {
    this.simEngine = simEngine;
    this.predictionAdapter = predictionAdapter;
  }

  initSimulation = async (req, res) => {
    try {
      const state = this.simEngine.reset();
      res.status(201).json({ status: 'ok', message: 'Simulation initialized', state });
    } catch (err) {
      res.status(500).json({ error: 'Failed to initialize simulation', message: err.message });
    }
  };

  startSimulation = async (req, res) => {
    try {
      const state = this.simEngine.start();
      res.json({ status: 'ok', message: 'Simulation started', state });
    } catch (err) {
      res.status(500).json({ error: 'Failed to start simulation', message: err.message });
    }
  };

  pauseSimulation = async (req, res) => {
    try {
      const state = this.simEngine.pause();
      res.json({ status: 'ok', message: 'Simulation paused', state });
    } catch (err) {
      res.status(500).json({ error: 'Failed to pause simulation', message: err.message });
    }
  };

  resumeSimulation = async (req, res) => {
    try {
      const state = this.simEngine.resume();
      res.json({ status: 'ok', message: 'Simulation resumed', state });
    } catch (err) {
      res.status(500).json({ error: 'Failed to resume simulation', message: err.message });
    }
  };

  resetSimulation = async (req, res) => {
    try {
      const state = this.simEngine.reset();
      res.json({ status: 'ok', message: 'Simulation reset', state });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reset simulation', message: err.message });
    }
  };

  advanceTick = async (req, res) => {
    try {
      const ticksCount = Math.max(1, parseInt(req.body?.ticks || 1, 10));
      let lastState = null;
      for (let i = 0; i < ticksCount; i++) {
        lastState = this.simEngine.tick();
      }
      res.json({ status: 'ok', message: `Advanced simulation by ${ticksCount} tick(s)`, state: lastState });
    } catch (err) {
      res.status(500).json({ error: 'Failed to advance simulation tick', message: err.message });
    }
  };

  setSpeed = async (req, res) => {
    try {
      const speed = Math.max(1, parseInt(req.body?.speed || 1, 10));
      this.simEngine.speedMultiplier = speed;
      this.simEngine.updateTimerSpeed();
      res.json({ status: 'ok', message: `Speed multiplier set to ${speed}x`, speed });
    } catch (err) {
      res.status(500).json({ error: 'Failed to set speed multiplier', message: err.message });
    }
  };

  getSimulationState = async (req, res) => {
    try {
      const state = this.simEngine.getState();
      res.json(state);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get simulation state', message: err.message });
    }
  };

  getPredictions = async (req, res) => {
    try {
      const state = this.simEngine.getState();
      const featureItems = state.nodes.map(n => ({
        zone: n.id,
        event: state.activeEvent,
        weather: state.weather?.condition || 'sunny',
        attendance: 120000.0,
        current_density_ratio: n.densityRatio,
        flow_rate_ratio: 0.5,
        queue_length: n.queueLength || 0,
        blocked_route: 0
      }));

      const predictionsMap = await this.predictionAdapter.predictBatch(featureItems);
      const predictions = Array.from(predictionsMap.values()).map(p => ({
        nodeId: p.zone,
        currentDensity: p.currentDensityRatio,
        predictedDensity10min: p.predictedDensity10minRatio,
        delta: p.delta
      }));

      res.json({
        simulationId: state.simulationId,
        timestamp: new Date().toISOString(),
        count: predictions.length,
        predictions
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch predictions', message: err.message });
    }
  };

  getRisks = async (req, res) => {
    try {
      const state = this.simEngine.getState();
      const highRiskNodes = state.nodes.filter(n => n.riskScore >= 0.50 || n.riskSeverity === 'HIGH' || n.riskSeverity === 'CRITICAL');

      res.json({
        simulationId: state.simulationId,
        timestamp: new Date().toISOString(),
        highRiskCount: highRiskNodes.length,
        nodes: state.nodes.map(n => ({
          id: n.id,
          type: n.type,
          currentOccupancy: n.currentOccupancy,
          capacity: n.capacity,
          densityRatio: n.densityRatio,
          riskScore: n.riskScore,
          riskSeverity: n.riskSeverity,
          riskBreakdown: n.riskBreakdown
        }))
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch risks', message: err.message });
    }
  };

  importDataset = async (req, res) => {
    try {
      const { graphJson, agentsCsv, scheduleCsv } = req.body || {};
      if (!graphJson) {
        return res.status(400).json({ error: 'Bad Request', message: "Field 'graphJson' is required for dataset import." });
      }

      const dataStats = this.simEngine.loadCustomDataset(
        graphJson,
        agentsCsv || null,
        scheduleCsv || null
      );

      res.status(201).json({
        status: 'ok',
        message: 'Custom dataset successfully loaded and simulation reset',
        stats: dataStats,
        state: this.simEngine.getState()
      });
    } catch (err) {
      console.error('[Import Dataset Error]', err);
      res.status(500).json({ error: 'Failed to import dataset', message: err.message });
    }
  };
}
