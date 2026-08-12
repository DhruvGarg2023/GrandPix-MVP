'use client';

import { RecommendationPayload } from '@/types';
import { Bot, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        return 'bg-red-950/80 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] ring-1 ring-red-500/30';
      case 'MEDIUM':
        return 'bg-amber-950/80 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/30';
      default:
        return 'bg-slate-900/80 border-slate-700/50 text-slate-300 ring-1 ring-slate-700/30';
    }
  };

  const getActionIcon = (type: string) => {
    if (type.includes('REROUTE')) return <ArrowRight className="w-4 h-4" />;
    if (type.includes('MONITOR')) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    return <ShieldAlert className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="f1-card-crimson p-5 border-l-4 border-l-red-600 space-y-4 relative overflow-hidden group">
      {/* Animated gradient background accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-700 via-red-500 to-orange-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-red-950/60 pb-3">
        <h2 className="text-[11px] font-bold text-white/90 uppercase tracking-[0.2em] flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-red-950/40 border border-red-900/50">
            <Bot className="w-4 h-4 text-red-400 animate-pulse" />
          </div>
          <span>AI Copilot Reasoner</span>
        </h2>
        <div className="flex items-center space-x-2">
          {recommendation?.isFallback && (
            <span className="text-[9px] bg-amber-950/50 border border-amber-500/30 text-amber-300 px-2 py-1 rounded tracking-wider font-semibold">
              FALLBACK MODE
            </span>
          )}
          <span className="bg-red-950/40 border border-red-700/30 text-red-300 px-2.5 py-1 rounded text-[9px] font-mono tracking-wider font-bold shadow-[0_0_10px_rgba(220,38,38,0.2)]">
            {process.env.NEXT_PUBLIC_HF_MODEL?.split('/').pop() || 'HF KIMI-K3'}
          </span>
        </div>
      </div>

      {/* Main Recommendation Content */}
      <div className="flex flex-col min-h-[220px]">
        <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-8 flex flex-col items-center justify-center space-y-4 h-full my-auto"
          >
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-r-2 border-red-500 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-b-2 border-l-2 border-orange-500 rounded-full animate-spin border-opacity-70" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              <Bot className="w-5 h-5 text-red-400 opacity-50" />
            </div>
            <span className="text-xs font-mono text-red-300/60 uppercase tracking-widest animate-pulse">Analyzing telemetry...</span>
          </motion.div>
        ) : recommendation ? (
          <motion.div 
            key="recommendation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-4"
          >
            {/* Priority & Action Type Header */}
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getPriorityBadge(recommendation.priority)}`}>
                {recommendation.priority} PRIORITY
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-orange-400 font-bold uppercase bg-orange-950/20 px-2 py-1 rounded border border-orange-900/30">
                {getActionIcon(recommendation.actionType)}
                <span>{recommendation.actionType.replace(/_/g, ' ')}</span>
              </div>
            </div>

            {/* Action Title */}
            <h3 className="text-sm md:text-base font-extrabold text-white/95 tracking-wide font-sans leading-snug">
              {recommendation.title}
            </h3>

            {/* AI Reasoning Narrative */}
            <div className="bg-[#0D0305]/90 p-4 rounded-xl border border-red-950/80 text-[12px] text-red-100/80 leading-relaxed font-sans shadow-inner max-h-40 overflow-y-auto">
              {recommendation.reasoning}
            </div>

            {/* Apply Mitigation Button */}
            {recommendation.actionType !== 'MAINTAIN_MONITORING' && (
              <button
                onClick={() => onApplyAction(recommendation)}
                className="w-full relative overflow-hidden group/btn rounded-lg p-[1px] mt-2 transition-transform active:scale-[0.98]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 opacity-80 group-hover/btn:opacity-100 transition-opacity"></span>
                <div className="relative bg-[#160508] hover:bg-transparent transition-colors py-3 px-4 rounded-lg flex items-center justify-center space-x-2">
                  <span className="text-xs font-black tracking-[0.2em] text-white">EXECUTE ACTION</span>
                  <ArrowRight className="w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform" />
                </div>
              </button>
            )}
          </motion.div>
        ) : (
          /* Default Monitoring State */
          <motion.div 
            key="default"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center space-y-4 py-6 h-full my-auto"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-950/30 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-[ping_3s_ease-in-out_infinite]"></div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-emerald-400 font-bold font-mono tracking-widest text-sm uppercase">Venue Optimal</h3>
              <p className="text-xs text-red-200/50 font-sans max-w-[250px] leading-relaxed mx-auto">
                AI prediction engine is actively analyzing crowd flow telemetry. No emergency rerouting required.
              </p>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}

