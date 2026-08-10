/**
 * CandidateActionGenerator analyzes simulation facts and identifies candidate operational actions.
 */
export class CandidateActionGenerator {
  generateCandidateActions(simulationState, risksMap, predictionsMap) {
    const nodes = simulationState.nodes || [];
    const highRiskNodes = nodes.filter(n => (n.riskScore >= 0.50 || n.riskSeverity === 'HIGH' || n.riskSeverity === 'CRITICAL'))
                               .sort((a, b) => b.riskScore - a.riskScore);

    if (highRiskNodes.length === 0) {
      return [{
        actionType: 'MAINTAIN_MONITORING',
        targetNode: 'VENUE',
        priority: 'LOW',
        title: 'Maintain Standard Crowd Monitoring',
        facts: {
          simTime: simulationState.simTime,
          weather: simulationState.weather?.condition || 'sunny',
          highestRiskScore: nodes.length > 0 ? Math.max(...nodes.map(n => n.riskScore)) : 0
        }
      }];
    }

    const primaryRiskNode = highRiskNodes[0];
    const prediction = predictionsMap ? predictionsMap.get(primaryRiskNode.id) : null;
    const predictedDensity = prediction ? prediction.predictedDensity10minRatio : primaryRiskNode.densityRatio;

    const blockedEdges = (simulationState.edges || []).filter(e => e.isBlocked);

    let actionType = 'REROUTE_CROWD';
    let title = `Reroute Spectators around ${primaryRiskNode.id}`;
    let suggestedEdge = null;
    let suggestedAlternate = 'EXIT_S';

    if (primaryRiskNode.id.startsWith('GS_')) {
      if (blockedEdges.length > 0) {
        suggestedEdge = blockedEdges[0].id;
        actionType = 'REROUTE_CROWD';
        title = `Reroute ${primaryRiskNode.id} Crowd via Alternate Exit Pathways`;
      } else {
        actionType = 'DEPLOY_STAFF';
        title = `Deploy Crowd Safety Marshals to ${primaryRiskNode.id}`;
      }
    } else if (primaryRiskNode.id.startsWith('FOOD_') || primaryRiskNode.id === 'MERCH') {
      actionType = 'REDIRECT_TO_ALTERNATE_FACILITY';
      title = `Redirect Spectators to Secondary Concessions from ${primaryRiskNode.id}`;
    }

    return [{
      actionType,
      targetNode: primaryRiskNode.id,
      priority: primaryRiskNode.riskScore >= 0.75 ? 'CRITICAL' : 'HIGH',
      title,
      suggestedEdge,
      suggestedAlternate,
      facts: {
        simTime: simulationState.simTime,
        activeEvent: simulationState.activeEvent,
        weather: simulationState.weather?.condition || 'sunny',
        currentDensityRatio: primaryRiskNode.densityRatio,
        predictedDensity10minRatio: predictedDensity,
        riskScore: primaryRiskNode.riskScore,
        riskSeverity: primaryRiskNode.riskSeverity,
        queueLength: primaryRiskNode.queueLength || 0,
        blockedEdgesCount: blockedEdges.length
      }
    }];
  }
}
