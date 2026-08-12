'use client';

import { WhatIfScenarioResponse } from '@/types';
import { ArrowRight, AlertTriangle, ShieldCheck, Activity, BarChart2, TrendingUp, TrendingDown, Thermometer, Clock, Users, Zap, CheckCircle2 } from 'lucide-react';

interface ScenarioComparisonWidgetProps {
  comparison: WhatIfScenarioResponse | null;
}

export default function ScenarioComparisonWidget({ comparison }: ScenarioComparisonWidgetProps) {
  if (!comparison) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-red-950/40 rounded-xl bg-[#0D0305]/50">
        <Activity className="w-10 h-10 text-red-900/40 mb-3" />
        <p className="text-sm font-mono text-slate-500 uppercase tracking-widest">Select & Run a Scenario to view comparison</p>
      </div>
    );
  }

  const { baseline, sandbox, differential, simulatedMinutes } = comparison;
  const isRiskIncreased = differential.riskDelta > 0;
  const isRiskDecreased = differential.riskDelta < 0;

  // Calculate percentage of max risk (cap at 1.0)
  const baselineRiskPct = Math.min(100, Math.round(baseline.maxRiskScore * 100));
  const sandboxRiskPct = Math.min(100, Math.round(sandbox.maxRiskScore * 100));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Differential Header Banner */}
      <div className={`p-4 rounded-xl border ${
        isRiskIncreased 
          ? 'bg-red-950/40 border-red-800/60' 
          : isRiskDecreased
            ? 'bg-emerald-950/40 border-emerald-800/60'
            : 'bg-slate-900/40 border-slate-700/60'
      } flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          {isRiskIncreased ? (
            <TrendingUp className="w-6 h-6 text-red-500" />
          ) : isRiskDecreased ? (
            <TrendingDown className="w-6 h-6 text-emerald-500" />
          ) : (
            <Activity className="w-6 h-6 text-slate-400" />
          )}
          <div>
            <h3 className="text-sm font-black text-white tracking-widest uppercase">
              Risk Level: {isRiskIncreased ? 'INCREASED' : isRiskDecreased ? 'DECREASED' : 'STABLE'}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Risk Delta: <span className={isRiskIncreased ? 'text-red-400' : isRiskDecreased ? 'text-emerald-400' : 'text-slate-300'}>{differential.riskDelta > 0 ? '+' : ''}{differential.riskDelta}</span> | 
              High Risk Nodes: <span className={differential.highRiskNodeCountDelta > 0 ? 'text-red-400' : 'text-slate-300'}>{differential.highRiskNodeCountDelta > 0 ? '+' : ''}{differential.highRiskNodeCountDelta}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center text-slate-400 text-xs font-mono justify-end">
            <Clock className="w-3 h-3 mr-1" />
            {simulatedMinutes} mins projected
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
            Simulated Sandbox
          </div>
        </div>
      </div>

      {/* Side by Side Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        
        {/* Baseline Card */}
        <div className="f1-card-crimson p-5 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-600"></div>
          <h3 className="text-sm font-black text-slate-300 uppercase tracking-[0.2em] mb-4 flex items-center">
            <BarChart2 className="w-4 h-4 mr-2 opacity-50" />
            Baseline State
          </h3>
          
          <div className="flex-1 space-y-5 font-mono text-xs">
            {/* Visual Risk Bar */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Max Risk Score</span>
                <span className="text-white font-bold">{baseline.maxRiskScore.toFixed(3)}</span>
              </div>
              <div className="w-full bg-black/50 rounded-full h-2 border border-slate-800">
                <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: `${baselineRiskPct}%` }}></div>
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-red-950/50 pb-2">
              <span className="text-slate-500 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> High Risk Nodes</span>
              <span className="text-white font-bold text-sm bg-slate-800/50 px-2 py-0.5 rounded">{baseline.highRiskNodeCount}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-slate-500 flex items-center"><Thermometer className="w-3 h-3 mr-1"/> Conditions</span>
              <span className="text-slate-300 font-bold capitalize text-right">{baseline.weather.replace('_', ' ')} <br/><span className="text-[10px] text-slate-500 uppercase">{baseline.activeEvent}</span></span>
            </div>
          </div>
        </div>

        {/* Arrow Connector (Desktop only) */}
        <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[#070102] border border-red-900/50 rounded-full items-center justify-center shadow-[0_0_15px_rgba(225,6,0,0.3)]">
          <ArrowRight className="w-5 h-5 text-red-500" />
        </div>

        {/* Scenario State Card */}
        <div className="f1-card-crimson p-5 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-600 shadow-[0_0_10px_#E10600]"></div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-4 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-red-500 animate-pulse" />
            Scenario State
          </h3>
          
          <div className="flex-1 space-y-5 font-mono text-xs">
            {/* Visual Risk Bar */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Max Risk Score</span>
                <span className={`${sandbox.maxRiskScore > baseline.maxRiskScore ? 'text-red-400' : 'text-emerald-400'} font-bold text-sm`}>
                  {sandbox.maxRiskScore.toFixed(3)}
                </span>
              </div>
              <div className="w-full bg-black/50 rounded-full h-2 border border-slate-800 relative">
                <div className={`${sandbox.maxRiskScore > baseline.maxRiskScore ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-emerald-500'} h-1.5 rounded-full transition-all duration-1000`} style={{ width: `${sandboxRiskPct}%` }}></div>
                {/* Ghost bar of baseline to show diff */}
                <div className="absolute top-0 left-0 h-1.5 border-r-2 border-white/50 z-10" style={{ width: `${baselineRiskPct}%` }}></div>
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-red-950/50 pb-2">
              <span className="text-slate-500 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> High Risk Nodes</span>
              <span className={`${sandbox.highRiskNodeCount > baseline.highRiskNodeCount ? 'text-red-400 bg-red-950/40 border border-red-900/50' : sandbox.highRiskNodeCount < baseline.highRiskNodeCount ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/50' : 'text-white bg-slate-800/50 border border-slate-700/50'} font-bold text-sm px-2 py-0.5 rounded`}>
                {sandbox.highRiskNodeCount}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-slate-500 flex items-center"><Thermometer className="w-3 h-3 mr-1"/> Conditions</span>
              <span className="text-slate-300 font-bold capitalize text-right">{sandbox.weather.replace('_', ' ')} <br/><span className="text-[10px] text-slate-500 uppercase">{sandbox.activeEvent}</span></span>
            </div>
          </div>
        </div>

      </div>

      {/* Impacted Zones & Mitigation Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Newly Impacted Zones */}
        <div className="md:col-span-1 bg-[#0D0305] border border-red-950/50 rounded-xl p-4">
          <h4 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center">
            <Zap className="w-3 h-3 mr-1 text-yellow-500" />
            Newly Impacted Zones
          </h4>
          {differential.newlyImpactedNodes && differential.newlyImpactedNodes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {differential.newlyImpactedNodes.map(node => (
                <span key={node} className="px-2.5 py-1 rounded bg-red-950/30 border border-red-900/50 text-xs text-red-200 font-mono shadow-[0_0_8px_rgba(225,6,0,0.15)]">
                  {node}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-600 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-emerald-900" />
              No new critical zones detected.
            </div>
          )}
        </div>

        {/* Mitigation Advice */}
        <div className="md:col-span-2">
          {differential.recommendedMitigation && (
            <div className={`h-full border p-5 rounded-xl flex flex-col justify-center relative overflow-hidden ${
              differential.riskDelta >= 0.15 
                ? 'bg-red-950/20 border-red-900/40' 
                : 'bg-emerald-950/10 border-emerald-900/20'
            }`}>
              {/* Background Icon */}
              <AlertTriangle className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.03] ${differential.riskDelta >= 0.15 ? 'text-red-500' : 'text-emerald-500'}`} />
              
              <div className="flex items-start space-x-4 relative z-10">
                {differential.riskDelta >= 0.15 ? (
                  <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0 mt-1 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-1" />
                )}
                
                <div>
                  <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${
                    differential.riskDelta >= 0.15 ? 'text-orange-400' : 'text-emerald-400'
                  }`}>
                    AI Recommended Mitigation
                  </h4>
                  <p className="text-sm text-slate-300 font-mono leading-relaxed">
                    {differential.recommendedMitigation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
