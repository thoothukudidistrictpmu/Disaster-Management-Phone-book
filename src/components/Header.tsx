import React from 'react';
import { ShieldAlert, RefreshCw, Radio } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
  return (
    <header className="w-full bg-white border-b border-slate-200/80 shadow-xs relative z-10">
      {/* Sleek Emergency Operations Status Bar */}
      <div className="bg-slate-900 text-white text-xs py-1.5 px-4 font-medium border-b border-slate-800">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 tracking-wide text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-200">Disaster Management Response Network</span>
            <span className="hidden sm:inline text-slate-400">• Active Incident & Resource Directory</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline font-mono">Live Operational Sync</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Professional Disaster Management Shield Emblem */}
          <div className="relative flex-shrink-0 w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-gradient-to-br from-blue-700 via-sky-800 to-slate-900 text-white p-0.5 shadow-md flex items-center justify-center ring-1 ring-sky-200">
            <div className="w-full h-full rounded-[10px] border border-sky-400/30 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
              <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 text-sky-300" />
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Disaster Management Directory
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
              Emergency & Incident Response Contacts by Taluk and Department
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton variant="header" />
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh directory records from database"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-300/80 rounded-xl transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Updating...' : 'Sync'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
