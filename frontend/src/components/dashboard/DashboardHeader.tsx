'use client';

import { WeatherState } from '@/types';

interface DashboardHeaderProps {
  circuitName?: string;
  simTime?: string;
  activeEvent?: string;
  weather?: WeatherState;
  isConnected?: boolean;
}

export default function DashboardHeader({
  circuitName = 'SILVERSTONE CIRCUIT',
  simTime = '16:20',
  activeEvent = 'PRACTICE',
  weather = { condition: 'sunny', intensity: 0.1 },
  isConnected = true,
}: DashboardHeaderProps) {
  // Helper for Event Badges
  const getEventBadgeColor = (evt: string) => {
    switch (evt) {
      case 'RACE':
        return 'bg-red-600 border-red-400 text-white shadow-[0_0_12px_rgba(255,24,1,0.6)]';
      case 'QUALIFYING':
        return 'bg-amber-600 border-amber-400 text-white';
      case 'EXIT_RUSH':
        return 'bg-orange-600 border-orange-400 text-white animate-pulse';
      case 'PIT_LANE_WALK':
        return 'bg-purple-600 border-purple-400 text-white';
      default:
        return 'bg-red-950/80 border-red-800 text-red-200';
    }
  };

  // Helper for Weather Badges
  const getWeatherIcon = (cond: string) => {
    switch (cond) {
      case 'rain':
        return '🌧️ Rain';
      case 'heavy_rain':
        return '⛈️ Heavy Rain';
      case 'cloudy':
        return '☁️ Cloudy';
      default:
        return '☀️ Sunny';
    }
  };

  return (
    <div className="f1-card-crimson p-5 relative overflow-hidden">
      {/* Background Speed Accent overlay */}
      <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-red-600/15 to-transparent pointer-events-none skew-x-12"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Circuit Badge */}
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase bg-red-950/80 px-2.5 py-0.5 rounded border border-red-800/60 text-red-400">
              OFFICIAL RACE CONTROL
            </span>
            <span className="text-xs font-mono text-red-200/70">{circuitName} • DIGITAL TWIN</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black text-white tracking-wider uppercase italic font-sans flex items-center gap-2">
            FORMULA <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF1801] to-[#E10600] drop-shadow-[0_0_12px_rgba(225,6,0,0.8)]">&ldquo; ONE &rdquo;</span> CROWD CONTROL
          </h1>
        </div>

        {/* Live Telemetry Status Indicators */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* Clock Display */}
          <div className="bg-[#0D0305] border border-red-900/60 px-3 py-1.5 rounded-lg flex items-center space-x-2">
            <span className="text-slate-400">TIME:</span>
            <span className="font-extrabold text-white text-sm tracking-wider">{simTime}</span>
          </div>

          {/* Active F1 Event Badge */}
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold tracking-wider uppercase flex items-center space-x-1.5 ${getEventBadgeColor(activeEvent)}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            <span>{activeEvent.replace(/_/g, ' ')}</span>
          </div>

          {/* Weather Badge */}
          <div className="bg-[#0D0305] border border-red-900/60 text-red-200 px-3 py-1.5 rounded-lg flex items-center space-x-2">
            <span>{getWeatherIcon(weather.condition)}</span>
            <span className="text-[10px] text-slate-400">({(weather.intensity * 100).toFixed(0)}%)</span>
          </div>

          {/* Socket Gateway Connection Indicator */}
          <div className="bg-[#0D0305] border border-red-900/60 px-3 py-1.5 rounded-lg flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-[11px] text-slate-200">{isConnected ? 'LIVE GATEWAY' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
