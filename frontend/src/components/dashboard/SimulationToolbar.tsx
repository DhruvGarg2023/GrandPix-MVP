'use client';

import { Play, Pause, RotateCcw, FastForward, SkipForward } from 'lucide-react';

interface SimulationToolbarProps {
  isRunning?: boolean;
  speedMultiplier?: number;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onReset?: () => void;
  onStepTick?: () => void;
  onSpeedChange?: (speed: number) => void;
}

export default function SimulationToolbar({
  isRunning = false,
  speedMultiplier = 1,
  onStart = () => {},
  onPause = () => {},
  onResume = () => {},
  onReset = () => {},
  onStepTick = () => {},
  onSpeedChange = () => {},
}: SimulationToolbarProps) {
  return (
    <div className="f1-card-crimson p-4 flex flex-wrap items-center justify-between gap-4">
      {/* Control Buttons */}
      <div className="flex items-center space-x-3">
        {/* Play/Pause Toggle Pill */}
        {isRunning ? (
          <button
            onClick={onPause}
            className="f1-btn-pill-red px-5 py-2 text-xs font-black flex items-center space-x-2 shadow-[0_0_15px_rgba(225,6,0,0.5)]"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>PAUSE SIMULATION</span>
          </button>
        ) : (
          <button
            onClick={onStart}
            className="f1-btn-pill-red px-5 py-2 text-xs font-black flex items-center space-x-2 shadow-[0_0_20px_rgba(225,6,0,0.6)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START SIMULATION</span>
          </button>
        )}

        {/* Step Single Tick */}
        <button
          onClick={onStepTick}
          disabled={isRunning}
          className="bg-[#120406] hover:bg-red-950/80 text-red-200 border border-red-900/60 disabled:opacity-40 px-3.5 py-2 rounded-full text-xs font-mono font-bold transition-all flex items-center space-x-1.5"
        >
          <SkipForward className="w-3 h-3" />
          <span>STEP TICK</span>
        </button>

        {/* Reset State Button */}
        <button
          onClick={onReset}
          className="bg-[#120406] hover:bg-red-950/80 text-red-300 border border-red-900/60 px-3.5 py-2 rounded-full text-xs font-mono font-bold transition-all flex items-center space-x-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESET STATE</span>
        </button>
      </div>

      {/* Speed Multiplier Selectors */}
      <div className="flex items-center space-x-2 bg-[#0D0305] border border-red-950 px-3 py-1.5 rounded-full text-xs font-mono">
        <FastForward className="w-3.5 h-3.5 text-red-400" />
        <span className="text-slate-400 mr-1">SPEED:</span>
        {[1, 2, 5].map((spd) => (
          <button
            key={spd}
            onClick={() => onSpeedChange(spd)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              speedMultiplier === spd
                ? 'bg-red-600 text-white shadow-[0_0_8px_#FF1801]'
                : 'text-red-300 hover:text-white hover:bg-red-950/60'
            }`}
          >
            {spd}x
          </button>
        ))}
      </div>
    </div>
  );
}
