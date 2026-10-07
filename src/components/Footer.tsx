import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto py-8 border-t border-slate-200/80 bg-white/90 backdrop-blur-md relative z-10">
      <div className="max-w-6xl mx-auto px-4 text-center space-y-1.5">
        <p className="text-sm font-bold text-slate-800 tracking-wide">
          Disaster Management Directory
        </p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Emergency Response & Operational Phone Registry
        </p>
        <div className="pt-2 text-[11px] text-slate-400">
          24/7 Incident Coordination Service • Rapid Contact Access for Emergency Management
        </div>
      </div>
    </footer>
  );
};
