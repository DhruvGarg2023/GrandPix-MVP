import { CandidateActionGenerator } from './CandidateActionGenerator.js';
import { HuggingFaceAdapter } from './HuggingFaceAdapter.js';

/**
 * RecommendationService coordinates candidate action generation and HF/Fallback reasoning.
 */
export class RecommendationService {
  constructor(hfAdapter = null) {
    this.actionGenerator = new CandidateActionGenerator();
    this.hfAdapter = hfAdapter || new HuggingFaceAdapter();
  }

  async getRecommendation(simulationState, risksMap, predictionsMap) {
    const candidateActions = this.actionGenerator.generateCandidateActions(simulationState, risksMap, predictionsMap);
    const primaryCandidate = candidateActions[0];

    const recommendation = await this.hfAdapter.generateRecommendation(primaryCandidate);
    return {
      recommendation,
      candidateActions
    };
  }
}
