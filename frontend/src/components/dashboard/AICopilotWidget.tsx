'use client';

import { RecommendationPayload } from '@/types';
import { Bot, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AICopilotWidgetProps {
  recommendation?: RecommendationPayload | null;
  onApplyAction?: (rec: RecommendationPayload) => void;
  isLoading?: boolean;
}

export default function AICopilotWidget({
  recommendation,
  onApplyAction = () => {},
  isLoading = false,
}: AICopilotWidgetProps) {
  // Priority Tag Helper
  const getPriorityBadge = (prio: string = 'MEDIUM') => {
    switch (prio) {
      case 'URGENT':
      case 'HIGH':
        return 'bg-red-950 border-red-600 text-red-200 shadow-[0_0_10px_rgba(225,6,0,0.5)]';
      case 'MEDIUM':
        return 'bg-amber-950 border-amber-600 text-amber-200';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="f1-card-crimson p-5 border-l-4 border-l-purple-500 space-y-3.5">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-red-950 pb-3">
        <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <span>AI Copilot Reasoner</span>
        </h2>
        <div className="flex items-center space-x-2">
          {recommendation?.isFallback && (
            <span className="text-[10px] bg-red-950 border border-red-800 text-red-300 px-1.5 py-0.5 rounded font-mono">
              RULE FALLBACK
            </span>
          )}
          <span className="bg-purple-950/80 border border-purple-800 text-purple-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
            HF MISTRAL-7B
          </span>
        </div>
      </div>

      {/* Main Recommendation Content */}
      {isLoading ? (
        <div className="py-6 text-center text-xs font-mono text-slate-400 flex items-center justify-center space-x-2">
          <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Analyzing venue risk telemetry...</span>
        </div>
      ) : recommendation ? (
        <div className="space-y-3">
          {/* Priority & Action Type Header */}
          <div className="flex items-center justify-between">
            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-black uppercase ${getPriorityBadge(recommendation.priority)}`}>
              {recommendation.priority} PRIORITY
            </span>
            <span className="text-[11px] font-mono text-red-300 font-bold uppercase">
              {recommendation.actionType.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Action Title */}
          <h3 className="text-sm font-extrabold text-white tracking-wide font-sans">
            {recommendation.title}
          </h3>

          {/* AI Reasoning Narrative */}
          <p className="text-xs text-red-100/90 leading-relaxed font-sans bg-[#0D0305] p-3 rounded-lg border border-red-950">
            {recommendation.reasoning}
          </p>

          {/* Apply Mitigation Button */}
          {recommendation.actionType !== 'MAINTAIN_MONITORING' && (
            <button
              onClick={() => onApplyAction(recommendation)}
              className="w-full f1-btn-pill-red py-2.5 text-xs font-black tracking-widest flex items-center justify-center space-x-2"
            >
              <span>EXECUTE {recommendation.actionType.replace(/_/g, ' ')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        /* Default Monitoring State */
        <div className="bg-[#0D0305] p-4 rounded-lg border border-red-950 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold font-mono">
            <CheckCircle2 className="w-4 h-4" />
            <span>VENUE OPERATING NORMALLY</span>
          </div>
          <p className="text-red-200/70 font-sans">
            AI reasoning engine actively monitoring graph node flow rates. No emergency crowd rerouting or gate diversions required.
          </p>
        </div>
      )}
    </div>
  );
}
