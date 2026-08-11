import { AgentStatus } from '../models/Agent.js';

/**
 * QueueEngine manages facility service queues and wait time calculations.
 */
export class QueueEngine {
  constructor(queueServiceMetadata = {}) {
    this.services = new Map(); // nodeId -> { serviceRatePerMin, queueCapacity, queue: [] }

    for (const [nodeId, spec] of Object.entries(queueServiceMetadata)) {
      this.services.set(nodeId, {
        nodeId,
        serviceRatePerMin: spec.service_rate_per_min || 100,
        queueCapacity: spec.queue_capacity || 1000,
        queue: [],
        accumulatedServiceProgress: 0
      });
    }
  }

  isQueueFacility(nodeId) {
    return this.services.has(nodeId);
  }

  getQueueLength(nodeId) {
    const service = this.services.get(nodeId);
    return service ? service.queue.length : 0;
  }

  getQueueCapacity(nodeId) {
    const service = this.services.get(nodeId);
    return service ? service.queueCapacity : 0;
  }

  getQueuePressure(nodeId) {
    const service = this.services.get(nodeId);
    if (!service || service.queueCapacity <= 0) return 0;
    return Math.min(1.0, service.queue.length / service.queueCapacity);
  }

  getWaitTimeMinutes(nodeId) {
    const service = this.services.get(nodeId);
    if (!service || service.serviceRatePerMin <= 0) return 0;
    return parseFloat((service.queue.length / service.serviceRatePerMin).toFixed(2));
  }

  enqueue(nodeId, agent) {
    const service = this.services.get(nodeId);
    if (!service) return false;

    if (service.queue.length < service.queueCapacity) {
      service.queue.push(agent);
      agent.status = AgentStatus.QUEUED;
      return true;
    }

    return false; // Queue full
  }

  clearQueue(nodeId) {
    const service = this.services.get(nodeId);
    if (service) {
      service.queue = [];
      service.accumulatedServiceProgress = 0;
    }
  }

  processTick(tickSeconds, graph) {
    const servicedAgents = [];

    for (const service of this.services.values()) {
      if (service.queue.length === 0) continue;

      const ratePerSecond = service.serviceRatePerMin / 60;
      service.accumulatedServiceProgress += ratePerSecond * tickSeconds;

      const countToProcess = Math.floor(service.accumulatedServiceProgress);
      service.accumulatedServiceProgress -= countToProcess;

      const actualProcessCount = Math.min(countToProcess, service.queue.length);

      for (let i = 0; i < actualProcessCount; i++) {
        const agent = service.queue.shift();
        if (agent) {
          agent.status = AgentStatus.ARRIVED;
          servicedAgents.push(agent);
        }
      }
    }

    return servicedAgents;
  }

  toJSON() {
    const result = {};
    for (const [nodeId, service] of this.services.entries()) {
      result[nodeId] = {
        queueLength: service.queue.length,
        queueCapacity: service.queueCapacity,
        serviceRatePerMin: service.serviceRatePerMin,
        waitTimeMin: this.getWaitTimeMinutes(nodeId),
        queuePressure: parseFloat(this.getQueuePressure(nodeId).toFixed(4))
      };
    }
    return result;
  }
}
