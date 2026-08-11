'use client';

import { useState } from 'react';
import { NodeState, EdgeState } from '@/types';
import NodeTooltip from './NodeTooltip';

interface CircuitMapProps {
  nodes?: NodeState[];
  edges?: EdgeState[];
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  highlightedPath?: string[];
}

// 2D Circuit Node Positions matching Silverstone Circuit graph geometry
const NODE_POSITIONS: Record<string, { x: number; y: number; label: string }> = {
  GATE_A: { x: 100, y: 120, label: 'Gate A' },
  GATE_B: { x: 100, y: 320, label: 'Gate B' },
  GATE_C: { x: 100, y: 520, label: 'Gate C' },
  GATE_VIP: { x: 260, y: 80, label: 'VIP Gate' },

  FAN_ZONE: { x: 260, y: 200, label: 'Fan Zone' },
  FOOD_N: { x: 420, y: 120, label: 'Food North' },
  MERCH: { x: 260, y: 340, label: 'Merchandise' },
  FOOD_S: { x: 260, y: 520, label: 'Food South' },
  PIT_WALK: { x: 420, y: 280, label: 'Pit Walk' },
  MEDICAL: { x: 420, y: 440, label: 'Medical' },

  GS_A: { x: 600, y: 140, label: 'Grandstand A' },
  GS_B: { x: 600, y: 320, label: 'Grandstand B' },
  GS_C: { x: 600, y: 500, label: 'Grandstand C' },

  EXIT_N: { x: 780, y: 120, label: 'Exit North' },
  EXIT_E: { x: 780, y: 320, label: 'Exit East' },
  EXIT_S: { x: 780, y: 520, label: 'Exit South' },
  METRO: { x: 910, y: 200, label: 'Metro' },
  PARKING: { x: 910, y: 440, label: 'Parking' },
};

// Fallback Default Node State Data
const DEFAULT_NODES: NodeState[] = [
  { id: 'GATE_A', type: 'gate', capacity: 6000, occupancy: 1200, densityRatio: 0.20, riskScore: 0.15, riskSeverity: 'SAFE' },
  { id: 'GATE_B', type: 'gate', capacity: 7200, occupancy: 2100, densityRatio: 0.29, riskScore: 0.22, riskSeverity: 'SAFE' },
  { id: 'GATE_C', type: 'gate', capacity: 6500, occupancy: 1800, densityRatio: 0.27, riskScore: 0.20, riskSeverity: 'SAFE' },
  { id: 'GATE_VIP', type: 'vip_gate', capacity: 2500, occupancy: 500, densityRatio: 0.20, riskScore: 0.12, riskSeverity: 'SAFE' },
  { id: 'FAN_ZONE', type: 'fan_zone', capacity: 12000, occupancy: 7800, densityRatio: 0.65, riskScore: 0.45, riskSeverity: 'MODERATE' },
  { id: 'FOOD_N', type: 'food', capacity: 3500, occupancy: 2520, densityRatio: 0.72, riskScore: 0.58, riskSeverity: 'HIGH', queueLength: 35, waitMinutes: 3.5 },
  { id: 'MERCH', type: 'merchandise', capacity: 5000, occupancy: 2900, densityRatio: 0.58, riskScore: 0.40, riskSeverity: 'MODERATE', queueLength: 20, waitMinutes: 2.0 },
  { id: 'FOOD_S', type: 'food', capacity: 3500, occupancy: 1900, densityRatio: 0.54, riskScore: 0.38, riskSeverity: 'MODERATE', queueLength: 15, waitMinutes: 1.5 },
  { id: 'PIT_WALK', type: 'attraction', capacity: 8000, occupancy: 4200, densityRatio: 0.52, riskScore: 0.36, riskSeverity: 'MODERATE', queueLength: 28, waitMinutes: 2.8 },
  { id: 'MEDICAL', type: 'medical', capacity: 500, occupancy: 25, densityRatio: 0.05, riskScore: 0.05, riskSeverity: 'SAFE' },
  { id: 'GS_A', type: 'grandstand', capacity: 18000, occupancy: 12600, densityRatio: 0.70, riskScore: 0.52, riskSeverity: 'HIGH' },
  { id: 'GS_B', type: 'grandstand', capacity: 22000, occupancy: 18500, densityRatio: 0.84, riskScore: 0.78, riskSeverity: 'CRITICAL' },
  { id: 'GS_C', type: 'grandstand', capacity: 16000, occupancy: 9600, densityRatio: 0.60, riskScore: 0.42, riskSeverity: 'MODERATE' },
  { id: 'EXIT_N', type: 'exit', capacity: 18000, occupancy: 3200, densityRatio: 0.17, riskScore: 0.14, riskSeverity: 'SAFE' },
  { id: 'EXIT_E', type: 'exit', capacity: 15000, occupancy: 4500, densityRatio: 0.30, riskScore: 0.24, riskSeverity: 'SAFE' },
  { id: 'EXIT_S', type: 'exit', capacity: 20000, occupancy: 2800, densityRatio: 0.14, riskScore: 0.12, riskSeverity: 'SAFE' },
  { id: 'METRO', type: 'transport', capacity: 20000, occupancy: 1800, densityRatio: 0.09, riskScore: 0.08, riskSeverity: 'SAFE' },
  { id: 'PARKING', type: 'transport', capacity: 30000, occupancy: 4200, densityRatio: 0.14, riskScore: 0.11, riskSeverity: 'SAFE' },
];

