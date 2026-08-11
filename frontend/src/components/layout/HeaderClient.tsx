'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, User, Radio, ChevronDown } from 'lucide-react';

export default function HeaderClient() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'user'>('admin');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Synchronise role state with localStorage
  useEffect(() => {
    const savedRole = localStorage.getItem('grandpix-role') as 'admin' | 'user';
    if (savedRole) {
      setRole(savedRole);
    } else {
      localStorage.setItem('grandpix-role', 'admin');
    }
  }, []);

  // Update role and handle navigation
  const handleRoleChange = (newRole: 'admin' | 'user') => {
    setRole(newRole);
    localStorage.setItem('grandpix-role', newRole);
    setDropdownOpen(false);
    
    // Redirect to default view for role
    if (newRole === 'user') {
      router.push('/spectator');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0E0305]/95 backdrop-blur-xl border-b border-red-900/40 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
      <div className="flex items-center space-x-6">
        <Link href={role === 'admin' ? '/dashboard' : '/spectator'} className="flex items-center space-x-3.5 group">
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

        {/* Dynamic Navigation Tabs based on Role */}
        <nav className="hidden md:flex items-center space-x-2 pl-6 border-l border-red-950 text-xs font-bold uppercase tracking-wider">
          {role === 'admin' ? (
            <>
              <Link
                href="/dashboard"
                className={`px-4 py-2 rounded-full transition-all duration-300 ${
                  pathname === '/dashboard'
                    ? 'text-white bg-gradient-to-r from-red-700/80 to-red-900/80 border border-red-500/40 shadow-[0_0_12px_rgba(225,6,0,0.3)]'
                    : 'text-red-200/80 hover:text-white hover:bg-red-950/40'
                }`}
              >
                <span>Race Control Panel</span>
              </Link>
              <Link
                href="/what-if"
                className={`px-4 py-2 rounded-full transition-all duration-300 ${
                  pathname === '/what-if'
                    ? 'text-white bg-gradient-to-r from-red-700/80 to-red-900/80 border border-red-500/40 shadow-[0_0_12px_rgba(225,6,0,0.3)]'
                    : 'text-red-200/80 hover:text-white hover:bg-red-950/40'
                }`}
              >
                <span>What-If Studio</span>
              </Link>
            </>
          ) : null}
          <Link
            href="/spectator"
            className={`px-4 py-2 rounded-full transition-all duration-300 ${
              pathname === '/spectator'
                ? 'text-white bg-gradient-to-r from-red-700/80 to-red-900/80 border border-red-500/40 shadow-[0_0_12px_rgba(225,6,0,0.3)]'
                : 'text-red-200/80 hover:text-white hover:bg-red-950/40'
            }`}
          >
            <span>Spectator Route Optimizer</span>
          </Link>
        </nav>
      </div>

      {/* Role Selection & Status Badge */}
      <div className="flex items-center space-x-3.5">
        {/* Connection status */}
        <div className="hidden lg:flex items-center space-x-2 bg-[#170507] border border-red-950 px-3.5 py-1.5 rounded-full text-[10px] font-mono text-red-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="tracking-widest uppercase">LIVE GATEWAY SYNC</span>
        </div>

        {/* F1 Fiduciary Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="bg-[#120406] hover:bg-red-950/60 text-white border border-red-900/40 rounded-xl px-4 py-2 text-xs font-mono font-bold uppercase flex items-center space-x-2.5 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] active:scale-95"
          >
            {role === 'admin' ? (
              <>
                <Shield className="w-3.5 h-3.5 text-red-500" />
                <span className="text-red-100">Role: Admin</span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Role: Spectator</span>
              </>
            )}
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-48 bg-[#0E0305] border border-red-950/80 rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] overflow-hidden z-50">
              <div className="px-3.5 py-2 border-b border-red-950/60">
                <span className="text-[10px] text-red-400/60 uppercase font-mono tracking-widest font-black">Select Identity</span>
              </div>
              <button
                onClick={() => handleRoleChange('admin')}
                className={`w-full text-left px-4 py-2.5 text-xs font-mono font-bold flex items-center space-x-2.5 transition-all ${
                  role === 'admin'
                    ? 'bg-red-950/30 text-white border-l-2 border-red-600'
                    : 'text-red-300/80 hover:text-white hover:bg-red-950/20'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-red-500" />
                <span>🏎️ Admin Control</span>
              </button>
              <button
                onClick={() => handleRoleChange('user')}
                className={`w-full text-left px-4 py-2.5 text-xs font-mono font-bold flex items-center space-x-2.5 transition-all ${
                  role === 'user'
                    ? 'bg-red-950/30 text-white border-l-2 border-emerald-500'
                    : 'text-red-300/80 hover:text-white hover:bg-red-950/20'
                }`}
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>📱 Spectator / User</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
