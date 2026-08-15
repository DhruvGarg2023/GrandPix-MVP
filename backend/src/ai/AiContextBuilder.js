import crypto from 'crypto';

export class AiContextBuilder {
  /**
   * Compresses full simulation state into minimal AI context and returns a state hash.
   * Discards low-level agents, subsets data into buckets to prevent excessive AI triggers.
   */
  static buildContext(simState, risksPayload, predictionsMap) {
    if (!simState || !simState.nodes) return null;

    // Filter to only nodes that are high risk or have critical predictions
    const criticalNodes = [];
    
    simState.nodes.forEach(n => {
      const isHighRisk = n.riskSeverity === 'HIGH' || n.riskSeverity === 'CRITICAL';
      const prediction = predictionsMap ? predictionsMap.get(n.id) : null;
      const isPredictedCritical = prediction && prediction.predictedDensity10minRatio >= 0.85;

      if (isHighRisk || isPredictedCritical || n.queueLength > 250) {
        criticalNodes.push({
          zone: n.id,
          riskLevel: n.riskSeverity,
          densityBucket: this._bucketDensity(n.densityRatio),
          predictionBucket: prediction ? this._bucketDensity(prediction.predictedDensity10minRatio) : 'UNKNOWN',
          queueBucket: this._bucketQueue(n.queueLength || 0)
        });
      }
    });

    const activeIncidents = simState.incidents ? simState.incidents.map(i => i.type) : [];

    const context = {
      event: simState.activeEvent || 'UNKNOWN',
      weather: simState.weather?.condition || 'sunny',
      incidents: activeIncidents,
      criticalNodes
    };

    const hash = this._hashContext(context);
    return { context, hash };
  }

  static _bucketDensity(densityRatio) {
    if (densityRatio < 0.50) return 'LOW';
    if (densityRatio < 0.75) return 'MODERATE';
    if (densityRatio < 0.85) return 'HIGH';
    if (densityRatio < 0.95) return 'CRITICAL_LOW';
    return 'CRITICAL_HIGH';
  }

  static _bucketQueue(queueLength) {
    if (queueLength < 250) return 'LOW';
    if (queueLength < 500) return 'MODERATE';
    if (queueLength < 1000) return 'HIGH';
    return 'CRITICAL';
  }

  static _hashContext(context) {
    const str = JSON.stringify({
      e: context.event,
      w: context.weather,
      i: context.incidents,
      n: context.criticalNodes.map(n => `${n.zone}:${n.riskLevel}:${n.densityBucket}:${n.predictionBucket}:${n.queueBucket}`).sort()
    });
    return crypto.createHash('md5').update(str).digest('hex');
  }
}