const DEFAULT_EDGES: EdgeState[] = [
  { id: 'E1', from: 'GATE_A', to: 'FAN_ZONE', distance_m: 450, capacity_per_min: 220, flowRate: 85, isBlocked: false },
  { id: 'E2', from: 'GATE_B', to: 'MERCH', distance_m: 380, capacity_per_min: 240, flowRate: 90, isBlocked: false },
  { id: 'E3', from: 'GATE_C', to: 'FOOD_S', distance_m: 420, capacity_per_min: 220, flowRate: 75, isBlocked: false },
  { id: 'E4', from: 'GATE_VIP', to: 'PIT_WALK', distance_m: 300, capacity_per_min: 120, flowRate: 35, isBlocked: false },
  { id: 'E5', from: 'FAN_ZONE', to: 'GS_A', distance_m: 650, capacity_per_min: 280, flowRate: 140, isBlocked: false },
  { id: 'E6', from: 'MERCH', to: 'GS_B', distance_m: 550, capacity_per_min: 300, flowRate: 160, isBlocked: false },
  { id: 'E7', from: 'FOOD_S', to: 'GS_C', distance_m: 600, capacity_per_min: 260, flowRate: 110, isBlocked: false },
  { id: 'E8', from: 'FAN_ZONE', to: 'FOOD_N', distance_m: 300, capacity_per_min: 180, flowRate: 65, isBlocked: false },
  { id: 'E9', from: 'FOOD_N', to: 'GS_A', distance_m: 450, capacity_per_min: 220, flowRate: 80, isBlocked: false },
  { id: 'E10', from: 'FOOD_S', to: 'GS_C', distance_m: 350, capacity_per_min: 200, flowRate: 70, isBlocked: false },
  { id: 'E11', from: 'GS_A', to: 'PIT_WALK', distance_m: 700, capacity_per_min: 250, flowRate: 60, isBlocked: false },
  { id: 'E12', from: 'GS_B', to: 'PIT_WALK', distance_m: 500, capacity_per_min: 250, flowRate: 90, isBlocked: false },
  { id: 'E13', from: 'GS_C', to: 'FAN_ZONE', distance_m: 600, capacity_per_min: 230, flowRate: 50, isBlocked: false },
  { id: 'E14', from: 'PIT_WALK', to: 'EXIT_E', distance_m: 500, capacity_per_min: 260, flowRate: 85, isBlocked: false },
  { id: 'E15', from: 'GS_A', to: 'EXIT_N', distance_m: 700, capacity_per_min: 300, flowRate: 120, isBlocked: false },
  { id: 'E16', from: 'GS_B', to: 'EXIT_E', distance_m: 650, capacity_per_min: 280, flowRate: 0, isBlocked: true }, // Blocked Demo
  { id: 'E17', from: 'GS_C', to: 'EXIT_S', distance_m: 600, capacity_per_min: 320, flowRate: 100, isBlocked: false },
  { id: 'E18', from: 'FAN_ZONE', to: 'EXIT_N', distance_m: 800, capacity_per_min: 280, flowRate: 40, isBlocked: false },
  { id: 'E19', from: 'FOOD_N', to: 'EXIT_N', distance_m: 500, capacity_per_min: 220, flowRate: 45, isBlocked: false },
  { id: 'E20', from: 'FOOD_S', to: 'EXIT_S', distance_m: 500, capacity_per_min: 240, flowRate: 55, isBlocked: false },
  { id: 'E21', from: 'EXIT_N', to: 'METRO', distance_m: 900, capacity_per_min: 260, flowRate: 110, isBlocked: false },
  { id: 'E22', from: 'EXIT_E', to: 'PARKING', distance_m: 800, capacity_per_min: 260, flowRate: 130, isBlocked: false },
  { id: 'E23', from: 'EXIT_S', to: 'PARKING', distance_m: 700, capacity_per_min: 250, flowRate: 95, isBlocked: false },
];

