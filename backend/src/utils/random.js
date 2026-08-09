/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Ensures reproducible crowd simulation runs across demo scenarios.
 */
export class SeededRNG {
  constructor(seed = 42) {
    this.seed = seed;
  }

  // Returns float in range [0, 1)
  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Pick item from object probabilities { ITEM_A: 0.3, ITEM_B: 0.7 }
  weightedPick(probabilitiesMap) {
    const entries = Object.entries(probabilitiesMap);
    if (entries.length === 0) return null;

    let totalSum = 0;
    for (const [, weight] of entries) {
      totalSum += weight;
    }

    let roll = this.next() * totalSum;
    for (const [key, weight] of entries) {
      if (roll < weight) {
        return key;
      }
      roll -= weight;
    }

    return entries[entries.length - 1][0];
  }
}
