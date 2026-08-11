import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'F1 Crowd Intelligence Platform | GrandPix MVP',
  description: 'Real-time venue digital twin, dynamic crowd flow optimizer, and AI-powered operations control center for Formula 1 Grand Prix events.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070102] text-white antialiased min-h-screen flex flex-col relative selection:bg-red-600 selection:text-white">
        {/* Subtle Top Crimson Glow Overlay */}
        <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-red-600/20 via-red-950/10 to-transparent blur-3xl opacity-60 z-0"></div>

        {/* Global F1 Command Center Top Navigation Header */}
        <header className="sticky top-0 z-50 bg-[#0E0305]/90 backdrop-blur-xl border-b border-red-900/40 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="flex items-center space-x-3.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF1801] via-[#E10600] to-[#8B0000] flex items-center justify-center font-black text-white text-sm tracking-tighter shadow-[0_0_20px_rgba(225,6,0,0.6)] border border-white/30 group-hover:scale-105 transition-transform italic">
                F1
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="font-black tracking-wider text-white text-sm lg:text-base uppercase group-hover:text-red-400 transition-colors">
                    CROWD INTELLIGENCE
                  </span>
                  <span className="text-red-500 font-extrabold text-xs tracking-widest italic bg-red-950/80 border border-red-800/60 px-1.5 py-0.5 rounded">
                    MVP
                  </span>
                </div>
                <span className="text-[10px] text-red-200/70 tracking-widest uppercase font-mono">
                  SILVERSTONE CIRCUIT • REAL-TIME DIGITAL TWIN
                </span>
              </div>
            </Link>

            {/* Navigation Tabs with Red Pill Active Indicators */}
            <nav className="hidden md:flex items-center space-x-2 pl-6 border-l border-red-950 text-xs font-bold uppercase tracking-wider">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-full text-white bg-gradient-to-r from-red-700/80 to-red-900/80 border border-red-500/40 shadow-[0_0_12px_rgba(225,6,0,0.3)] hover:scale-105 transition-all flex items-center space-x-2"
              >
                <span>Control Center</span>
              </Link>
              <Link
                href="/what-if"
                className="px-4 py-2 rounded-full text-red-200/80 hover:text-white hover:bg-red-950/60 hover:border hover:border-red-800/50 transition-all flex items-center space-x-2"
              >
                <span>What-If Studio</span>
              </Link>
              <Link
                href="/spectator"
                className="px-4 py-2 rounded-full text-red-200/80 hover:text-white hover:bg-red-950/60 hover:border hover:border-red-800/50 transition-all flex items-center space-x-2"
              >
                <span>Spectator Route Optimizer</span>
              </Link>
            </nav>
          </div>

          {/* Right Header Status Indicators */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5 bg-[#170507] border border-red-900/50 px-3.5 py-1.5 rounded-full text-xs font-mono shadow-inner">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_8px_#FF1801]"></span>
              </span>
              <span className="text-red-100 font-semibold tracking-wide">RACE CONTROL LIVE</span>
            </div>
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="relative z-10 flex-1 flex flex-col p-4 lg:p-6 max-w-[1920px] w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-red-950/80 bg-[#070102] px-6 py-3.5 text-center text-xs text-red-300/50 font-mono">
          F1 Crowd Flow Optimiser & Digital Twin • Powered by Node.js, Python ML (RandomForest) & Hugging Face AI
        </footer>
      </body>
    </html>
  );
}
