export class IncidentController {
  constructor(simEngine, storage, socketGateway = null) {
    this.simEngine = simEngine;
    this.storage = storage;
    this.socketGateway = socketGateway;
  }

  _getSocketGateway(req) {
    return this.socketGateway || req.app?.get('socketGateway') || null;
  }

  _broadcastStateAndRisks(req) {
    const gateway = this._getSocketGateway(req);
    if (!gateway) return;
    const state = this.simEngine.getState();
    if (typeof gateway.broadcastTick === 'function') {
      gateway.broadcastTick(state);
    }
    
    if (typeof gateway.broadcastRiskUpdate === 'function') {
      const highRiskNodes = state.nodes.filter(n => n.riskScore >= 0.50 || n.riskSeverity === 'HIGH' || n.riskSeverity === 'CRITICAL');
      gateway.broadcastRiskUpdate({
        simulationId: state.simulationId,
        timestamp: new Date().toISOString(),
        highRiskCount: highRiskNodes.length,
        nodes: state.nodes
      });
    }
  }

  triggerIncident = async (req, res) => {
    const { type, edge_id, node_id, value, duration_min } = req.body || {};

    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: "Field 'type' is required." });
    }

    const validTypes = ['route_closure', 'weather_change', 'medical_incident', 'node_disable'];
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
      }
      this._broadcastStateAndRisks(req);

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

      this.simEngine.weatherOverride = value;
      this.simEngine.activeWeather = {
        condition: value,
        intensity: value === 'heavy_rain' ? 0.9 : value === 'rain' ? 0.75 : value === 'cloudy' ? 0.25 : 0.1,
        speedMultiplier: value === 'heavy_rain' ? 0.70 : value === 'rain' ? 0.85 : value === 'cloudy' ? 0.95 : 1.0
      };

      const incidentPayload = {
        type,
        value,
        weather: this.simEngine.activeWeather,
        timestamp: new Date().toISOString()
      };

      if (gateway) {
        gateway.broadcastIncident(incidentPayload);
      }
      this._broadcastStateAndRisks(req);

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

    if (type === 'node_disable') {
      if (!node_id || typeof node_id !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: "Field 'node_id' is required for node_disable." });
      }
      const node = graph.getNode(node_id);
      if (!node) {
        return res.status(404).json({ error: 'Not Found', message: `Node '${node_id}' not found in venue graph.` });
      }

      const isDisabled = req.body.isDisabled !== undefined ? req.body.isDisabled : !node.isDisabled;
      
      let dispersedCount = 0;
      let targetNodeId = null;

      if (isDisabled) {
        node.disable();
        this.simEngine.queueEngine.clearQueue(node_id);
        const nearestNodeId = graph.getNearestActiveNeighbor(node_id);
        targetNodeId = nearestNodeId;
        if (nearestNodeId) {
          const nearestNode = graph.getNode(nearestNodeId);
          const agents = Array.from(this.storage.agentsMap.values());
          
          for (const agent of agents) {
            if (agent.currentNode === node_id) {
              agent.currentNode = nearestNodeId;
              agent.route = [];
              agent.status = 'waiting';
              dispersedCount++;
            }
          }
          
          if (dispersedCount > 0) {
            node.setOccupancy(0);
            nearestNode.addOccupancy(dispersedCount);
          }
        } else {
          node.setOccupancy(0);
        }
      } else {
        node.enable();
      }

      const incidentPayload = {
        type,
        node_id,
        isDisabled,
        dispersedCount,
        targetNodeId,
        timestamp: new Date().toISOString()
      };

      if (gateway) {
        gateway.broadcastIncident(incidentPayload);
      }
      this._broadcastStateAndRisks(req);

      return res.status(201).json({
        status: 'ok',
        incident: incidentPayload,
        message: `Node '${node_id}' successfully ${isDisabled ? 'disabled' : 'enabled'}. Dispersed ${dispersedCount} agents to '${targetNodeId || 'none'}'.`
      });
    }

    res.status(400).json({ error: 'Bad Request', message: 'Unhandled incident type' });
  };
}
