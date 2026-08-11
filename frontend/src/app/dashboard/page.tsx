'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await api.getHealth();
        setHealthStatus(res);
        setLoading(false);
      } catch (err: any) {
        console.error('Backend health check failed:', err);
        setError(err.message || 'Failed to connect to backend server');
        setLoading(false);
      }
    }
    checkBackend();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Graphic Header Strip with Bold F1 Quote Style (Matching Reference Image) */}
      <div className="f1-card-crimson p-6 relative overflow-hidden">
        {/* Background Speed Lines Accent */}
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-red-600/20 to-transparent pointer-events-none skew-x-12"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="text-red-500 text-xs font-mono font-bold tracking-widest uppercase bg-red-950/80 px-2.5 py-1 rounded border border-red-800/60">
                OFFICIAL OPERATIONS CENTER
              </span>
              <span className="text-slate-400 text-xs font-mono">SILVERSTONE CIRCUIT</span>
            </div>
            
            {/* Bold Display Headline matching "FORMULA ONE" Graphic Header */}
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-wider uppercase italic font-sans flex items-center gap-3">
              FORMULA <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF1801] to-[#E10600] drop-shadow-[0_0_15px_rgba(225,6,0,0.8)]">&ldquo; ONE &rdquo;</span> CROWD CONTROL
            </h1>
            
            <p className="text-xs sm:text-sm text-red-200/70 font-mono mt-1 max-w-2xl">
              Real-time multi-agent crowd twin (2,000 agents), dynamic A* rerouting & ML congestion predictions
            </p>
          </div>

          {/* Action Control Button (Signature Red Pill Button like SELECT in image) */}
          <div className="flex items-center space-x-3">
            <button className="f1-btn-pill-red px-6 py-2.5 text-xs font-black tracking-widest shadow-[0_0_20px_rgba(225,6,0,0.6)]">
              SELECT RACE SCENARIO
            </button>
          </div>
        </div>
      </div>

      {/* Backend Health Status Alert Banner */}
      {error && (
        <div className="bg-red-950/90 border border-red-600 text-red-100 p-4 rounded-xl text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_25px_rgba(225,6,0,0.3)]">
          <div>
            <strong className="text-red-400 font-mono uppercase tracking-wider">⚠️ Backend Gateway Offline:</strong> {error}
            <div className="text-xs text-red-300/80 mt-0.5">Check that the Node.js Express server is listening on <code className="bg-red-900/60 px-1.5 py-0.5 rounded font-mono text-white">http://localhost:5000</code>.</div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="f1-btn-pill-red px-4 py-1.5 text-xs"
          >
            RETRY CONNECTION
          </button>
        </div>
      )}

      {/* Grid Workspace Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Circuit Map Canvas */}
        <div className="lg:col-span-2 f1-card-crimson p-6 min-h-[480px] flex flex-col justify-between relative">
          <div className="flex items-center justify-between border-b border-red-950/80 pb-3">
            <h2 className="text-xs font-bold text-red-100 tracking-widest uppercase font-mono flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              Silverstone Circuit Interactive Digital Twin Map
            </h2>
            <span className="f1-badge-red px-2.5 py-0.5 rounded text-[10px]">
              18 NODES • 23 EDGES
            </span>
          </div>

          {/* Map Display Placeholder Canvas with F1 Grid Styling */}
          <div className="flex-1 flex flex-col items-center justify-center border border-red-900/30 rounded-xl my-4 p-8 text-center bg-[#090203]/70 backdrop-blur-md relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-900/50 to-red-950/80 border border-red-700/50 flex items-center justify-center text-red-400 mb-3 text-2xl shadow-[0_0_20px_rgba(225,6,0,0.3)] font-black italic">
              F1
            </div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider font-sans">Circuit Telemetry & Heatmap Canvas</h3>
            <p className="text-xs text-red-200/60 max-w-md mt-1 font-mono">
              Leaflet / MapLibre SVG interactive graph overlay will render live agent density heatmaps and edge flow arrows here in Frontend Milestone 3.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-red-200/70 font-mono pt-3 border-t border-red-950/80">
            <span>Simulation Clock: <strong className="text-white">16:20 (PRACTICE)</strong></span>
            <span>Total Agents: <strong className="text-red-400">2,000</strong></span>
            <span>Tick Speed: <strong className="text-white">10s / Tick</strong></span>
          </div>
        </div>

        {/* Right Column: F1 Operations & AI Intelligence Panels */}
        <div className="space-y-6">
          {/* Multi-Factor Venue Risk Panel */}
          <div className="f1-card-crimson p-5">
            <div className="flex items-center justify-between border-b border-red-950/80 pb-3 mb-4">
              <h2 className="text-xs font-bold text-red-100 uppercase tracking-widest font-mono">Venue Risk Summary</h2>
              <span className="bg-emerald-950 border border-emerald-700 text-emerald-400 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold">
                SAFE (0.18)
              </span>
            </div>
            <p className="text-xs text-red-200/70 mb-3 font-mono">Deterministic multi-factor venue congestion score</p>
            <div className="h-2.5 bg-red-950 rounded-full overflow-hidden border border-red-900/40 p-0.5">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full w-[18%] transition-all"></div>
            </div>
          </div>

          {/* AI Copilot Panel (Styled like reference graphic callouts) */}
          <div className="f1-card-crimson p-5 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between border-b border-red-950/80 pb-3 mb-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
                <span className="text-purple-400">🤖</span> AI Copilot Reasoner
              </h2>
              <span className="bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded font-mono text-[10px]">
                HF INFERENCE
              </span>
            </div>
            <p className="text-xs text-red-100/90 leading-relaxed font-sans">
              Monitoring active spectator movements across Silverstone Circuit graph nodes. Venue densities are currently within optimal safety thresholds.
            </p>
          </div>

          {/* F1 Red Pill Action Quick Panel */}
          <div className="f1-card-crimson p-5 space-y-3">
            <h3 className="text-xs font-extrabold text-white tracking-widest uppercase font-mono">
              Quick Operations Command
            </h3>
            <button className="w-full f1-btn-pill-red py-2.5 text-xs font-black tracking-widest">
              START SIMULATION LOOP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
