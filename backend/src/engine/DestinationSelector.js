/**
 * DestinationSelector computes agent destination probabilities based on persona and active F1 schedule event.
 */
export class DestinationSelector {
  constructor(metadata, rng) {
    this.personaProbs = metadata.destinationProbabilities || {};
    this.eventProbs = metadata.eventDestinationProbabilities || {};
    this.rng = rng;
  }

  selectDestination(persona, activeEvent) {
    const personaMap = this.personaProbs[persona] || {};
    const eventMap = this.eventProbs[activeEvent] || {};

    const blendedProbs = {};

    // Combine event & persona weights (70% event impact during key schedule events, 30% persona preference)
    const eventWeight = 0.7;
    const personaWeight = 0.3;

    if (Object.keys(eventMap).length > 0) {
      for (const [nodeId, prob] of Object.entries(eventMap)) {
        blendedProbs[nodeId] = (blendedProbs[nodeId] || 0) + prob * eventWeight;
      }
      for (const [nodeId, prob] of Object.entries(personaMap)) {
        blendedProbs[nodeId] = (blendedProbs[nodeId] || 0) + prob * personaWeight;
      }
    } else {
      // Fallback to pure persona probabilities
      for (const [nodeId, prob] of Object.entries(personaMap)) {
        blendedProbs[nodeId] = prob;
      }
    }

    const picked = this.rng.weightedPick(blendedProbs);
    return picked || 'FAN_ZONE';
  }
}
