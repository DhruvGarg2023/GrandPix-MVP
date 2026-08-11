'use client';

import { RiskSeverity, NodeState } from '@/types';
import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface RiskSummaryWidgetProps {
  score?: number;
  severity?: RiskSeverity;
  highestRiskNode?: NodeState;
  highRiskCount?: number;
  criticalCount?: number;
}

export default function RiskSummaryWidget({
  score = 0.18,
  severity = 'SAFE',
  highestRiskNode,
  highRiskCount = 0,
  criticalCount = 0,
}: RiskSummaryWidgetProps) {
  // Severity styling lookup
  const getSeverityBadge = (sev: RiskSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-950/90 border-red-600 text-red-100 shadow-[0_0_15px_rgba(255,24,1,0.7)] animate-pulse',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-red-500" />,
          barColor: 'bg-red-600',
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-950/90 border-orange-600 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.5)]',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
          barColor: 'bg-orange-500',
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-950/90 border-amber-600 text-amber-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          barColor: 'bg-amber-500',
        };
      default:
        return {
          bg: 'bg-emerald-950/90 border-emerald-600 text-emerald-300',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
          barColor: 'bg-emerald-500',
        };
    }
  };

  const badgeStyle = getSeverityBadge(severity);

  return (
    <div className="f1-card-crimson p-5 space-y-4">
      {/* Header & Severity Pill Badge */}
      <div className="flex items-center justify-between border-b border-red-950 pb-3">
        <h2 className="text-xs font-bold text-red-100 uppercase tracking-widest font-mono flex items-center gap-2">
          <span>🛡️</span> Multi-Factor Venue Risk
        </h2>
        <div className={`px-2.5 py-1 rounded-full border text-[11px] font-mono font-extrabold flex items-center space-x-1.5 ${badgeStyle.bg}`}>
          {badgeStyle.icon}
          <span>{severity} ({(score * 100).toFixed(0)}%)</span>
        </div>
      </div>

      {/* Main Score Bar Meter */}
      <div>
        <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
          <span>VENUE RISK SCORE</span>
          <span className="font-extrabold text-white">{score.toFixed(2)} / 1.00</span>
        </div>
        <div className="h-3 bg-[#0D0305] rounded-full overflow-hidden border border-red-900/40 p-0.5 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ${badgeStyle.barColor}`}
            style={{ width: `${Math.min(100, Math.max(5, score * 100))}%` }}
          ></div>
        </div>
      </div>

      {/* Risk Factors Weight Breakdown Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="bg-[#0D0305] p-2 rounded border border-red-950 flex justify-between">
          <span className="text-slate-400">Node Density (40%):</span>
          <span className="text-red-300 font-bold">{(score * 0.4 * 100).toFixed(0)}%</span>
        </div>
        <div className="bg-[#0D0305] p-2 rounded border border-red-950 flex justify-between">
          <span className="text-slate-400">Flow Rate (20%):</span>
          <span className="text-red-300 font-bold">{(score * 0.2 * 100).toFixed(0)}%</span>
        </div>
        <div className="bg-[#0D0305] p-2 rounded border border-red-950 flex justify-between">
          <span className="text-slate-400">Queues (15%):</span>
          <span className="text-red-300 font-bold">{(score * 0.15 * 100).toFixed(0)}%</span>
        </div>
        <div className="bg-[#0D0305] p-2 rounded border border-red-950 flex justify-between">
          <span className="text-slate-400">Weather (10%):</span>
          <span className="text-red-300 font-bold">{(score * 0.10 * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Highest Risk Node Callout Alert */}
      {highestRiskNode && (
        <div className="bg-red-950/40 border border-red-800/60 p-2.5 rounded-lg text-xs font-mono flex items-center justify-between">
          <span className="text-slate-300">Peak Risk Node:</span>
          <span className="font-extrabold text-red-400">{highestRiskNode.id} ({(highestRiskNode.densityRatio * 100).toFixed(0)}%)</span>
        </div>
      )}
    </div>
  );
}
