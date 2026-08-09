/**
 * Agent domain model representing an F1 spectator in the circuit simulation.
 */
export const AgentStatus = {
  WAITING: 'waiting',
  WALKING: 'walking',
  QUEUED: 'queued',
  ARRIVED: 'arrived',
  EXITING: 'exiting'
};

export class Agent {
  constructor({ id, persona, entryGate, initialDestination, speedMps, patience, groupSize }) {
    this.id = id;
    this.persona = persona;
    this.entryGate = entryGate;
    this.currentNode = entryGate;
    this.destination = initialDestination;
    this.speedMps = speedMps;
    this.patience = patience;
    this.groupSize = groupSize || 1;
    this.route = []; // Array of Node IDs representing path
    this.routeIndex = 0;
    this.distanceWalkedOnCurrentEdge = 0;
    
    this.status = (this.currentNode === this.destination) 
      ? AgentStatus.ARRIVED 
      : AgentStatus.WAITING;
  }

  get initialDestination() {
    return this.destination;
  }

  setRoute(newRoute) {
    this.route = newRoute || [];
    this.routeIndex = 0;
    this.distanceWalkedOnCurrentEdge = 0;
    if (this.route.length > 0) {
      this.status = AgentStatus.WALKING;
    }
  }

  getNextNode() {
    if (this.routeIndex + 1 < this.route.length) {
      return this.route[this.routeIndex + 1];
    }
    return null;
  }

  advanceToNextNode() {
    if (this.routeIndex + 1 < this.route.length) {
      this.routeIndex += 1;
      this.currentNode = this.route[this.routeIndex];
      this.distanceWalkedOnCurrentEdge = 0;

      if (this.currentNode === this.destination) {
        this.status = AgentStatus.ARRIVED;
      }
      return true;
    }
    return false;
  }

  toJSON() {
    return {
      id: this.id,
      persona: this.persona,
      entryGate: this.entryGate,
      currentNode: this.currentNode,
      destination: this.destination,
      speedMps: this.speedMps,
      patience: this.patience,
      groupSize: this.groupSize,
      route: this.route,
      routeIndex: this.routeIndex,
      status: this.status
    };
  }
}
