
export class AIController {
  constructor(simEngine, predictionAdapter) {
    this.simEngine = simEngine;
    this.predictionAdapter = predictionAdapter;
  }

  analyzeSituation = async (req, res) => {
    try {
      const gateway = req.app?.get('socketGateway');
      if (!gateway || !gateway.aiTriggerController) {
        return res.status(500).json({ error: 'AI Trigger Controller not initialized' });
      }

      const simState = this.simEngine.getState();
      const featureItems = simState.nodes.map(n => ({
        zone: n.id,
        event: simState.activeEvent,
        weather: simState.weather?.condition || 'sunny',
        attendance: 120000.0,
        current_density_ratio: n.densityRatio,
        flow_rate_ratio: 0.5,
        queue_length: n.queueLength || 0,
        blocked_route: 0
      }));

      const predictionsMap = await this.predictionAdapter.predictBatch(featureItems);
      
      const highRiskNodes = simState.nodes.filter(
        n => n.riskScore >= 0.50 || n.riskSeverity === 'HIGH' || n.riskSeverity === 'CRITICAL'
      );
      const risksPayload = {
        simulationId: simState.simulationId,
        timestamp: new Date().toISOString(),
        highRiskCount: highRiskNodes.length,
        nodes: simState.nodes.map(n => ({
          id: n.id,
          riskScore: n.riskScore,
          riskSeverity: n.riskSeverity,
        }))
      };

      const recommendation = await gateway.aiTriggerController.processManualRequest(simState, risksPayload, predictionsMap);

      if (recommendation) {
        gateway.broadcastRecommendation(recommendation);
      }

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        recommendation
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate AI copilot recommendation', message: err.message });
    }
  };
}
