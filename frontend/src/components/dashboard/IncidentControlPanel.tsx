'use client';

import { IncidentPayload } from '@/types';
import { CloudRain, ShieldAlert, Ambulance, AlertOctagon, Sun, Clock } from 'lucide-react';
import { useState } from 'react';

interface IncidentControlPanelProps {
  onTriggerIncident: (payload: IncidentPayload) => Promise<void>;
  onResolveIncident: (payload: Partial<IncidentPayload>) => Promise<void>;
  disabled?: boolean;
}

export default function IncidentControlPanel({
  onTriggerIncident,
  onResolveIncident,
  disabled = false
}: IncidentControlPanelProps) {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [activeIncidents, setActiveIncidents] = useState<Record<string, boolean>>({});

  const handleToggle = async (type: string, idKey: string, payload: Partial<IncidentPayload>) => {
    setLoadingType(idKey);
    const isActive = activeIncidents[idKey];
    try {
      if (isActive) {
        await onResolveIncident({ ...payload, type: payload.type as any });
        setActiveIncidents(prev => ({ ...prev, [idKey]: false }));
      } else {
        await onTriggerIncident({
          time: '', 
          type: payload.type as any,
          ...payload
        } as IncidentPayload);
        setActiveIncidents(prev => ({ ...prev, [idKey]: true }));
      }
    } finally {
      setLoadingType(null);
    }
  };

  const getButtonClasses = (idKey: string, baseColor: string) => {
    const isActive = activeIncidents[idKey];
    if (isActive) {
      return `group relative overflow-hidden bg-${baseColor}-950/80 border border-${baseColor}-500 shadow-[0_0_15px_rgba(var(--${baseColor}-rgb),0.3)] rounded-lg p-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`;
    }
    return `group relative overflow-hidden bg-[#0D0305] border border-${baseColor}-950/60 hover:border-${baseColor}-500/50 rounded-lg p-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`;
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
          disabled={disabled || loadingType === 'E16'}
          onClick={() => handleToggle('route_closure', 'E16', { type: 'route_closure' as any, edge_id: 'E16' })}
          className={getButtonClasses('E16', 'red')}
        >
          <div className="absolute inset-0 bg-red-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex flex-col items-center justify-center space-y-2 text-center">
            <ShieldAlert className={`w-5 h-5 text-red-500 ${loadingType === 'E16' ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] font-black tracking-wider transition-colors ${activeIncidents['E16'] ? 'text-white' : 'text-red-200 group-hover:text-white'}`}>
              {activeIncidents['E16'] ? 'RESOLVE E16' : 'CLOSE ROUTE E16'}
            </span>
          </div>
        </button>

        {/* Close Edge PITS_WALK (E14) */}
        <button
          disabled={disabled || loadingType === 'E14'}
          onClick={() => handleToggle('route_closure', 'E14', { type: 'route_closure' as any, edge_id: 'E14' })}
          className={getButtonClasses('E14', 'red')}
        >
          <div className="absolute inset-0 bg-red-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex flex-col items-center justify-center space-y-2 text-center">
            <ShieldAlert className={`w-5 h-5 text-red-500 ${loadingType === 'E14' ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] font-black tracking-wider transition-colors ${activeIncidents['E14'] ? 'text-white' : 'text-red-200 group-hover:text-white'}`}>
              {activeIncidents['E14'] ? 'RESOLVE PITS WALK' : 'CLOSE PITS WALK'}
            </span>
          </div>
        </button>

        {/* Heavy Rain */}
        <button
          disabled={disabled || loadingType === 'heavy_rain'}
          onClick={() => handleToggle('weather_change', 'heavy_rain', { type: 'weather_change' as any, value: 'heavy_rain' })}
          className={getButtonClasses('heavy_rain', 'blue')}
        >
          <div className="absolute inset-0 bg-blue-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex flex-col items-center justify-center space-y-2 text-center">
            <CloudRain className={`w-5 h-5 text-blue-400 ${loadingType === 'heavy_rain' ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] font-black tracking-wider transition-colors ${activeIncidents['heavy_rain'] ? 'text-white' : 'text-blue-200 group-hover:text-white'}`}>
              {activeIncidents['heavy_rain'] ? 'RESOLVE RAIN' : 'HEAVY RAIN'}
            </span>
          </div>
        </button>

        {/* Sunny Revert */}
        <button
          disabled={disabled || loadingType === 'sunny'}
          onClick={() => handleToggle('weather_change', 'sunny', { type: 'weather_change' as any, value: 'sunny' })}
          className={getButtonClasses('sunny', 'yellow')}
        >
          <div className="absolute inset-0 bg-yellow-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex flex-col items-center justify-center space-y-2 text-center">
            <Sun className={`w-5 h-5 text-yellow-400 ${loadingType === 'sunny' ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] font-black tracking-wider transition-colors ${activeIncidents['sunny'] ? 'text-white' : 'text-yellow-200 group-hover:text-white'}`}>
              {activeIncidents['sunny'] ? 'RESOLVE SUNNY' : 'SUNNY WEATHER'}
            </span>
          </div>
        </button>

        {/* Medical Incident */}
        <button
          disabled={disabled || loadingType === 'GS_B_MEDICAL'}
          onClick={() => handleToggle('medical_incident', 'GS_B_MEDICAL', { type: 'medical_incident' as any, node_id: 'GS_B' })}
          className={getButtonClasses('GS_B_MEDICAL', 'orange')}
        >
          <div className="absolute inset-0 bg-orange-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex flex-col items-center justify-center space-y-2 text-center">
            <Ambulance className={`w-5 h-5 text-orange-400 ${loadingType === 'GS_B_MEDICAL' ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] font-black tracking-wider transition-colors ${activeIncidents['GS_B_MEDICAL'] ? 'text-white' : 'text-orange-200 group-hover:text-white'}`}>
              {activeIncidents['GS_B_MEDICAL'] ? 'RESOLVE MED @ GS_B' : 'MEDICAL @ GS_B'}
            </span>
          </div>
        </button>
        
        {/* VIP Gate Delay */}
        <button
          disabled={disabled || loadingType === 'VIP_DELAY'}
          onClick={() => handleToggle('medical_incident', 'VIP_DELAY', { type: 'medical_incident' as any, node_id: 'GATE_VIP' })}
          className={getButtonClasses('VIP_DELAY', 'purple')}
        >
          <div className="absolute inset-0 bg-purple-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex flex-col items-center justify-center space-y-2 text-center">
            <Clock className={`w-5 h-5 text-purple-400 ${loadingType === 'VIP_DELAY' ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] font-black tracking-wider transition-colors ${activeIncidents['VIP_DELAY'] ? 'text-white' : 'text-purple-200 group-hover:text-white'}`}>
              {activeIncidents['VIP_DELAY'] ? 'RESOLVE VIP DELAY' : 'VIP GATE DELAY'}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
