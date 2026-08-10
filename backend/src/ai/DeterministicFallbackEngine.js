/**
 * DeterministicFallbackEngine generates validated operational recommendations when HF API is unconfigured or unavailable.
 */
export class DeterministicFallbackEngine {
  generateFallbackRecommendation(candidateAction, reason = 'Deterministic rule-based engine execution.') {
    const facts = candidateAction.facts || {};
    const target = candidateAction.targetNode || 'VENUE';
    const actionType = candidateAction.actionType || 'MAINTAIN_MONITORING';
    const priority = candidateAction.priority || 'LOW';

    let reasoning = '';

    if (actionType === 'MAINTAIN_MONITORING') {
      reasoning = `Venue crowd operations are running within safe parameters (Sim Time: ${facts.simTime || 'N/A'}, Highest Risk: ${facts.highestRiskScore ? (facts.highestRiskScore * 100).toFixed(1) + '%' : 'Safe'}). Continue standard monitoring.`;
    } else {
      const currentDensityPct = facts.currentDensityRatio ? (facts.currentDensityRatio * 100).toFixed(1) : 'N/A';
      const predDensityPct = facts.predictedDensity10minRatio ? (facts.predictedDensity10minRatio * 100).toFixed(1) : 'N/A';
      const riskPct = facts.riskScore ? (facts.riskScore * 100).toFixed(1) : 'N/A';
      const weatherStr = facts.weather || 'normal';

      reasoning = `DETERMINISTIC ACTION: Elevated ${facts.riskSeverity || 'HIGH'} risk (${riskPct}%) detected at ${target}. Current density is ${currentDensityPct}%, projected to reach ${predDensityPct}% within 10 minutes under ${weatherStr} conditions. Enforcing ${actionType} mitigation strategy immediately.`;
    }

    return {
      id: `rec_${Date.now()}`,
      timestamp: facts.simTime || new Date().toISOString(),
      actionType,
      targetNode: target,
      priority,
      title: candidateAction.title || `Operational Mitigation for ${target}`,
      reasoning,
      isFallback: true,
      fallbackReason: reason
    };
  }
}
