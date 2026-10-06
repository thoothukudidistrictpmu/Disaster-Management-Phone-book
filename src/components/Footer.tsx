import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto py-8 border-t border-sky-100 bg-white/80 backdrop-blur-md relative z-10">
      <div className="max-w-6xl mx-auto px-4 text-center space-y-1.5">
        <p className="text-sm font-bold text-slate-800 tracking-wide">
          Government Contact Directory
        </p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          District Administration
        </p>
        <div className="pt-2 text-[11px] text-slate-400">
          Public Information Service • Data sourced dynamically from Official Directory Sheet
        </div>
      </div>
    </footer>
  );
};
