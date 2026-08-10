import { AStarRouter } from '../graph/AStarRouter.js';

export class SpectatorController {
  constructor(simEngine, storage) {
    this.simEngine = simEngine;
    this.storage = storage;
    this.router = new AStarRouter({ congestionWeight: 3.0 });
  }

  getSpectatorState = async (req, res) => {
    try {
      const state = this.simEngine.getState();
      const metadata = await this.storage.getMetadata();

      res.json({
        circuit: metadata.scenario?.circuit || 'F1 Demo Circuit',
        activeEvent: state.activeEvent,
        weather: state.weather,
        simTime: state.simTime,
        schedule: metadata.schedule || [],
        facilities: state.queues || {},
        recommendedExit: state.activeEvent === 'EXIT_RUSH' ? 'EXIT_S' : 'EXIT_N'
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch spectator state', message: err.message });
    }
  };

  getSpectatorRoute = async (req, res) => {
    const { from, to } = req.query || {};

    if (!from || typeof from !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: "Query parameter 'from' is required." });
    }
    if (!to || typeof to !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: "Query parameter 'to' is required." });
    }

    const graph = this.storage.getVenueGraphSync();
    const fromNode = graph.getNode(from);
    const toNode = graph.getNode(to);

    if (!fromNode) {
      return res.status(404).json({ error: 'Not Found', message: `Origin node '${from}' not found.` });
    }
    if (!toNode) {
      return res.status(404).json({ error: 'Not Found', message: `Destination node '${to}' not found.` });
    }

    const path = this.router.findPath(graph, from, to);

    // Calculate path distance and estimated walking time
    let totalDistanceM = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const edge = graph.getEdgeBetween(path[i], path[i + 1]);
      if (edge) {
        totalDistanceM += edge.distanceM;
      }
    }

    const weather = this.simEngine.activeWeather;
    const baseSpeedMps = 1.2;
    const effectiveSpeedMps = baseSpeedMps * (weather?.speedMultiplier || 1.0);

    const walkingTimeSeconds = Math.round(totalDistanceM / Math.max(0.1, effectiveSpeedMps));
    const walkingTimeMinutes = parseFloat((walkingTimeSeconds / 60).toFixed(1));

    res.json({
      from,
      to,
      path,
      totalDistanceM,
      estimatedWalkingTimeMin: walkingTimeMinutes,
      weatherCondition: weather?.condition || 'sunny',
      recommendedExit: to.startsWith('EXIT') ? to : 'EXIT_S'
    });
  };
}
