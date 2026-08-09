import { config } from '../config/env.js';

/**
 * PythonPredictionAdapter communicates with Python FastAPI prediction service.
 * Implements strict timeout (2.0s) and deterministic fallback handling.
 */
export class PythonPredictionAdapter {
  constructor(predictionUrl = config.pythonPredictionUrl) {
    this.predictionUrl = predictionUrl;
    this.timeoutMs = 2000;
    this.lastKnownPredictions = new Map(); // nodeId -> { predictedDensity, delta }
  }

  generateFallbackPredictions(items) {
    const fallbackResults = new Map();
    for (const item of items) {
      const currentDensity = item.current_density_ratio || 0;
      const flowRatio = item.flow_rate_ratio || 0.5;
      
      // Extrapolate slight trend based on flow pressure
      const trend = (flowRatio > 0.8) ? 0.08 : (flowRatio > 0.5) ? 0.04 : 0.01;
      const fallbackDensity = parseFloat(Math.min(1.2, Math.max(0.0, currentDensity + trend)).toFixed(4));
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
