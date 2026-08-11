/**
 * Node domain model representing circuit locations (gates, grandstands, fan zones, food, exits, transport).
 */
export class Node {
  constructor({ id, type, capacity }) {
    this.id = id;
    this.type = type;
    this.capacity = capacity;
    this.currentOccupancy = 0;
    this.isDisabled = false;
  }

  get densityRatio() {
    if (!this.capacity || this.capacity <= 0) return 0;
    return Math.min(1.0, this.currentOccupancy / this.capacity);
  }

  setOccupancy(count) {
    this.currentOccupancy = Math.max(0, count);
  }

  addOccupancy(count = 1) {
    this.currentOccupancy += count;
  }

  removeOccupancy(count = 1) {
    this.currentOccupancy = Math.max(0, this.currentOccupancy - count);
  }

  disable() {
    this.isDisabled = true;
  }

  enable() {
    this.isDisabled = false;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      capacity: this.capacity,
      currentOccupancy: this.currentOccupancy,
      densityRatio: parseFloat(this.densityRatio.toFixed(4)),
      isDisabled: this.isDisabled
    };
  }
}
