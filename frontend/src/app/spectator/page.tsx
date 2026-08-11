'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { subscribeToSimulationTicks } from '@/lib/socket';
import { SimulationTickPayload, SpectatorRouteResponse } from '@/types';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MapContainerShell from '@/components/dashboard/MapContainerShell';
import { MapPin, Navigation, Compass, ShieldAlert, Footprints } from 'lucide-react';

export default function SpectatorPage() {
  const [simulationState, setSimulationState] = useState<SimulationTickPayload | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pathfinding states
  const [startNode, setStartNode] = useState<string>('GATE_A');
  const [endNode, setEndNode] = useState<string>('EXIT_E');
  const [routeData, setRouteData] = useState<SpectatorRouteResponse | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [isFindingRoute, setIsFindingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Initial Data Fetch & WebSocket Event Subscriptions
  useEffect(() => {
    async function loadInitialData() {
      try {
        const state = await api.getSimulationState();
        setSimulationState(state);
        setIsConnected(true);
      } catch (err: any) {
        console.warn('Initial REST load fallback (Server offline or initializing):', err.message);
        setError(err.message || 'Failed to connect to backend server');
        setIsConnected(false);
      }
    }

    loadInitialData();

    // Subscribe to Socket.IO channels for real-time sync with Admin side changes!
    const unsubTick = subscribeToSimulationTicks((tickData) => {
      setSimulationState(tickData);
      setIsConnected(true);
      setError(null);
    });

    return () => {
      unsubTick();
    };
  }, []);

  // Recalculate route automatically if simulation state updates (e.g. density/congestions change or weather shifts)
  useEffect(() => {
    if (routeData) {
      findRoute(false);
    }
  }, [simulationState?.tick]);

  const findRoute = async (showLoading = true) => {
    if (!startNode || !endNode) return;
    if (showLoading) {
      setIsFindingRoute(true);
      setRouteError(null);
    }
    try {
      const data = await api.getSpectatorRoutes(startNode, endNode);
      setRouteData(data);
      setHighlightedPath(data.path || []);
    } catch (err: any) {
      console.error('Failed to compute spectator route:', err);
      setRouteError(err.message || 'Failed to find route');
    } finally {
      if (showLoading) {
        setIsFindingRoute(false);
      }
    }
  };

  const handleNodeClick = (nodeId: string) => {
    // Intuitive clicking: toggle click between start and end node
    if (startNode === nodeId) {
      // do nothing
    } else if (endNode === nodeId) {
      // do nothing
    } else {
      // Set as start node, shift previous start to destination or swap
      setStartNode(nodeId);
      setRouteData(null);
      setHighlightedPath([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top F1 Header (Read-Only Spectator View) */}
      <DashboardHeader
        circuitName="SILVERSTONE CIRCUIT"
        simTime={simulationState?.simTime || '16:20'}
        activeEvent={simulationState?.activeEvent || 'PRACTICE'}
        weather={simulationState?.weather || { condition: 'sunny', intensity: 0.1 }}
        isConnected={isConnected}
      />

      {/* Backend Offline Notification */}
      {error && (
        <div className="bg-red-950/90 border border-red-600 text-red-100 p-4 rounded-xl text-xs font-mono flex items-center justify-between shadow-[0_0_20px_rgba(225,6,0,0.3)]">
          <div>
            <strong className="text-red-400 uppercase">⚠️ Live Sync Offline:</strong> {error}
            <div className="text-[11px] text-red-300/80 mt-0.5">Please check if the backend service is running.</div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="f1-btn-pill-red px-3 py-1.5 text-[11px]"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Main Grid: Map on Left (2 Cols), Route finder on Right (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-2">
          <MapContainerShell
            nodes={simulationState?.nodes || []}
            edges={simulationState?.edges || []}
            nodesCount={simulationState?.nodes?.length || 18}
            edgesCount={simulationState?.edges?.length || 23}
            activeAgents={simulationState?.agentCount || 2000}
            highlightedPath={highlightedPath}
            onNodeSelect={handleNodeClick}
          />
        </div>

        {/* Pathfinder Sidebar Panel */}
        <div className="space-y-6">
          {/* Spectator Path Finder Navigation Card */}
          <div className="f1-card-crimson p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-red-950 pb-3">
              <Compass className="w-5 h-5 text-red-500 animate-spin-slow" />
              <h2 className="text-sm font-black text-white tracking-widest uppercase italic">
                Spectator Route Optimiser
              </h2>
            </div>
            
            <p className="text-[11px] text-red-200/60 font-mono">
              Find low-congestion walking paths, avoid blocked gates, and bypass critical density surges around the circuit.
            </p>

            {/* Path Form */}
            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] text-red-300 font-bold uppercase block mb-1">📍 YOUR START LOCATION</label>
                <select
                  value={startNode}
                  onChange={(e) => {
                    setStartNode(e.target.value);
                    setRouteData(null);
                    setHighlightedPath([]);
                  }}
                  className="w-full bg-[#120406] border border-red-950 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-red-600 transition-colors"
                >
                  {simulationState?.nodes
                    ?.filter((n) => !n.isDisabled)
                    ?.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id.replace(/_/g, ' ')} ({((n.densityRatio || 0) * 100).toFixed(0)}% busy)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-red-300 font-bold uppercase block mb-1">🏁 DESTINATION TARGET</label>
                <select
                  value={endNode}
                  onChange={(e) => {
                    setEndNode(e.target.value);
                    setRouteData(null);
                    setHighlightedPath([]);
                  }}
                  className="w-full bg-[#120406] border border-red-950 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-red-600 transition-colors"
                >
                  {simulationState?.nodes
                    ?.filter((n) => !n.isDisabled)
                    ?.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id.replace(/_/g, ' ')}
                      </option>
                    ))}
                </select>
              </div>

              <button
                onClick={() => findRoute(true)}
                disabled={startNode === endNode || isFindingRoute}
                className="w-full f1-btn-pill-red py-2.5 text-xs font-black tracking-widest uppercase flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(225,6,0,0.4)] disabled:opacity-40"
              >
                <Navigation className="w-3.5 h-3.5 fill-current" />
                <span>{isFindingRoute ? 'COMPUTING ROUTE...' : 'FIND LOW CONGESTION PATH'}</span>
              </button>
            </div>

            {routeError && (
              <div className="bg-red-950/40 border border-red-900/60 text-red-200 p-3 rounded-lg text-[10px] font-mono flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span>{routeError}</span>
              </div>
            )}
          </div>

          {/* Route Navigation Path Display Card */}
          {routeData && (
            <div className="f1-card-crimson p-5 space-y-4 animate-fade-in">
              <h3 className="text-xs font-black tracking-widest text-red-500 font-mono uppercase">
                🏁 COMPUTED PATH SUMMARY
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-[#120406] border border-red-950 p-3 rounded-xl flex items-center space-x-2.5">
                  <Footprints className="w-5 h-5 text-cyan-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Distance</span>
                    <span className="text-white font-extrabold">{routeData.totalDistanceM} meters</span>
                  </div>
                </div>
                <div className="bg-[#120406] border border-red-950 p-3 rounded-xl flex items-center space-x-2.5">
                  <Footprints className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Est. Time</span>
                    <span className="text-white font-extrabold">{routeData.estimatedWalkingTimeMin} mins</span>
                  </div>
                </div>
              </div>

              {/* Path Node Sequence List */}
              <div className="space-y-2 font-mono text-[11px]">
                <span className="text-[10px] text-red-400 font-bold uppercase block mb-1">Navigation Directions</span>
                <div className="bg-[#0D0305] border border-red-950 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2.5">
                  {routeData.path?.map((step, idx) => {
                    const isLast = idx === (routeData.path || []).length - 1;
                    return (
                      <div key={idx} className="flex items-center space-x-2.5 text-slate-300">
                        <div className="w-4 h-4 rounded-full bg-red-950 border border-red-800 text-[9px] flex items-center justify-center font-bold text-red-400 shrink-0">
                          {idx + 1}
                        </div>
                        <span className={`font-bold ${isLast ? 'text-cyan-400' : ''}`}>{step}</span>
                        {!isLast && <span className="text-[9px] text-slate-600 font-extrabold">&rarr;</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Selected Route Telemetry Overview */}
          {routeData && routeData.path && routeData.path.length > 0 && (
            <div className="f1-card-crimson p-5 space-y-4 animate-fade-in">
              <h3 className="text-xs font-black tracking-widest text-cyan-400 font-mono uppercase">
                📊 SELECTED ROUTE TELEMETRY
              </h3>
              <div className="space-y-2.5 font-mono text-[10px]">
                {routeData.path.map((nodeId) => {
                  const node = simulationState?.nodes?.find((n) => n.id === nodeId);
                  if (!node) return null;
                  const percent = Math.round((node.densityRatio || 0) * 100);
                  return (
                    <div key={nodeId} className="space-y-1">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="font-bold">{nodeId.replace(/_/g, ' ')}</span>
                        <span className={node.isDisabled ? 'text-red-400' : percent > 75 ? 'text-red-500 font-extrabold' : percent > 50 ? 'text-amber-500' : 'text-emerald-400'}>
                          {node.isDisabled ? 'CLOSED' : `${percent}% load (${node.currentOccupancy !== undefined ? node.currentOccupancy : node.occupancy || 0} pax)`}
                        </span>
                      </div>
                      {!node.isDisabled && (
                        <div className="w-full h-1 bg-[#120406] border border-red-950/40 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent > 75 ? 'bg-red-500' : percent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Crowd Overview Telemetry Card */}
          <div className="f1-card-crimson p-5 space-y-4">
            <h3 className="text-xs font-black tracking-widest text-red-500 font-mono uppercase">
              📊 VENUE TELEMETRY OVERVIEW
            </h3>
            <div className="space-y-2.5 font-mono text-[10px]">
              {simulationState?.nodes
                ?.slice()
                ?.sort((a, b) => (b.densityRatio || 0) - (a.densityRatio || 0))
                ?.slice(0, 5)
                ?.map((node) => {
                  const percent = Math.round((node.densityRatio || 0) * 100);
                  return (
                    <div key={node.id} className="space-y-1">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="font-bold">{node.id}</span>
                        <span className={node.isDisabled ? 'text-red-400' : percent > 75 ? 'text-red-500 font-extrabold' : percent > 50 ? 'text-amber-500' : 'text-emerald-400'}>
                          {node.isDisabled ? 'CLOSED' : `${percent}% load (${node.currentOccupancy} pax)`}
                        </span>
                      </div>
                      {!node.isDisabled && (
                        <div className="w-full h-1.5 bg-[#120406] border border-red-950/40 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent > 75 ? 'bg-red-500' : percent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
