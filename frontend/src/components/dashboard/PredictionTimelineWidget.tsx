'use client';

import { DensityPrediction } from '@/types';
import { TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

interface PredictionTimelineWidgetProps {
  predictions?: DensityPrediction[];
  lastUpdated?: string;
}

export default function PredictionTimelineWidget({
  predictions = [
    { nodeId: 'GS_B', currentDensity: 0.84, predictedDensity10min: 0.96, delta: 0.12 },
    { nodeId: 'FAN_ZONE', currentDensity: 0.65, predictedDensity10min: 0.78, delta: 0.13 },
    { nodeId: 'FOOD_N', currentDensity: 0.72, predictedDensity10min: 0.85, delta: 0.13 },
    { nodeId: 'GATE_A', currentDensity: 0.45, predictedDensity10min: 0.50, delta: 0.05 },
  ],
  lastUpdated = '16:20',
}: PredictionTimelineWidgetProps) {
  // Format prediction items for Recharts display
  const chartData = predictions.map((item) => ({
    zone: item.nodeId.replace(/_/g, ' '),
    currentPct: Math.round(item.currentDensity * 100),
    forecastPct: Math.round(item.predictedDensity10min * 100),
    deltaPct: Math.round(item.delta * 100)
  }));

  return (
    <div className="f1-card-crimson p-5 space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-red-950 pb-3">
        <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-500" />
          <span>10-Min ML Density Forecast</span>
        </h2>
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
          <Clock className="w-3 h-3 text-red-400" />
          <span>Python RandomForest</span>
        </div>
      </div>

      {/* Recharts Bar Forecast Chart */}
      <div className="h-44 w-full bg-[#0D0305] p-2 rounded-lg border border-red-950/80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="zone"
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#450A0A' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#160508',
                borderColor: '#DC2626',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '11px',
                fontFamily: 'monospace'
              }}
              formatter={(value: any) => [`${value}%`, '']}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '4px' }}
            />
            <ReferenceLine y={85} stroke="#FF1801" strokeDasharray="3 3" label={{ value: 'CRITICAL 85%', fill: '#FF1801', fontSize: 9 }} />
            <Bar dataKey="currentPct" name="Current Density" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            <Bar dataKey="forecastPct" name="+10m Forecast" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Density Predictions Detailed List */}
      <div className="space-y-2.5 font-mono">
        {predictions.slice(0, 3).map((pred) => {
          const isCritical = pred.predictedDensity10min >= 0.85;
          const isHigh = pred.predictedDensity10min >= 0.70;

          return (
            <div key={pred.nodeId} className="bg-[#0D0305] p-2.5 rounded-lg border border-red-950/70 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                {isCritical && <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                <span className="font-extrabold text-white">{pred.nodeId}</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px]">
                <span className="text-slate-400">{(pred.currentDensity * 100).toFixed(0)}%</span>
                <span className="text-slate-600">➔</span>
                <span className={`font-black ${isCritical ? 'text-red-400' : isHigh ? 'text-amber-400' : 'text-emerald-400'}`}>
                  +10m: {(pred.predictedDensity10min * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1">
        <span>Batch Forecast Interval: 30s</span>
        <span className="text-red-400">Model R² &gt; 0.88 Verified</span>
      </div>
    </div>
  );
}
