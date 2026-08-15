'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  subscribeToSimulationTicks,
  subscribeToRecommendations,
  subscribeToRisks,
  subscribeToPredictions,
  subscribeToConnectionStatus
} from '@/lib/socket';
import { SimulationTickPayload, RecommendationPayload, RiskSummaryPayload, PredictionPayload, IncidentPayload } from '@/types';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SimulationToolbar from '@/components/dashboard/SimulationToolbar';
import MapContainerShell from '@/components/dashboard/MapContainerShell';
import RiskSummaryWidget from '@/components/dashboard/RiskSummaryWidget';
import AICopilotWidget from '@/components/dashboard/AICopilotWidget';
import PredictionTimelineWidget from '@/components/dashboard/PredictionTimelineWidget';
import IncidentControlPanel from '@/components/dashboard/IncidentControlPanel';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [simulationState, setSimulationState] = useState<SimulationTickPayload | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationPayload | null>(null);
  const [riskSummary, setRiskSummary] = useState<RiskSummaryPayload | null>(null);
  const [predictions, setPredictions] = useState<PredictionPayload | null>(null);
  const [activeIncident, setActiveIncident] = useState<IncidentPayload | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch full simulation state snapshot from backend REST endpoints
  const refreshSimulationSnapshot = useCallback(async () => {
    try {
      const state = await api.getSimulationState();
      setSimulationState(state);
      setIsConnected(true);
      setError(null);

      const risks = await api.getRisks();
      setRiskSummary(risks);

      const preds = await api.getPredictions();
      setPredictions(preds);
    } catch (err: any) {
      console.warn('Backend connection fallback:', err.message);
      setError(err.message || 'Failed to connect to backend server');
      setIsConnected(false);
    }
  }, []);

  // Initial Data Fetch & Real-Time Socket.IO Event Subscriptions
  useEffect(() => {
    refreshSimulationSnapshot();

    // Subscribe to Socket.IO live simulation:tick channel
    const unsubTick = subscribeToSimulationTicks((tickData) => {
      setSimulationState(tickData);
      setIsConnected(true);
      setError(null);
    });

    const unsubRec = subscribeToRecommendations((recData) => {
      setRecommendation(recData);
    });

    const unsubRisk = subscribeToRisks((riskData) => {
      setRiskSummary(riskData);
    });

    const unsubPred = subscribeToPredictions((predData) => {
      setPredictions(predData);
    });

    const unsubConn = subscribeToConnectionStatus(
      () => {
        setIsConnected(true);
        setError(null);
        refreshSimulationSnapshot();
      },
      () => {
        setIsConnected(false);
      }
    );

    return () => {
      unsubTick();
      unsubRec();
      unsubRisk();
      unsubPred();
      unsubConn();
    };
  }, [refreshSimulationSnapshot]);

  // Real-Time Simulation Control Action Handlers
  const handleStart = async () => {
    try {
      await api.startSimulation();
      setIsRunning(true);
      setError(null);
    } catch (err: any) {
      console.error('Failed to start simulation:', err);
      setError(err.message || 'Failed to start simulation');
    }
  };

  const handlePause = async () => {
    try {
      await api.pauseSimulation();
      setIsRunning(false);
    } catch (err: any) {
      console.error('Failed to pause simulation:', err);
    }
  };

  const handleReset = async () => {
    try {
      const res = await api.resetSimulation();
      if (res.state) {
        setSimulationState(res.state);
      }
      setIsRunning(false);
      setActiveIncident(null);
      setSelectedNodeId(null);
      setError(null);
      refreshSimulationSnapshot();
    } catch (err: any) {
      console.error('Failed to reset simulation:', err);
    }
  };

  const handleApplyReroute = async (rec: RecommendationPayload) => {
    if (rec.recommendedEdgeToBlock) {
      try {
        const incident: IncidentPayload = {
          time: simulationState?.simTime || '16:20',
          type: 'route_closure',
          edge_id: rec.recommendedEdgeToBlock,
        };
        await api.triggerIncident('sim_default', incident);
        setActiveIncident(incident);
      } catch (err: any) {
        console.error('Failed to apply reroute incident:', err);
      }
    }
  };

  const handleManualIncident = async (payload: IncidentPayload) => {
    try {
      const incident = {
        ...payload,
        time: simulationState?.simTime || '16:20',
      };
      await api.triggerIncident('sim_default', incident);
      setActiveIncident(incident);
    } catch (err: any) {
      console.error('Failed to trigger manual incident:', err);
    }
  };

  const handleResolveIncident = async (payload: Partial<IncidentPayload>) => {
    try {
      await api.resolveIncident('sim_default', payload);
      setActiveIncident(null);
    } catch (err: any) {
      console.error('Failed to resolve manual incident:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top F1 Race Control Header */}
      <DashboardHeader
        circuitName="SILVERSTONE CIRCUIT"
        simTime={simulationState?.simTime || '16:20'}
        activeEvent={simulationState?.activeEvent || 'PRACTICE'}
        weather={simulationState?.weather || { condition: 'sunny', intensity: 0.1 }}
        isConnected={isConnected}
      />

      {/* Real-time Simulation Controls Toolbar */}
      <SimulationToolbar
        isRunning={isRunning}
        tickNumber={simulationState?.tick || 0}
        speedMultiplier={speedMultiplier}
        onStart={handleStart}
        onPause={handlePause}
        onReset={handleReset}
        onSpeedChange={(spd) => {
          setSpeedMultiplier(spd);
          api.setSimulationSpeed('sim_default', spd).catch(err => console.error(err));
        }}
      />

      {/* Backend Offline Error Notification */}
      {error && !isConnected && (
        <div className="bg-red-950/90 border border-red-600 text-red-100 p-4 rounded-xl text-xs font-mono flex items-center justify-between shadow-[0_0_20px_rgba(225,6,0,0.3)]">
          <div>
            <strong className="text-red-400 uppercase">⚠️ Backend Gateway Offline:</strong> {error}
            <div className="text-[11px] text-red-300/80 mt-0.5">Ensure backend server is running on <code className="bg-red-900/60 px-1 py-0.5 rounded text-white">http://localhost:5000</code>.</div>
          </div>
          <button
            onClick={() => refreshSimulationSnapshot()}
            className="f1-btn-pill-red px-3 py-1.5 text-[11px]"
          >
            RETRY CONNECTION
          </button>
        </div>
      )}

      {/* Main 3-Column Dashboard Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Interactive Circuit Map Canvas */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.5 }}
          className="lg:col-span-2 space-y-6"
        >
          <MapContainerShell
            nodes={simulationState?.nodes || []}
            edges={simulationState?.edges || []}
            nodesCount={simulationState?.nodes?.length || 18}
            edgesCount={simulationState?.edges?.length || 23}
            activeAgents={simulationState?.agentsSummary?.total || 2000}
            activeIncident={activeIncident}
            onNodeSelect={(id) => setSelectedNodeId(id)}
          />
          
          {/* Milestone 6: Manual Incident Controls */}
          <IncidentControlPanel 
            onTriggerIncident={handleManualIncident} 
            onResolveIncident={handleResolveIncident}
            disabled={!isConnected}
          />
        </motion.div>

        {/* Right Column (1 Col): Risk Summary, AI Copilot, and Predictions Panels */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.5, staggerChildren: 0.1 }}
          className="space-y-6"
        >
          {/* Multi-Factor Venue Risk Widget */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <RiskSummaryWidget
              score={riskSummary?.nodes?.[0]?.riskScore || 0.18}
              severity={riskSummary?.nodes?.[0]?.riskSeverity || 'SAFE'}
              highestRiskNode={riskSummary?.highestRiskNode}
              highRiskCount={riskSummary?.highRiskCount || 0}
              criticalCount={riskSummary?.criticalCount || 0}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <AICopilotWidget
              recommendation={recommendation}
              onApplyAction={handleApplyReroute}
              onManualAnalyze={async () => {
                try {
                  const rec = await api.getAICopilotRecommendation();
                  setRecommendation(rec);
                } catch (err) {
                  console.error('Failed to get manual AI recommendation:', err);
                }
              }}
            />
          </motion.div>

          {/* 10-Min ML Density Forecast Timeline */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
            <PredictionTimelineWidget
              predictions={predictions?.predictions}
              lastUpdated={simulationState?.simTime}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
