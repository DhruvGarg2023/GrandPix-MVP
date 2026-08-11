'use client';

export default function WhatIfPage() {
  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <div className="f1-card-crimson p-6">
        <h1 className="text-2xl font-black text-white tracking-wider uppercase italic font-sans flex items-center gap-3">
          <span>🧪</span> WHAT-IF <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF1801] to-[#E10600]">&ldquo; SCENARIO STUDIO &rdquo;</span>
        </h1>
        <p className="text-xs text-red-200/70 font-mono mt-1">
          Isolated sandbox simulation workspace to test route closures, gate shutdowns, and weather shifts in real-time
        </p>
      </div>

      <div className="f1-card-crimson p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-900/50 to-red-950/80 border border-red-700/50 flex items-center justify-center text-3xl mx-auto shadow-[0_0_20px_rgba(225,6,0,0.3)]">
          🎛️
        </div>
        <h2 className="text-lg font-extrabold text-white uppercase tracking-wider">Sandbox Scenario Studio Shell</h2>
        <p className="text-xs text-red-200/60 max-w-md mx-auto font-mono">
          Side-by-side baseline vs scenario comparison engine will be fully integrated in Frontend Milestone 7.
        </p>

        <div className="pt-2">
          <button className="f1-btn-pill-red px-6 py-2.5 text-xs font-black tracking-widest">
            SIMULATE GATE B CLOSURE SCENARIO
          </button>
        </div>
      </div>
    </div>
  );
}
