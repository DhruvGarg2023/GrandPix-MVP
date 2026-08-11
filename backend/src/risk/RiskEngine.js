export const RiskSeverity = {
  SAFE: 'SAFE',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * RiskEngine deterministically assesses crowd risk for venue nodes.
 */
export class RiskEngine {
  constructor(weights = {}) {
    this.wDensity = weights.wDensity ?? 0.40;
    this.wFlow = weights.wFlow ?? 0.20;
    this.wQueue = weights.wQueue ?? 0.15;
    this.wRoute = weights.wRoute ?? 0.15;
    this.wWeather = weights.wWeather ?? 0.10;
  }

  getSeverity(score) {
    if (score < 0.25) return RiskSeverity.SAFE;
    if (score < 0.50) return RiskSeverity.MODERATE;
    if (score < 0.75) return RiskSeverity.HIGH;
    return RiskSeverity.CRITICAL;
  }

  calculateNodeRisk(node, graph, queueEngine, weather) {
    if (!node) return { riskScore: 0, severity: RiskSeverity.SAFE };

    // 1. Density Ratio (0.0 to 1.0)
    const densityRatio = node.densityRatio || 0;

    // 2. Flow Pressure (incoming flow vs incoming capacities)
    let flowPressure = 0;
    if (graph) {
      const incomingEdges = graph.getIncomingEdges(node.id);
      let totalFlow = 0;
      let totalCapacity = 0;
      for (const edge of incomingEdges) {
        totalFlow += edge.currentFlowRate || 0;
        totalCapacity += edge.capacityPerMin || 1;
      }
      if (totalCapacity > 0) {
        flowPressure = Math.min(1.0, totalFlow / totalCapacity);
      }
    }

    // 3. Queue Pressure (0.0 to 1.0)
    const queuePressure = queueEngine ? queueEngine.getQueuePressure(node.id) : 0;

    // 4. Route Pressure (1.0 if any connected incoming/outgoing edge is blocked, else 0.0)
    let routePressure = 0;
    if (graph) {
      const connected = [...graph.getOutgoingEdges(node.id), ...graph.getIncomingEdges(node.id)];
      const blockedCount = connected.filter(e => e.isBlocked).length;
      if (connected.length > 0) {
        routePressure = Math.min(1.0, blockedCount / connected.length);
      }
    }

    // 5. Weather Impact (0.1 to 1.0)
    let weatherImpact = 0.1;
    if (weather) {
      switch (weather.condition) {
        case 'heavy_rain':
          weatherImpact = 1.0;
          break;
        case 'rain':
          weatherImpact = 0.75;
          break;
        case 'cloudy':
          weatherImpact = 0.25;
          break;
        case 'sunny':
        default:
          weatherImpact = 0.10;
          break;
      }
    }

    const rawScore = 
      this.wDensity * densityRatio +
      this.wFlow * flowPressure +
      this.wQueue * queuePressure +
      this.wRoute * routePressure +
      this.wWeather * weatherImpact;

    const riskScore = parseFloat(Math.min(1.0, Math.max(0.0, rawScore)).toFixed(4));
    const severity = this.getSeverity(riskScore);

    return {
      nodeId: node.id,
      riskScore,
      severity,
      breakdown: {
        densityRatio: parseFloat(densityRatio.toFixed(4)),
        flowPressure: parseFloat(flowPressure.toFixed(4)),
        queuePressure: parseFloat(queuePressure.toFixed(4)),
        routePressure: parseFloat(routePressure.toFixed(4)),
        weatherImpact: parseFloat(weatherImpact.toFixed(4))
      }
    };
  }

  calculateAllRisks(graph, queueEngine, weather) {
    if (!graph) return new Map();

    const results = new Map();
    const nodes = graph.getNodes();
    const exits = nodes.filter(n => n.type === 'exit');
    const allExitsClosed = exits.length > 0 && exits.every(n => n.isDisabled);

    for (const node of nodes) {
      const risk = this.calculateNodeRisk(node, graph, queueEngine, weather);
      
      // Evacuation Bottleneck: Raise risk score of active nodes if evacuations are blocked
      if (allExitsClosed && node.type !== 'exit' && !node.isDisabled) {
        risk.riskScore = parseFloat(Math.min(1.0, risk.riskScore + 0.35).toFixed(4));
        risk.severity = this.getSeverity(risk.riskScore);
        risk.breakdown.evacuationBlocked = 0.35;
      }

      // Disabled Node: Out of service, set risk score to 0
      if (node.isDisabled) {
        risk.riskScore = 0;
        risk.severity = RiskSeverity.SAFE;
      }

      results.set(node.id, risk);
    }
    return results;
  }
}
