'use client';

export default function SpectatorPage() {
  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="f1-card-crimson p-6">
        <h1 className="text-2xl font-black text-white tracking-wider uppercase italic font-sans flex items-center gap-3">
          <span>🏁</span> SPECTATOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF1801] to-[#E10600]">&ldquo; ROUTE OPTIMISER &rdquo;</span>
        </h1>
        <p className="text-xs text-red-200/70 font-mono mt-1">
          Real-time low-congestion walking paths, blocked route alerts & exit wait time guidance for Grand Prix attendees
        </p>
      </div>

      <div className="f1-card-crimson p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-900/50 to-red-950/80 border border-red-700/50 flex items-center justify-center text-3xl mx-auto shadow-[0_0_20px_rgba(225,6,0,0.3)]">
          📱
        </div>
        <h2 className="text-lg font-extrabold text-white uppercase tracking-wider">Spectator Mobile Navigation Shell</h2>
        <p className="text-xs text-red-200/60 max-w-md mx-auto font-mono">
          Interactive route navigation, live queue wait times, and exit rush recommendations will be fully integrated in Frontend Milestone 8.
        </p>

        <div className="pt-2">
          <button className="f1-btn-pill-red px-6 py-2.5 text-xs font-black tracking-widest">
            FIND LOW CONGESTION ROUTE
          </button>
        </div>
      </div>
    </div>
  );
}
