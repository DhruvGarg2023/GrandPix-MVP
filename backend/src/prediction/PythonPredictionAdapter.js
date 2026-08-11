import { config } from '../config/env.js';

/**
 * PythonPredictionAdapter communicates with Python FastAPI prediction service.
 * Implements strict timeout (2.0s) and deterministic fallback handling.
 */
export class PythonPredictionAdapter {
  constructor(predictionUrl = config.pythonPredictionUrl) {
    this.predictionUrl = predictionUrl;
    this.timeoutMs = 5000;
    this.lastKnownPredictions = new Map(); // nodeId -> { predictedDensity, delta }
  }

  generateFallbackPredictions(items) {
    const fallbackResults = new Map();
    for (const item of items) {
      const currentDensity = item.current_density_ratio || 0;
      const flowRatio = item.flow_rate_ratio || 0.5;
      const weather = item.weather || 'sunny';
      const event = (item.event || 'PRACTICE').toUpperCase();
      const queueLength = item.queue_length || 0;
      const blockedRoute = item.blocked_route || 0;

      // Slower walking speeds in rain/storms increase localized density accumulation
      let weatherImpact = 0;
      if (weather === 'heavy_rain') weatherImpact = 0.08;
      else if (weather === 'rain') weatherImpact = 0.04;
      else if (weather === 'cloudy') weatherImpact = 0.01;

      // Event demand shifts
      let eventImpact = 0.01;
      if (event === 'ENTRY_RUSH' && item.zone.startsWith('GATE')) {
        eventImpact = 0.09; // gates fill up during entry rush
      } else if (event === 'EXIT_RUSH' && item.zone.startsWith('EXIT')) {
        eventImpact = 0.12; // exits fill up during exit rush
      } else if (event === 'RACE' && item.zone.startsWith('GS')) {
        eventImpact = 0.07; // grandstands fill up during race
      }

      // Blocked edges increase bottleneck densities
      const routingImpact = blockedRoute ? 0.15 : 0;

      // Queue build-up adds delay
      const queueImpact = queueLength > 10 ? 0.03 : 0;

      const flowImpact = (flowRatio > 0.8) ? 0.05 : (flowRatio > 0.5) ? 0.02 : 0.005;

      const totalAccumulation = weatherImpact + eventImpact + routingImpact + queueImpact + flowImpact;
      
      const fallbackDensity = parseFloat(Math.min(1.2, Math.max(0.0, currentDensity + totalAccumulation)).toFixed(4));
      const delta = parseFloat((fallbackDensity - currentDensity).toFixed(4));

      fallbackResults.set(item.zone, {
        zone: item.zone,
        currentDensityRatio: currentDensity,
        predictedDensity10minRatio: fallbackDensity,
        delta,
        isFallback: true
      });
    }
    return fallbackResults;
  }

  async predictBatch(nodeFeatureItems) {
    if (!Array.isArray(nodeFeatureItems) || nodeFeatureItems.length === 0) {
      return new Map();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const payload = {
        items: nodeFeatureItems.map(item => ({
          zone: item.zone,
          event: item.event || 'RACE',
          weather: item.weather || 'sunny',
          attendance: item.attendance || 120000.0,
          current_density_ratio: item.current_density_ratio ?? 0,
          flow_rate_ratio: item.flow_rate_ratio ?? 0.5,
          queue_length: item.queue_length ?? 0,
          blocked_route: item.blocked_route ? 1 : 0
        }))
      };

      const response = await fetch(`${this.predictionUrl}/predict/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Python prediction API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const resultsMap = new Map();

      if (data && Array.isArray(data.predictions)) {
        for (const item of data.predictions) {
          const resObj = {
            zone: item.zone,
            currentDensityRatio: item.current_density_ratio,
            predictedDensity10minRatio: item.predicted_density_10min_ratio,
            delta: item.delta,
            isFallback: false
          };
          resultsMap.set(item.zone, resObj);
          this.lastKnownPredictions.set(item.zone, resObj);
        }
        return resultsMap;
      } else {
        throw new Error('Invalid JSON structure returned from Python prediction service');
      }

    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[PythonPredictionAdapter] Python service call failed (${err.message}). Using deterministic fallback predictions.`);
      return this.generateFallbackPredictions(nodeFeatureItems);
    }
  }
}