export default function CircuitMap({
  nodes = DEFAULT_NODES,
  edges = DEFAULT_EDGES,
  onNodeClick = () => {},
  onEdgeClick = () => {},
  highlightedPath = [],
}: CircuitMapProps) {
  const [hoveredNode, setHoveredNode] = useState<NodeState | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Map nodes array into key-value dictionary
  const nodeMap = new Map<string, NodeState>();
  (nodes.length > 0 ? nodes : DEFAULT_NODES).forEach((n) => nodeMap.set(n.id, n));

  // Risk Color Lookup Helper
  const getNodeColor = (node: NodeState) => {
    if (node.isDisabled) {
      return { fill: '#334155', stroke: '#64748B', glow: 'rgba(71,85,105,0.4)' }; // Slate grey closed state
    }
    switch (node.riskSeverity) {
      case 'CRITICAL':
        return { fill: '#FF1801', stroke: '#FFFFFF', glow: 'rgba(255,24,1,0.9)' };
      case 'HIGH':
        return { fill: '#F97316', stroke: '#FFD1A3', glow: 'rgba(249,115,22,0.7)' };
      case 'MODERATE':
        return { fill: '#F59E0B', stroke: '#FFE5B4', glow: 'rgba(245,158,11,0.6)' };
      default:
        return { fill: '#10B981', stroke: '#A7F3D0', glow: 'rgba(16,185,129,0.5)' };
    }
  };

  // Construct path links to highlight paths for spectator routing
  const pathLinks = new Set<string>();
  if (highlightedPath && highlightedPath.length > 1) {
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      pathLinks.add(`${highlightedPath[i]}->${highlightedPath[i + 1]}`);
      pathLinks.add(`${highlightedPath[i + 1]}->${highlightedPath[i]}`);
    }
  }

  // Extract crowd redirection links for disabled nodes
  const disabledRedirections = Array.from(nodeMap.values())
    .filter((n) => n.isDisabled && n.dispersedTo)
    .map((n) => {
      const fromPos = NODE_POSITIONS[n.id];
      const toPos = NODE_POSITIONS[n.dispersedTo!];
      return { from: n.id, to: n.dispersedTo!, fromPos, toPos };
    })
    .filter((r) => r.fromPos && r.toPos);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-[#070102] rounded-xl overflow-hidden border border-red-900/40 select-none">
      {/* Background Track Grid Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E10600" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Main SVG Circuit Canvas */}
      <svg viewBox="0 0 1000 600" className="w-full h-full drop-shadow-2xl">
        <defs>
          {/* Arrow Marker Definition for Directional Flow */}
          <marker
            id="flow-arrow"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#E10600" opacity="0.8" />
          </marker>
        </defs>

        {/* 1. Render 23 Circuit Edges */}
        <g className="edges-layer">
          {(edges.length > 0 ? edges : DEFAULT_EDGES).map((edge) => {
            const fromPos = NODE_POSITIONS[edge.from];
            const toPos = NODE_POSITIONS[edge.to];
            if (!fromPos || !toPos) return null;

            const isBlocked = edge.isBlocked;
            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;

            const isHighlighted = pathLinks.has(`${edge.from}->${edge.to}`) || pathLinks.has(`${edge.to}->${edge.from}`);

            return (
              <g key={edge.id} className="cursor-pointer" onClick={() => onEdgeClick(edge.id)}>
                {/* Edge Path Line */}
                <line
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={isBlocked ? '#FF1801' : '#3D0D12'}
                  strokeWidth={isBlocked ? 3 : 2}
                  strokeDasharray={isBlocked ? '6 4' : 'none'}
                  markerEnd={isBlocked ? '' : 'url(#flow-arrow)'}
                  className="transition-all duration-300 hover:stroke-red-400"
                />

                {/* Spectator highlighted route */}
                {isHighlighted && (
                  <line
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke="#06B6D4"
                    strokeWidth="5"
                    strokeLinecap="round"
                    opacity="0.85"
                    className="animate-pulse"
                  />
                )}

                {/* Animated Edge Flow Line if Active Flow */}
                {!isBlocked && edge.flowRate > 0 && !isHighlighted && (
                  <line
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke="#FF1801"
                    strokeWidth="1.5"
                    strokeDasharray="4 8"
                    opacity="0.6"
                    className="animate-[dash_2s_linear_infinite]"
                  />
                )}

                {/* Blocked Edge Closure Icon */}
                {isBlocked && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <circle r="10" fill="#990000" stroke="#FF1801" strokeWidth="1.5" />
                    <line x1="-5" y1="-5" x2="5" y2="5" stroke="#FFFFFF" strokeWidth="2" />
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Inline styles for custom dot flow animations */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes dash {
            to {
              stroke-dashoffset: -20;
            }
          }
          .animate-dash-redir {
            stroke-dasharray: 6, 4;
            animation: dash 1s linear infinite;
          }
        `}} />

        {/* Render Redirection Flow Arrows for Disabled Nodes */}
        <g className="redirections-layer">
          {disabledRedirections.map((r, idx) => {
            const dx = r.toPos.x - r.fromPos.x;
            const dy = r.toPos.y - r.fromPos.y;
            const dr = Math.sqrt(dx * dx + dy * dy);
            
            // Curved arc path between nodes
            const pathData = `M${r.fromPos.x},${r.fromPos.y} A${dr * 1.2},${dr * 1.2} 0 0,1 ${r.toPos.x},${r.toPos.y}`;
            return (
              <g key={`redir-${idx}`} className="opacity-80">
                <path
                  d={pathData}
                  fill="none"
                  stroke="#FF1801"
                  strokeWidth="2.5"
                  className="animate-dash-redir"
                  markerEnd="url(#flow-arrow)"
                />
                {/* Central warning redirection dot */}
                <circle
                  cx={(r.fromPos.x + r.toPos.x) / 2}
                  cy={(r.fromPos.y + r.toPos.y) / 2 - 5}
                  r="7"
                  fill="#0D0305"
                  stroke="#FF1801"
                  strokeWidth="1.5"
                />
                <text
                  x={(r.fromPos.x + r.toPos.x) / 2}
                  y={(r.fromPos.y + r.toPos.y) / 2 - 2.5}
                  textAnchor="middle"
                  fill="#FF1801"
                  fontSize="7"
                  fontWeight="900"
                >
                  ⇄
                </text>
              </g>
            );
          })}
        </g>

        {/* 2. Render Graph Nodes */}
        <g className="nodes-layer">
          {(nodes.length > 0 ? nodes : DEFAULT_NODES).map((nodeData) => {
            const id = nodeData.id;
            const pos = NODE_POSITIONS[id];
            if (!pos) return null; // Skip nodes that do not have coordinates registered on the Silverstone track SVG

            const colors = getNodeColor(nodeData);
            const isSelected = selectedNodeId === id;
            const isCritical = nodeData.riskSeverity === 'CRITICAL' && !nodeData.isDisabled;

            return (
              <g
                key={id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedNodeId(id);
                  onNodeClick(id);
                }}
                onMouseEnter={(e) => {
                  setHoveredNode(nodeData);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Outer Pulsing Risk Glow Halo */}
                <circle
                  r={isCritical ? 24 : 18}
                  fill={colors.glow}
                  className={isCritical ? 'animate-ping opacity-60' : 'opacity-30 group-hover:opacity-70 transition-opacity'}
                />

                {/* Main Node Circle */}
                <circle
                  r="14"
                  fill={colors.fill}
                  stroke={isSelected ? '#FFFFFF' : colors.stroke}
                  strokeWidth={isSelected ? 3 : 1.5}
                  className="shadow-lg transition-transform group-hover:scale-125"
                />

                {/* Node ID Badge Label or Closed Cross */}
                {nodeData.isDisabled ? (
                  <path d="M-5,-5 L5,5 M5,-5 L-5,5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" className="pointer-events-none" />
                ) : (
                  <text
                    y="4"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="8"
                    fontWeight="900"
                    fontFamily="monospace"
                    className="pointer-events-none"
                  >
                    {id.replace(/_/g, '').slice(0, 4)}
                  </text>
                )}

                {/* Node Label Caption underneath */}
                <text
                  y="26"
                  textAnchor="middle"
                  fill={nodeData.isDisabled ? '#94A3B8' : '#FF8888'}
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="sans-serif"
                  className="pointer-events-none tracking-wider uppercase font-mono"
                >
                  {pos.label}
                </text>

                {/* Density % Badge */}
                {!nodeData.isDisabled && (
                  <>
                    <rect
                      x="-16"
                      y="-26"
                      width="32"
                      height="12"
                      rx="3"
                      fill="#0D0305"
                      stroke={colors.fill}
                      strokeWidth="1"
                    />
                    <text
                      y="-17"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="7"
                      fontWeight="800"
                      fontFamily="monospace"
                    >
                      {((nodeData.densityRatio || 0) * 100).toFixed(0)}%
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredNode && <NodeTooltip node={hoveredNode} position={tooltipPos} />}
    </div>
  );
}
