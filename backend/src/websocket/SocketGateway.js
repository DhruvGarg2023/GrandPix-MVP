import { Server } from 'socket.io';
import { config } from '../config/env.js';

/**
 * SocketGateway handles real-time Socket.IO communication and aggregated broadcasting.
 */
export class SocketGateway {
  constructor(httpServer, simEngine) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.simEngine = simEngine;
    this.connectedClientsCount = 0;
    this.tickInterval = null;

    this._setupSocketEvents();
    this.startTickLoop(config.simulationTickMs || 2000);
  }

  _setupSocketEvents() {
    this.io.on('connection', (socket) => {
      this.connectedClientsCount += 1;
      console.log(`[SocketGateway] Client connected (${socket.id}). Total connected: ${this.connectedClientsCount}`);

      // Send initial aggregated simulation state upon connection
      if (this.simEngine) {
        socket.emit('simulation:tick', this.simEngine.getState());
      }

      socket.on('simulation:request_state', () => {
        if (this.simEngine) {
          socket.emit('simulation:tick', this.simEngine.getState());
        }
      });

      socket.on('disconnect', (reason) => {
        this.connectedClientsCount = Math.max(0, this.connectedClientsCount - 1);
        console.log(`[SocketGateway] Client disconnected (${socket.id}). Reason: ${reason}`);
      });
    });
  }

  startTickLoop(intervalMs = 2000) {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => {
      if (this.simEngine && this.simEngine.isRunning) {
        const simState = this.simEngine.tick();
        this.broadcastTick(simState);

        if (simState && simState.nodes) {
          const highRiskNodes = simState.nodes.filter(
            n => n.riskScore >= 0.50 || n.riskSeverity === 'HIGH' || n.riskSeverity === 'CRITICAL'
          );
          const risksPayload = {
            simulationId: simState.simulationId,
            timestamp: new Date().toISOString(),
            highRiskCount: highRiskNodes.length,
            nodes: simState.nodes.map(n => ({
              id: n.id,
              type: n.type,
              currentOccupancy: n.currentOccupancy,
              capacity: n.capacity,
              densityRatio: n.densityRatio,
              riskScore: n.riskScore,
              riskSeverity: n.riskSeverity,
              riskBreakdown: n.riskBreakdown
            }))
          };
          this.broadcastRiskUpdate(risksPayload);
        }
      }
    }, intervalMs);
  }

  stopTickLoop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  // Broadcast Channels

  broadcastTick(simState) {
    this.io.emit('simulation:tick', simState);
  }

  broadcastRiskUpdate(risksPayload) {
    this.io.emit('risk:updated', risksPayload);
  }

  broadcastPredictionUpdate(predictionsPayload) {
    this.io.emit('prediction:updated', predictionsPayload);
  }

  broadcastRecommendation(recommendationPayload) {
    this.io.emit('recommendation:new', recommendationPayload);
  }

  broadcastIncident(incidentPayload) {
    this.io.emit('incident:created', incidentPayload);
  }

  close() {
    this.stopTickLoop();
    return new Promise((resolve) => {
      this.io.close(() => {
        console.log('[SocketGateway] Server closed.');
        resolve();
      });
    });
  }
}
