'use client';

import { NodeState } from '@/types';
import { ShieldCheck, AlertTriangle, ShieldAlert, Users, Clock } from 'lucide-react';

interface NodeTooltipProps {
  node: NodeState;
  position: { x: number; y: number };
}

export default function NodeTooltip({ node, position }: NodeTooltipProps) {
  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          badge: 'bg-red-950 border-red-600 text-red-200 animate-pulse',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-red-500" />,
        };
      case 'HIGH':
        return {
          badge: 'bg-orange-950 border-orange-600 text-orange-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
        };
      case 'MODERATE':
        return {
          badge: 'bg-amber-950 border-amber-600 text-amber-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        };
      default:
        return {
          badge: 'bg-emerald-950 border-emerald-600 text-emerald-300',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
        };
    }
  };

  const style = getSeverityStyle(node.riskSeverity);

  return (
    <div
      className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 w-64 f1-card-crimson p-3.5 shadow-[0_10px_25px_rgba(0,0,0,0.9)] border border-red-600/40 text-xs font-mono space-y-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Tooltip Header */}
      <div className="flex items-center justify-between border-b border-red-950 pb-2">
        <div>
          <h4 className="font-extrabold text-white text-sm tracking-wider uppercase">{node.id}</h4>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest">{node.type.replace(/_/g, ' ')}</span>
        </div>
        <div className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase flex items-center space-x-1 ${style.badge}`}>
          {style.icon}
          <span>{node.riskSeverity}</span>
        </div>
      </div>

      {/* Occupancy & Capacity Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-slate-300">
          <span className="flex items-center space-x-1">
            <Users className="w-3 h-3 text-red-400" />
            <span>OCCUPANCY:</span>
          </span>
          <span className="font-extrabold text-white">
            {(node.occupancy || 0).toLocaleString()} / {(node.capacity || 0).toLocaleString()}
          </span>
        </div>
        <div className="h-2 bg-[#080203] rounded-full overflow-hidden border border-red-950">
          <div
            className={`h-full transition-all duration-300 ${
              node.densityRatio >= 0.85
                ? 'bg-red-600'
                : node.densityRatio >= 0.70
                ? 'bg-orange-500'
                : node.densityRatio >= 0.50
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(2, (node.densityRatio || 0) * 100))}%` }}
          ></div>
        </div>
      </div>

      {/* Density & Risk Metrics */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
        <div className="bg-[#0D0305] p-1.5 rounded border border-red-950 flex justify-between">
          <span className="text-slate-400">DENSITY:</span>
          <span className="font-bold text-red-300 font-mono">{((node.densityRatio || 0) * 100).toFixed(1)}%</span>
        </div>
        <div className="bg-[#0D0305] p-1.5 rounded border border-red-950 flex justify-between">
          <span className="text-slate-400">RISK SCORE:</span>
          <span className="font-bold text-red-300 font-mono">{(node.riskScore || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Queue Wait Time (If Queue Node) */}
      {node.queueLength !== undefined && node.queueLength > 0 && (
        <div className="bg-red-950/60 border border-red-800/80 p-1.5 rounded text-[10px] flex items-center justify-between text-red-200">
          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-red-400" />
            <span>EST. QUEUE WAIT:</span>
          </span>
          <span className="font-extrabold text-white">{(node.waitMinutes || 0).toFixed(1)} MIN</span>
        </div>
      )}
    </div>
  );
}
