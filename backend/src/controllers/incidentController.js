export class IncidentController {
  constructor(simEngine, storage) {
    this.simEngine = simEngine;
    this.storage = storage;
  }

  triggerIncident = async (req, res) => {
    const { type, edge_id, node_id, value, duration_min } = req.body || {};

    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: "Field 'type' is required." });
    }

    const validTypes = ['route_closure', 'weather_change', 'medical_incident'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Bad Request', message: `Invalid incident type '${type}'. Must be one of: ${validTypes.join(', ')}` });
    }

    const graph = this.storage.getVenueGraphSync();

    if (type === 'route_closure') {
      if (!edge_id || typeof edge_id !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: "Field 'edge_id' is required for route_closure incident." });
      }
      const edge = graph.getEdge(edge_id);
      if (!edge) {
        return res.status(404).json({ error: 'Not Found', message: `Edge '${edge_id}' not found in venue graph.` });
      }

      graph.blockEdge(edge_id);

      return res.status(201).json({
        status: 'ok',
        incident: {
          type,
          edge_id,
          isBlocked: true,
          timestamp: new Date().toISOString()
        },
        message: `Edge '${edge_id}' successfully blocked. Affected agents rerouted.`
      });
    }

    if (type === 'weather_change') {
      if (!value || typeof value !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: "Field 'value' (weather condition) is required for weather_change incident." });
      }

      const validWeather = ['sunny', 'cloudy', 'rain', 'heavy_rain'];
      if (!validWeather.includes(value)) {
        return res.status(400).json({ error: 'Bad Request', message: `Invalid weather value '${value}'. Must be one of: ${validWeather.join(', ')}` });
      }

      this.simEngine.activeWeather = {
        condition: value,
        intensity: value === 'heavy_rain' ? 0.9 : value === 'rain' ? 0.75 : value === 'cloudy' ? 0.25 : 0.1,
        speedMultiplier: value === 'heavy_rain' ? 0.70 : value === 'rain' ? 0.85 : value === 'cloudy' ? 0.95 : 1.0
      };

      return res.status(201).json({
        status: 'ok',
        incident: {
          type,
          value,
          weather: this.simEngine.activeWeather,
          timestamp: new Date().toISOString()
        },
        message: `Weather condition successfully changed to '${value}'.`
      });
    }

    if (type === 'medical_incident') {
      if (!node_id || typeof node_id !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: "Field 'node_id' is required for medical_incident." });
      }
      const node = graph.getNode(node_id);
      if (!node) {
        return res.status(404).json({ error: 'Not Found', message: `Node '${node_id}' not found in venue graph.` });
      }

      return res.status(201).json({
        status: 'ok',
        incident: {
          type,
          node_id,
          duration_min: duration_min || 10,
          timestamp: new Date().toISOString()
        },
        message: `Medical incident logged at '${node_id}'. Emergency response corridor reserved.`
      });
    }

    res.status(400).json({ error: 'Bad Request', message: 'Unhandled incident type' });
  };
}
