'use client';

import { IncidentPayload } from '@/types';
import { CloudRain, ShieldAlert, Ambulance, AlertOctagon } from 'lucide-react';
import { useState } from 'react';

interface IncidentControlPanelProps {
  onTriggerIncident: (payload: IncidentPayload) => Promise<void>;
  disabled?: boolean;
}

export default function IncidentControlPanel({
  onTriggerIncident,
  disabled = false
}: IncidentControlPanelProps) {
  const [loadingType, setLoadingType] = useState<string | null>(null);

  const handleTrigger = async (type: string, payload: Partial<IncidentPayload>) => {
    setLoadingType(type);
    try {
      await onTriggerIncident({
        time: '', // The parent or backend handles real time
        type: payload.type as any,
        ...payload
      } as IncidentPayload);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="f1-card-crimson p-5 border-t-4 border-t-orange-600 space-y-4">
      <div className="flex items-center justify-between border-b border-red-950 pb-3">
        <h2 className="text-[11px] font-bold text-white/90 uppercase tracking-[0.2em] flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-orange-950/40 border border-orange-900/50">
            <AlertOctagon className="w-4 h-4 text-orange-400" />
          </div>
          <span>Incident Control Center</span>
        </h2>
        <span className="text-[9px] bg-red-950/40 text-red-300 px-2 py-0.5 rounded border border-red-800/30 uppercase tracking-widest">
          Manual Override
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Close Edge E16 */}
        <button
          disabled={disabled || loadingType === 'route_closure'}
          onClick={() => handleTrigger('route_closure', { type: 'route_closure' as any, edge_id: 'E16' })}
          className="group relative overflow-hidden bg-[#0D0305] border border-red-950/60 hover:border-red-500/50 rounded-lg p-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-red-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex flex-col items-center justify-center space-y-2 text-center">
            <ShieldAlert className={`w-5 h-5 text-red-500 ${loadingType === 'route_closure' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-black tracking-wider text-red-200 group-hover:text-white transition-colors">
              CLOSE ROUTE E16
            </span>
          </div>
        </button>

        {/* Heavy Rain */}
        <button
          disabled={disabled || loadingType === 'weather_change'}
          onClick={() => handleTrigger('weather_change', { type: 'weather_change' as any, value: 'heavy_rain' })}
          className="group relative overflow-hidden bg-[#0D0305] border border-blue-950/60 hover:border-blue-500/50 rounded-lg p-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-blue-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex flex-col items-center justify-center space-y-2 text-center">
            <CloudRain className={`w-5 h-5 text-blue-400 ${loadingType === 'weather_change' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-black tracking-wider text-blue-200 group-hover:text-white transition-colors">
              HEAVY RAIN
            </span>
          </div>
        </button>

        {/* Medical Incident */}
        <button
          disabled={disabled || loadingType === 'medical_incident'}
          onClick={() => handleTrigger('medical_incident', { type: 'medical_incident' as any, node_id: 'GS_B' })}
          className="group relative overflow-hidden bg-[#0D0305] border border-orange-950/60 hover:border-orange-500/50 rounded-lg p-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-orange-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex flex-col items-center justify-center space-y-2 text-center">
            <Ambulance className={`w-5 h-5 text-orange-400 ${loadingType === 'medical_incident' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-black tracking-wider text-orange-200 group-hover:text-white transition-colors">
              MEDICAL @ GS_B
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
