import React from 'react';
import { Building2, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
  return (
    <header className="w-full bg-white border-b border-sky-100 shadow-xs relative z-10">
      {/* Top micro-banner indicating official portal */}
      <div className="bg-gradient-to-r from-sky-800 via-blue-900 to-indigo-900 text-white text-xs py-1.5 px-4 font-medium flex items-center justify-between">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 tracking-wide">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Official Government Portal • District Administration</span>
          </div>
          <span className="hidden sm:inline-block text-sky-200 text-[11px]">
            Public Services Contact Registry
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Official Emblem / Seal placeholder */}
          <div className="relative flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-700 to-sky-900 text-white p-0.5 shadow-md flex items-center justify-center ring-2 ring-sky-200">
            <div className="w-full h-full rounded-full border border-sky-300/40 flex flex-col items-center justify-center bg-blue-800/80">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-sky-100" />
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Government Contact Directory
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
              Find Government Contacts by Taluk and Department
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh latest data from Google Sheet"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Updating...' : 'Sync Sheet'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
