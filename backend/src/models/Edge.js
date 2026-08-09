/**
 * Edge domain model representing walking pathways between circuit nodes.
 */
export class Edge {
  constructor({ id, from, to, distance_m, capacity_per_min }) {
    this.id = id;
    this.from = from;
    this.to = to;
    this.distanceM = distance_m;
    this.capacityPerMin = capacity_per_min;
    this.isBlocked = false;
    this.currentFlowRate = 0; // agents per minute
  }

  block() {
    this.isBlocked = true;
  }

  unblock() {
    this.isBlocked = false;
  }

  isTraversable() {
    return !this.isBlocked;
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      distanceM: this.distanceM,
      capacityPerMin: this.capacityPerMin,
      isBlocked: this.isBlocked,
      currentFlowRate: this.currentFlowRate
    };
  }
}
