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
      const gateway = req.app?.get('socketGateway');
      if (gateway) {
        gateway.broadcastTick(state);
      }
      res.json({ status: 'ok', message: 'Simulation reset', state });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reset simulation', message: err.message });
    }
  };

  setSimulationSpeed = async (req, res) => {
    try {
      const { multiplier } = req.body;
      const gateway = req.app?.get('socketGateway');
      if (gateway && multiplier) {
        gateway.updateSpeed(multiplier);
      }
      res.json({ status: 'ok', message: `Speed updated to ${multiplier}x`, multiplier });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update simulation speed', message: err.message });
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
      const predictions = Array.from(predictionsMap.values());

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
}
