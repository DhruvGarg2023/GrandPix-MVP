import { Server } from 'socket.io';
import { config } from '../config/env.js';

/**
 * SocketGateway handles real-time Socket.IO communication and aggregated broadcasting.
 */
export class SocketGateway {
  constructor(httpServer, simEngine, predictionAdapter) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.simEngine = simEngine;
    this.predictionAdapter = predictionAdapter;
    this.connectedClientsCount = 0;
    this.tickInterval = null;
    this.tickCounter = 0;

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
    this.tickInterval = setInterval(async () => {
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

        this.tickCounter++;
        // Fetch ML predictions every tick
        if (this.predictionAdapter) {
          const featureItems = simState.nodes.map(n => ({
            zone: n.id,
            event: simState.activeEvent,
            weather: simState.weather?.condition || 'sunny',
            attendance: 120000.0,
            current_density_ratio: n.densityRatio,
            flow_rate_ratio: 0.5,
            queue_length: n.queueLength || 0,
            blocked_route: 0
          }));
          
          try {
            const predictionsMap = await this.predictionAdapter.predictBatch(featureItems);
            let predictions = Array.from(predictionsMap.values());
            
            // Sort by highest predicted density
            predictions.sort((a, b) => b.predictedDensity10minRatio - a.predictedDensity10minRatio);
            
            // Format for the frontend PredictionTimelineWidget which expects { nodeId, currentDensity, predictedDensity10min, delta }
            const formattedPredictions = predictions.map(p => ({
              nodeId: p.zone,
              currentDensity: p.currentDensityRatio,
              predictedDensity10min: p.predictedDensity10minRatio,
              delta: p.delta
            }));

            this.broadcastPredictionUpdate({
              simulationId: simState.simulationId,
              timestamp: simState.simTime || new Date().toISOString(),
              predictions: formattedPredictions
            });
          } catch (err) {
            console.error('[SocketGateway] ML Prediction fetch failed:', err);
          }
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
