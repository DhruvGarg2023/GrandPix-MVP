'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { SpectatorStateResponse, SpectatorRouteResponse, NodeState, EdgeState } from '@/types';
import CircuitMap, { DEFAULT_NODES, DEFAULT_EDGES } from '@/components/map/CircuitMap';
import { MapPin, Navigation, Clock, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function SpectatorPage() {
  const [spectatorState, setSpectatorState] = useState<SpectatorStateResponse | null>(null);
  const [origin, setOrigin] = useState<string>('GATE_A');
  const [destination, setDestination] = useState<string>('GS_B');
  const [route, setRoute] = useState<SpectatorRouteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchState = async () => {
    try {
      const state = await api.getSpectatorState();
      setSpectatorState(state);
    } catch (err) {
      console.error('Failed to fetch spectator state:', err);
    }
  };

  const calculateRoute = async () => {
    if (!origin || !destination || origin === destination) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSpectatorRoutes(origin, destination);
      
      if (spectatorState?.blockedEdges && spectatorState.blockedEdges.length > 0) {
        res.avoidsBlockedEdges = true;
        res.warnings = [`Route actively detoured around closed pathways.`];
      }
      
      setRoute(res);
    } catch (err: any) {
      console.error('Failed to fetch route:', err);
      setError(err.message || 'Failed to calculate route.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchState();
  }, []);

  // Fetch route when origin/destination changes
  useEffect(() => {
    calculateRoute();
  }, [origin, destination]);

  // Construct edges array with correct isBlocked status
  const edges: EdgeState[] = DEFAULT_EDGES.map((edge) => ({
    ...edge,
    isBlocked: spectatorState?.blockedEdges?.includes(edge.id) || false,
  }));

  // Construct nodes array with correct queue/congestion status
  const nodes: NodeState[] = DEFAULT_NODES.map((node) => {
    const serverNode = spectatorState?.nodes?.find((n) => n.id === node.id);
    if (!serverNode) return node;
    return {
      ...node,
      queueLength: serverNode.queueWaitMinutes * 10, // Approximation for UI
      waitMinutes: serverNode.queueWaitMinutes,
      riskSeverity: serverNode.isCongested ? 'HIGH' : 'SAFE',
    };
  });

  // Extract optimal path IDs
  const optimalPath = route?.optimalPath || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 lg:flex-row gap-6">
      
      {/* Left Panel: Route Controls */}
      <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6">
        <div className="f1-card-crimson p-6">
          <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6 flex items-center">
            <Navigation className="w-5 h-5 mr-2 text-red-500" />
            Route Optimizer
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Origin</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-[#0D0305] border border-red-950 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-red-600 transition-colors appearance-none cursor-pointer"
                >
                  {DEFAULT_NODES.map((node) => (
                    <option key={node.id} value={node.id}>{node.id.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-[#0D0305] border border-red-950 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-red-600 transition-colors appearance-none cursor-pointer"
                >
                  {DEFAULT_NODES.map((node) => (
                    <option key={node.id} value={node.id}>{node.id.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => { fetchState(); calculateRoute(); }}
              disabled={loading}
              className="w-full mt-2 py-3 bg-red-900/30 hover:bg-red-800/50 text-red-100 font-bold uppercase tracking-wider text-xs rounded-lg transition-colors border border-red-900/50 flex items-center justify-center disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recalculate Route
            </button>
          </div>
        </div>

        {/* Route Summary Card */}
        {route && (
          <div className="f1-card-crimson p-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4 border-b border-red-950 pb-2">Route Summary</h3>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm">Est. Time</span>
              <div className="flex items-center text-white font-black text-lg">
                <Clock className="w-5 h-5 mr-2 text-emerald-500" />
                {route.estimatedWalkMinutes} <span className="text-xs text-slate-500 ml-1">MIN</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm">Distance</span>
              <div className="text-white font-mono text-sm">{route.totalDistanceM}m</div>
            </div>

            {route.recommendedExit && (
              <div className="flex items-center justify-between mb-4 border-t border-red-950 pt-4">
                <span className="text-slate-400 text-sm">Recommended Exit</span>
                <div className="px-2 py-1 bg-blue-900/40 border border-blue-500/50 rounded font-mono text-xs text-blue-300 uppercase">
                  {route.recommendedExit.replace('_', ' ')}
                </div>
              </div>
            )}

            {(nodes.find(n => n.id === destination)?.waitMinutes ?? 0) > 0 && (
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 text-sm">Dest. Queue</span>
                <div className="text-orange-400 font-mono text-sm">{(nodes.find(n => n.id === destination)?.waitMinutes)} mins</div>
              </div>
            )}

            {route.avoidsBlockedEdges && (
              <div className="bg-emerald-950/30 border border-emerald-900/50 rounded p-3 mb-4 flex items-start">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 mr-2" />
                <p className="text-xs text-emerald-100/70 font-mono">Route dynamically detoured to avoid active closures.</p>
              </div>
            )}

            {route.warnings && route.warnings.length > 0 && (
              <div className="space-y-2">
                {route.warnings.map((warning, idx) => (
                  <div key={idx} className="bg-red-950/30 border border-red-900/50 rounded p-3 flex items-start">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 mr-2" />
                    <p className="text-xs text-red-200/80 font-mono">{warning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Panel: Map */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-red-900/30">
        <CircuitMap 
          nodes={nodes}
          edges={edges}
          optimalPath={optimalPath}
          isSpectatorMode={true}
        />
        
        {/* Map Overlay Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
          {spectatorState?.activeEvent && (
            <div className="px-3 py-1.5 bg-[#0D0305]/90 border border-red-900/50 rounded backdrop-blur font-mono text-[10px] text-white tracking-widest uppercase">
              Current Event: <span className="text-red-500">{spectatorState.activeEvent}</span>
            </div>
          )}
          {spectatorState?.weather && (
            <div className="px-3 py-1.5 bg-[#0D0305]/90 border border-slate-700/50 rounded backdrop-blur font-mono text-[10px] text-slate-300 tracking-widest uppercase">
              Weather: <span className="text-blue-400">{spectatorState.weather.condition.replace('_', ' ')}</span>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
