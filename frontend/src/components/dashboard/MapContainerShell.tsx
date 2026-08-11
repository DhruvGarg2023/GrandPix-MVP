'use client';

import { MapPin, Layers, Radio, ShieldAlert } from 'lucide-react';
import { IncidentPayload, NodeState, EdgeState } from '@/types';
import CircuitMap from '@/components/map/CircuitMap';

interface MapContainerShellProps {
  nodes?: NodeState[];
  edges?: EdgeState[];
  nodesCount?: number;
  edgesCount?: number;
  activeAgents?: number;
  activeIncident?: IncidentPayload | null;
  onNodeSelect?: (nodeId: string) => void;
  onEdgeSelect?: (edgeId: string) => void;
  highlightedPath?: string[];
}

export default function MapContainerShell({
  nodes = [],
  edges = [],
  nodesCount = 18,
  edgesCount = 23,
  activeAgents = 2000,
  activeIncident,
  onNodeSelect = () => {},
  onEdgeSelect = () => {},
  highlightedPath = [],
}: MapContainerShellProps) {
  return (
    <div className="f1-card-crimson p-5 min-h-[500px] flex flex-col justify-between relative overflow-hidden">
      {/* Top Header & Status Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-950 pb-3 z-10">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          <h2 className="text-xs font-bold text-red-100 tracking-widest uppercase font-mono">
            Silverstone Circuit Digital Twin Graph
          </h2>
        </div>

        {/* Telemetry Stats Badges */}
        <div className="flex items-center space-x-2 text-[10px] font-mono">
          <span className="f1-badge-red px-2.5 py-0.5 rounded flex items-center space-x-1">
            <MapPin className="w-3 h-3 text-red-400" />
            <span>{nodesCount} NODES</span>
          </span>
          <span className="f1-badge-red px-2.5 py-0.5 rounded flex items-center space-x-1">
            <Layers className="w-3 h-3 text-red-400" />
            <span>{edgesCount} EDGES</span>
          </span>
          <span className="bg-red-950 border border-red-800 text-white font-extrabold px-2.5 py-0.5 rounded flex items-center space-x-1">
            <Radio className="w-3 h-3 text-red-400 animate-pulse" />
            <span>{activeAgents.toLocaleString()} AGENTS</span>
          </span>
        </div>
      </div>

      {/* Active Incident Warning Bar */}
      {activeIncident && (
        <div className="my-2 bg-red-950/90 border border-red-600 text-red-100 px-3.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between z-10 animate-pulse shadow-[0_0_15px_rgba(255,24,1,0.5)]">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span className="font-extrabold uppercase">
              ACTIVE INCIDENT: {activeIncident.type} ({activeIncident.edge_id || activeIncident.node_id})
            </span>
          </div>
          <span className="text-[10px] text-red-300 font-bold">A* DYNAMIC REROUTING ACTIVE</span>
        </div>
      )}

      {/* Main Canvas Area: Interactive Circuit Map Component */}
      <div className="flex-1 rounded-xl my-3 relative overflow-hidden z-10">
        <CircuitMap
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeSelect}
          onEdgeClick={onEdgeSelect}
          highlightedPath={highlightedPath}
        />
      </div>

      {/* Bottom Telemetry Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-red-200/70 font-mono pt-2 border-t border-red-950 z-10">
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>SAFE (&lt;50%)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>MODERATE</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>HIGH</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span>CRITICAL (&gt;75%)</span>
          </span>
        </div>

        <span className="text-[10px] text-slate-400">CIRCUIT GRAPH: 18 NODES / 23 EDGES</span>
      </div>
    </div>
  );
}
