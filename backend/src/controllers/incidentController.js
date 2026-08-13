export class IncidentController {
  constructor(simEngine, storage, socketGateway = null) {
    this.simEngine = simEngine;
    this.storage = storage;
    this.socketGateway = socketGateway;
  }

  _getSocketGateway(req) {
    return this.socketGateway || req.app?.get('socketGateway') || null;
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
    const gateway = this._getSocketGateway(req);

    if (type === 'route_closure') {
      if (!edge_id || typeof edge_id !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: "Field 'edge_id' is required for route_closure incident." });
      }
      const edge = graph.getEdge(edge_id);
      if (!edge) {
        return res.status(404).json({ error: 'Not Found', message: `Edge '${edge_id}' not found in venue graph.` });
      }

      graph.blockEdge(edge_id);

      const incidentPayload = {
        type,
        edge_id,
        isBlocked: true,
        timestamp: new Date().toISOString()
      };

      if (gateway) {
        gateway.broadcastIncident(incidentPayload);
        // Also broadcast tick state update to refresh all clients
        gateway.broadcastTick(this.simEngine.getState());
      }

      return res.status(201).json({
        status: 'ok',
        incident: incidentPayload,
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

      this.simEngine.weatherOverride = {
        condition: value,
        intensity: value === 'heavy_rain' ? 0.9 : value === 'rain' ? 0.75 : value === 'cloudy' ? 0.25 : 0.1,
        speedMultiplier: value === 'heavy_rain' ? 0.70 : value === 'rain' ? 0.85 : value === 'cloudy' ? 0.95 : 1.0
      };
      this.simEngine.activeWeather = this.simEngine.weatherOverride;

      const incidentPayload = {
        type,
        value,
        weather: this.simEngine.activeWeather,
        timestamp: new Date().toISOString()
      };

      if (gateway) {
        gateway.broadcastIncident(incidentPayload);
        gateway.broadcastTick(this.simEngine.getState());
      }

      return res.status(201).json({
        status: 'ok',
        incident: incidentPayload,
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

      const incidentPayload = {
        type,
        node_id,
        duration_min: duration_min || 10,
        timestamp: new Date().toISOString()
      };

      if (gateway) {
        gateway.broadcastIncident(incidentPayload);
      }

      return res.status(201).json({
        status: 'ok',
        incident: incidentPayload,
        message: `Medical incident logged at '${node_id}'. Emergency response corridor reserved.`
      });
    }

    res.status(400).json({ error: 'Bad Request', message: 'Unhandled incident type' });
  };

  resolveIncident = async (req, res) => {
    const { type, edge_id } = req.body || {};

    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: "Field 'type' is required." });
    }

    const graph = this.storage.getVenueGraphSync();
    const gateway = this._getSocketGateway(req);
    let resolved = false;

    if (type === 'route_closure' && edge_id) {
      resolved = graph.unblockEdge(edge_id);
    } else if (type === 'weather_change') {
      this.simEngine.weatherOverride = null;
      this.simEngine.activeWeather = this.simEngine.scheduleWeatherManager?.currentWeather || { condition: 'sunny', intensity: 0.1, speedMultiplier: 1.0 };
      resolved = true;
    } else if (type === 'medical_incident') {
      resolved = true;
    }

    if (resolved) {
      if (gateway) {
        gateway.broadcastIncidentResolved({ type, edge_id, timestamp: new Date().toISOString() });
        gateway.broadcastTick(this.simEngine.getState());
      }
      return res.status(200).json({ status: 'ok', message: `Incident type '${type}' resolved successfully.` });
    }

    res.status(400).json({ error: 'Bad Request', message: `Failed to resolve incident of type '${type}'` });
  };
}
