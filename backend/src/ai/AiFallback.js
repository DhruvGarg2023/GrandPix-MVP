export class AiFallback {
  static generateFallbackRecommendation(context) {
    if (!context || !context.criticalNodes || context.criticalNodes.length === 0) {
      return {
        title: "All Systems Normal",
        priority: "LOW",
        reasoning: "No critical bottlenecks detected.",
        actionType: "MAINTAIN_MONITORING",
        expectedImpact: "Maintain current operations.",
        isFallback: true
      };
    }

    // Sort by severity
    const sorted = [...context.criticalNodes].sort((a, b) => {
      if (a.riskLevel === 'CRITICAL' && b.riskLevel !== 'CRITICAL') return -1;
      if (b.riskLevel === 'CRITICAL' && a.riskLevel !== 'CRITICAL') return 1;
      return 0;
    });

    const primaryNode = sorted[0];

    if (primaryNode.riskLevel === 'CRITICAL') {
      if (primaryNode.predictionBucket === 'CRITICAL_HIGH') {
        return {
          title: "Critical Congestion Predicted",
          priority: "CRITICAL",
          reasoning: `Zone ${primaryNode.zone} is currently at CRITICAL risk and predicted to exceed capacity.`,
          actionType: "REROUTE_CROWD",
          expectedImpact: "Divert incoming crowd to alternate routes immediately to prevent crush.",
          isFallback: true
        };
      }
      return {
        title: "Severe Bottleneck Detected",
        priority: "CRITICAL",
        reasoning: `Zone ${primaryNode.zone} is at CRITICAL risk level with elevated density.`,
        actionType: "DEPLOY_STAFF",
        expectedImpact: "Staff deployment will help manage queues and control flow.",
        isFallback: true
      };
    }

    if (primaryNode.riskLevel === 'HIGH') {
      return {
        title: "High Risk Area Emerging",
        priority: "HIGH",
        reasoning: `Zone ${primaryNode.zone} is showing HIGH risk due to rising density.`,
        actionType: "MONITOR_AND_REDIRECT",
        expectedImpact: "Preventative redirection will mitigate further buildup.",
        isFallback: true
      };
    }

    return {
      title: "Routine Monitoring",
      priority: "MODERATE",
      reasoning: `Zone ${primaryNode.zone} has slightly elevated metrics.`,
      actionType: "MAINTAIN_MONITORING",
      expectedImpact: "Keep observation on CCTV.",
      isFallback: true
    };
  }
}
