import { RecommendationService } from '../ai/RecommendationService.js';

export class AIController {
  constructor(simEngine, predictionAdapter) {
    this.simEngine = simEngine;
    this.predictionAdapter = predictionAdapter;
    this.recService = new RecommendationService();
  }

  getCopilotRecommendation = async (req, res) => {
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
      const { recommendation, candidateActions } = await this.recService.getRecommendation(state, null, predictionsMap);

      const gateway = req.app?.get('socketGateway');
      if (gateway && recommendation) {
        gateway.broadcastRecommendation(recommendation);
      }

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        recommendation,
        candidateActions
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate AI copilot recommendation', message: err.message });
    }
  };
}
