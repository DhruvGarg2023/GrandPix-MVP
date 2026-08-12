// Socket.IO Real-time WebSocket Client for F1 Crowd Intelligence Platform

import { io, Socket } from 'socket.io-client';
import {
  SimulationTickPayload,
  PredictionPayload,
  RecommendationPayload,
  IncidentPayload,
  RiskSummaryPayload
} from '../types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to Race Control Backend gateway:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket.IO] Disconnected from gateway:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message);
    });
  }

  return socket;
}

export function isSocketConnected(): boolean {
  return socket ? socket.connected : false;
}

export function subscribeToConnectionStatus(
  onConnect: () => void,
  onDisconnect: () => void
): () => void {
  const s = getSocket();
  s.on('connect', onConnect);
  s.on('disconnect', onDisconnect);
  return () => {
    s.off('connect', onConnect);
    s.off('disconnect', onDisconnect);
  };
}

export function subscribeToSimulationTicks(callback: (tickData: SimulationTickPayload) => void): () => void {
  const s = getSocket();
  s.on('simulation:tick', callback);
  return () => {
    s.off('simulation:tick', callback);
  };
}

export function subscribeToPredictions(callback: (predictionData: PredictionPayload) => void): () => void {
  const s = getSocket();
  s.on('prediction:updated', callback);
  return () => {
    s.off('prediction:updated', callback);
  };
}

export function subscribeToRisks(callback: (riskData: RiskSummaryPayload) => void): () => void {
  const s = getSocket();
  s.on('risk:updated', callback);
  return () => {
    s.off('risk:updated', callback);
  };
}

export function subscribeToRecommendations(callback: (recommendation: RecommendationPayload) => void): () => void {
  const s = getSocket();
  s.on('recommendation:new', callback);
  return () => {
    s.off('recommendation:new', callback);
  };
}

export function subscribeToIncidents(callback: (incident: IncidentPayload) => void): () => void {
  const s = getSocket();
  s.on('incident:created', callback);
  return () => {
    s.off('incident:created', callback);
  };
}
