'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { subscribeToSimulationTicks, subscribeToRecommendations, subscribeToRisks, subscribeToPredictions } from '@/lib/socket';
import { SimulationTickPayload, RecommendationPayload, RiskSummaryPayload, PredictionPayload, IncidentPayload } from '@/types';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SimulationToolbar from '@/components/dashboard/SimulationToolbar';
import MapContainerShell from '@/components/dashboard/MapContainerShell';
import RiskSummaryWidget from '@/components/dashboard/RiskSummaryWidget';
import AICopilotWidget from '@/components/dashboard/AICopilotWidget';
import PredictionTimelineWidget from '@/components/dashboard/PredictionTimelineWidget';

export default function DashboardPage() {
  const router = useRouter();
  const [simulationState, setSimulationState] = useState<SimulationTickPayload | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationPayload | null>(null);
  const [riskSummary, setRiskSummary] = useState<RiskSummaryPayload | null>(null);
  const [predictions, setPredictions] = useState<PredictionPayload | null>(null);
  const [activeIncident, setActiveIncident] = useState<IncidentPayload | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Custom Dataset Importer states
  const [graphFile, setGraphFile] = useState<File | null>(null);
  const [agentsFile, setAgentsFile] = useState<File | null>(null);
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState<string>('');

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Role Authorization Protection
  useEffect(() => {
    const userRole = localStorage.getItem('grandpix-role') || 'admin';
    if (userRole === 'user') {
      router.push('/spectator');
    }
  }, [router]);

  // Initial Data Fetch & WebSocket Event Subscriptions
  useEffect(() => {
    async function loadInitialData() {
      try {
        const state = await api.getSimulationState();
        setSimulationState(state);
        setIsRunning(state.isRunning);
        setIsConnected(true);

        const rec = await api.getAICopilotRecommendation();
        setRecommendation(rec);

        const risks = await api.getRisks();
        setRiskSummary(risks);
      } catch (err: any) {
        console.warn('Initial REST load fallback (Server offline or initializing):', err.message);
        setError(err.message || 'Failed to connect to backend server');
        setIsConnected(false);
      }
    }

    loadInitialData();

    // Subscribe to Socket.IO channels
    const unsubTick = subscribeToSimulationTicks((tickData) => {
      setSimulationState(tickData);
      setIsRunning(tickData.isRunning);
      setIsConnected(true);
      setError(null);
      
      // Auto-fetch predictions and risks on every tick to ensure the charts and forecasts are live
      api.getPredictions().then(setPredictions).catch(console.error);
      api.getRisks().then(setRiskSummary).catch(console.error);
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

    return () => {
      unsubTick();
      unsubRec();
      unsubRisk();
      unsubPred();
    };
  }, []);

  // Simulation Controls Event Handlers
  const handleStart = async () => {
    try {
      await api.startSimulation();
      setIsRunning(true);
    } catch (err: any) {
      console.error('Failed to start simulation:', err);
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
      setSimulationState(res.state);
      setIsRunning(false);
      setActiveIncident(null);
      setSelectedNodeId(null);
    } catch (err: any) {
      console.error('Failed to reset simulation:', err);
    }
  };

  const handleSpeedChange = async (spd: number) => {
    try {
      await api.setSpeed(spd);
      setSpeedMultiplier(spd);
    } catch (err: any) {
      console.error('Failed to set simulation speed:', err);
    }
  };

  const handleStepTick = async () => {
    try {
      const res = await api.advanceTick(1);
      if (res && res.state) {
        setSimulationState(res.state);
        // Fetch predictions and risks on step tick
        const [preds, risks] = await Promise.all([api.getPredictions(), api.getRisks()]);
        setPredictions(preds);
        setRiskSummary(risks);
      }
    } catch (err: any) {
      console.error('Failed to step simulation tick:', err);
    }
  };

  const handleApplyReroute = async (rec: RecommendationPayload) => {
    if (rec.recommendedEdgeToBlock) {
      try {
        const incident: IncidentPayload = {
          time: simulationState?.simTime || '16:20',
          type: 'ROUTE_CLOSURE',
          edge_id: rec.recommendedEdgeToBlock,
        };
        await api.triggerIncident('sim_default', {
          type: 'route_closure',
          edge_id: rec.recommendedEdgeToBlock,
        } as any);
        setActiveIncident(incident);
      } catch (err: any) {
        console.error('Failed to apply reroute incident:', err);
      }
    }
  };

  // Weather Preset Simulation Change Handler
  const handleWeatherChange = async (value: string) => {
    try {
      await api.triggerIncident('sim_default', {
        type: 'weather_change',
        value,
      } as any);
    } catch (err: any) {
      console.error('Failed to apply weather change:', err);
    }
  };

  // Node Disable / Re-Open Toggle Handler
  const handleToggleNode = async () => {
    if (!selectedNodeId) return;
    const node = simulationState?.nodes?.find((n) => n.id === selectedNodeId);
    const newDisabledState = node ? !node.isDisabled : true;
    try {
      await api.triggerIncident('sim_default', {
        type: 'node_disable',
        node_id: selectedNodeId,
        isDisabled: newDisabledState,
      } as any);
    } catch (err: any) {
      console.error('Failed to toggle node active state:', err);
    }
  };

  const readFileText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!graphFile) {
      setImportStatus('error');
      setImportMessage('Graph JSON file is required.');
      return;
    }

    setImportStatus('loading');
    setImportMessage('Importing scenario config...');

    try {
      const graphText = await readFileText(graphFile);
      const graphJson = JSON.parse(graphText);

      let agentsCsv = null;
      if (agentsFile) {
        agentsCsv = await readFileText(agentsFile);
      }

      let scheduleCsv = null;
      if (scheduleFile) {
        scheduleCsv = await readFileText(scheduleFile);
      }

      const res = await api.importDataset(graphJson, agentsCsv, scheduleCsv);
      
      setImportStatus('success');
      setImportMessage(`Imported ${res.stats.nodesCount} nodes, ${res.stats.edgesCount} edges, ${res.stats.agentsCount} agents.`);
      
      setGraphFile(null);
      setAgentsFile(null);
      setScheduleFile(null);

      setSimulationState(res.state);
      setIsRunning(res.state.isRunning);
    } catch (err: any) {
      console.error('[Import Error]', err);
      setImportStatus('error');
      setImportMessage(err.message || 'Import failed. Check file formats.');
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

      {/* Simulation Controls Toolbar */}
      <SimulationToolbar
        isRunning={isRunning}
        speedMultiplier={speedMultiplier}
        onStart={handleStart}
        onPause={handlePause}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        onStepTick={handleStepTick}
      />

      {/* Backend Offline Error Notification */}
      {error && (
        <div className="bg-red-950/90 border border-red-600 text-red-100 p-4 rounded-xl text-xs font-mono flex items-center justify-between shadow-[0_0_20px_rgba(225,6,0,0.3)]">
          <div>
            <strong className="text-red-400 uppercase">⚠️ Backend Gateway Offline:</strong> {error}
            <div className="text-[11px] text-red-300/80 mt-0.5">Ensure backend server is running on <code className="bg-red-900/60 px-1 py-0.5 rounded text-white">http://localhost:5000</code>.</div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="f1-btn-pill-red px-3 py-1.5 text-[11px]"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Main 3-Column Dashboard Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Interactive Circuit Map Canvas */}
        <div className="lg:col-span-2">
          <MapContainerShell
            nodes={simulationState?.nodes || []}
            edges={simulationState?.edges || []}
            nodesCount={simulationState?.nodes?.length || 18}
            edgesCount={simulationState?.edges?.length || 23}
            activeAgents={simulationState?.agentCount || 2000}
            activeIncident={activeIncident}
            onNodeSelect={(id) => setSelectedNodeId(id)}
          />
        </div>

        {/* Right Column (1 Col): Risk Summary, Custom Environmental & Node Controls, AI Copilot */}
        <div className="space-y-6">
          {/* Node Operations Override Card */}
          <div className="f1-card-crimson p-5 space-y-4">
            <h3 className="text-xs font-black tracking-widest text-red-500 font-mono uppercase">
              ⚙️ OPERATIONAL OVERRIDE
            </h3>
            {selectedNodeId ? (
              (() => {
                const node = simulationState?.nodes?.find((n) => n.id === selectedNodeId);
                const isClosed = node?.isDisabled;
                return (
                  <div className="space-y-3 font-mono">
                    <div className="flex justify-between items-center bg-[#0D0305] border border-red-950 p-2.5 rounded-lg">
                      <div>
                        <span className="text-[10px] text-red-300 font-bold block uppercase">Selected Location</span>
                        <span className="text-sm text-white font-extrabold">{selectedNodeId}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] rounded font-black tracking-widest ${
                        isClosed ? 'bg-red-950 border border-red-800 text-red-400' : 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                      }`}>
                        {isClosed ? 'CLOSED' : 'ACTIVE'}
                      </span>
                    </div>

                    {isClosed && node?.dispersedTo && (
                      <div className="bg-red-950/40 border border-red-900/60 p-2.5 rounded-xl text-[10px] text-red-300 font-bold uppercase tracking-wider flex items-center justify-between font-mono animate-pulse">
                        <span>🔄 Redirection Target:</span>
                        <span className="text-white bg-red-950 px-2 py-0.5 rounded border border-red-800">{node.dispersedTo}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-[#120406] p-2 rounded border border-red-950">
                        <span className="text-slate-400 block">Occupancy</span>
                        <span className="text-white font-extrabold text-xs">{node?.currentOccupancy || 0} / {node?.capacity || 0}</span>
                      </div>
                      <div className="bg-[#120406] p-2 rounded border border-red-950">
                        <span className="text-slate-400 block">Density</span>
                        <span className="text-white font-extrabold text-xs">{((node?.densityRatio || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <button
                      onClick={handleToggleNode}
                      className={`w-full py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 ${
                        isClosed
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'bg-gradient-to-r from-[#FF1801] to-[#E10600] hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_15px_rgba(225,6,0,0.4)]'
                      }`}
                    >
                      {isClosed ? '🔓 RE-OPEN LOCATION' : '⛔ DISABLE NODE & DISPERSE CROWD'}
                    </button>
                  </div>
                );
              })()
            ) : (
              <div className="border border-dashed border-red-950/60 rounded-xl p-6 text-center text-xs text-red-300/50 font-mono">
                📍 Click any node on the circuit map to execute operational closures & disperse spectator queues.
              </div>
            )}
          </div>

          {/* Weather Preset Simulation Card */}
          <div className="f1-card-crimson p-5 space-y-4">
            <h3 className="text-xs font-black tracking-widest text-red-500 font-mono uppercase">
              🌧️ ENVIRONMENTAL SIMULATOR
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'sunny', label: '☀️ Sunny', desc: '1.0x walking speed' },
                { id: 'cloudy', label: '⛅ Cloudy', desc: '0.95x walking speed' },
                { id: 'rain', label: '🌧️ Rain', desc: '0.85x walking speed' },
                { id: 'heavy_rain', label: '⛈️ Heavy Storm', desc: '0.70x walking speed' }
              ].map((w) => {
                const isActive = simulationState?.weather?.condition === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => handleWeatherChange(w.id)}
                    className={`p-3 rounded-xl border text-left font-mono transition-all flex flex-col justify-between active:scale-95 ${
                      isActive
                        ? 'bg-red-950/30 border-red-500 text-white shadow-[0_0_12px_rgba(225,6,0,0.3)]'
                        : 'bg-[#120406] border-red-950/60 text-slate-400 hover:text-white hover:bg-red-950/20'
                    }`}
                  >
                    <span className="text-xs font-extrabold">{w.label}</span>
                    <span className="text-[9px] text-slate-500 mt-1">{w.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Configuration Importer Card */}
          <div className="f1-card-crimson p-5 space-y-4">
            <h3 className="text-xs font-black tracking-widest text-red-500 font-mono uppercase">
              📁 CONFIGURATION IMPORTER
            </h3>
            <p className="text-[10px] text-red-200/60 font-mono">
              Upload custom JSON circuit graphs and CSV files for agents/schedules to reload the digital twin scenario.
            </p>

            <div className="space-y-3 font-mono text-[11px]">
              {/* Circuit Graph JSON */}
              <div className="space-y-1">
                <span className="text-[9px] text-red-300 font-bold uppercase block">1. Circuit Graph (JSON) *</span>
                <label className="flex items-center justify-between bg-[#120406] border border-red-950 hover:border-red-600 rounded-xl px-3 py-2 cursor-pointer transition-colors">
                  <span className="text-slate-400 truncate max-w-[150px]">
                    {graphFile ? graphFile.name : 'Choose file...'}
                  </span>
                  <span className="text-[9px] bg-red-950 border border-red-800 px-2 py-0.5 rounded text-red-400 font-extrabold uppercase shrink-0">Browse</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => setGraphFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Crowd Population CSV */}
              <div className="space-y-1">
                <span className="text-[9px] text-red-300 font-bold uppercase block">2. Spectator Population (CSV)</span>
                <label className="flex items-center justify-between bg-[#120406] border border-red-950 hover:border-red-600 rounded-xl px-3 py-2 cursor-pointer transition-colors">
                  <span className="text-slate-400 truncate max-w-[150px]">
                    {agentsFile ? agentsFile.name : 'Choose file...'}
                  </span>
                  <span className="text-[9px] bg-red-950 border border-red-800 px-2 py-0.5 rounded text-red-400 font-extrabold uppercase shrink-0">Browse</span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setAgentsFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Event Schedule CSV */}
              <div className="space-y-1">
                <span className="text-[9px] text-red-300 font-bold uppercase block">3. Event Schedule (CSV)</span>
                <label className="flex items-center justify-between bg-[#120406] border border-red-950 hover:border-red-600 rounded-xl px-3 py-2 cursor-pointer transition-colors">
                  <span className="text-slate-400 truncate max-w-[150px]">
                    {scheduleFile ? scheduleFile.name : 'Choose file...'}
                  </span>
                  <span className="text-[9px] bg-red-950 border border-red-800 px-2 py-0.5 rounded text-red-400 font-extrabold uppercase shrink-0">Browse</span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setScheduleFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Action Button */}
              <button
                onClick={handleImport}
                disabled={!graphFile || importStatus === 'loading'}
                className="w-full f1-btn-pill-red py-2.5 text-xs font-black tracking-widest uppercase disabled:opacity-40 shadow-[0_0_12px_rgba(225,6,0,0.3)] hover:scale-105 active:scale-95 transition-transform"
              >
                {importStatus === 'loading' ? 'IMPORTING CONFIG...' : 'INITIALISE CUSTOM CONFIG'}
              </button>

              {/* Feedback messages */}
              {importStatus === 'success' && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-emerald-400 text-[10px] uppercase font-bold text-center">
                  {importMessage}
                </div>
              )}
              {importStatus === 'error' && (
                <div className="p-2.5 bg-red-950/40 border border-red-900 text-red-400 text-[10px] uppercase font-bold text-center">
                  ⚠️ {importMessage}
                </div>
              )}
            </div>
          </div>

          {/* Multi-Factor Venue Risk Widget */}
          <RiskSummaryWidget
            score={riskSummary?.nodes?.[0]?.riskScore || 0.18}
            severity={riskSummary?.nodes?.[0]?.riskSeverity || 'SAFE'}
            highestRiskNode={riskSummary?.highestRiskNode}
            highRiskCount={riskSummary?.highRiskCount || 0}
            criticalCount={riskSummary?.criticalCount || 0}
          />

          {/* AI Copilot Reasoner Panel */}
          <AICopilotWidget
            recommendation={recommendation}
            onApplyAction={handleApplyReroute}
          />

          {/* 10-Min ML Density Forecast Timeline */}
          <PredictionTimelineWidget
            predictions={predictions?.predictions}
            lastUpdated={simulationState?.simTime}
          />
        </div>
      </div>
    </div>
  );
}
