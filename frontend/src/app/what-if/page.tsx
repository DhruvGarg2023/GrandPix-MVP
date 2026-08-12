'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { WhatIfScenarioRequest, WhatIfScenarioResponse } from '@/types';
import ScenarioComparisonWidget from '@/components/what-if/ScenarioComparisonWidget';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, FlaskConical, AlertTriangle, CloudRain, Ambulance, XOctagon, Flame, TrainFront, Users, ShieldAlert } from 'lucide-react';

const SCENARIOS = [
  { id: 'EDGE_E16_CLOSURE', label: 'Close Route E16', icon: <XOctagon className="w-5 h-5 text-red-500" />, desc: 'Simulates complete blockage of the main artery E16.' },
  { id: 'GATE_B_CLOSURE', label: 'Close Gate B', icon: <XOctagon className="w-5 h-5 text-red-500" />, desc: 'Simulates total shutdown of Gate B entry/exit.' },
  { id: 'HEAVY_RAIN', label: 'Heavy Rain', icon: <CloudRain className="w-5 h-5 text-blue-500" />, desc: 'Simulates sudden downpour reducing all walking speeds by 30%.' },
  { id: 'MEDICAL_INCIDENT_GS_B', label: 'Medical Emergency @ GS_B', icon: <Ambulance className="w-5 h-5 text-orange-500" />, desc: 'Simulates medical incident at Grandstand B requiring reserved corridors.' },
  { id: 'VIP_EVACUATION', label: 'VIP Evacuation', icon: <ShieldAlert className="w-5 h-5 text-yellow-500" />, desc: 'Simulates an immediate clearance of the VIP area.' },
  { id: 'FAN_ZONE_CRUSH', label: 'Fan Zone Surge', icon: <Users className="w-5 h-5 text-purple-500" />, desc: 'Simulates a sudden 1.5x crowd surge in the Fan Zone.' },
  { id: 'METRO_STRIKE', label: 'Metro Strike', icon: <TrainFront className="w-5 h-5 text-slate-400" />, desc: 'Simulates shutdown of the Metro exit, forcing reroutes.' },
  { id: 'FOOD_COURT_FIRE', label: 'Food Court Fire', icon: <Flame className="w-5 h-5 text-orange-600" />, desc: 'Simulates a localized incident blocking access to Food North.' },
];

export default function WhatIfStudioPage() {
  const [selectedScenario, setSelectedScenario] = useState<string>('EDGE_E16_CLOSURE');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<WhatIfScenarioResponse | null>(null);

  const handleRunScenario = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: WhatIfScenarioRequest = {
        scenarioType: selectedScenario as any,
      };
      const result = await api.runWhatIfScenario('sim_default', payload);
      setComparison(result);
    } catch (err: any) {
      console.error('Failed to run scenario:', err);
      setError(err.message || 'Failed to execute what-if scenario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070102] text-slate-200 font-sans p-6">
      
      {/* Header */}
      <header className="flex items-center justify-between border-b border-red-950 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest flex items-center space-x-3">
            <div className="p-2 bg-red-600 rounded">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <span>What-If Scenario Sandbox</span>
          </h1>
          <p className="text-sm font-mono text-slate-500 mt-2 tracking-wide">
            Execute predictive simulations in an isolated environment without altering production state.
          </p>
        </div>
        
        <Link href="/dashboard" className="f1-btn-pill-red flex items-center px-4 py-2 text-xs">
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK TO DASHBOARD
        </Link>
      </header>

      {error && (
        <div className="bg-red-950/90 border border-red-600 text-red-100 p-4 rounded-xl text-xs font-mono mb-8 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span><strong>SCENARIO EXECUTION FAILED:</strong> {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Scenario Selector Panel (1 Col) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.5 }}
          className="lg:col-span-1 space-y-6"
        >
          <div className="f1-card-crimson p-6 border-t-4 border-t-red-600">
            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6">Select Scenario</h2>
            
            <div className="space-y-3">
              {SCENARIOS.map(scen => (
                <button
                  key={scen.id}
                  onClick={() => setSelectedScenario(scen.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedScenario === scen.id 
                      ? 'bg-red-950/40 border-red-600 shadow-[0_0_15px_rgba(225,6,0,0.2)]' 
                      : 'bg-[#0D0305] border-red-950 hover:border-red-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    {scen.icon}
                    <h3 className="text-xs font-bold text-white tracking-wider">{scen.label}</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono pl-8 leading-relaxed">
                    {scen.desc}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={handleRunScenario}
              disabled={loading}
              className={`w-full mt-8 py-3 rounded-lg flex items-center justify-center space-x-2 font-black uppercase tracking-widest transition-all ${
                loading 
                  ? 'bg-red-900 text-red-400 cursor-wait' 
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_5px_20px_rgba(225,6,0,0.4)] hover:shadow-[0_8px_25px_rgba(225,6,0,0.6)]'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  <span>Executing 30 Ticks...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Scenario</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Comparison Output (2 Cols) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <ScenarioComparisonWidget comparison={comparison} />
        </motion.div>

      </div>

    </div>
  );
}
