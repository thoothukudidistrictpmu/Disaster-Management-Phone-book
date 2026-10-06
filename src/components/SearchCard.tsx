import React from 'react';
import { Search, MapPin, Building, ChevronDown, CheckCircle2, RotateCcw } from 'lucide-react';

interface SearchCardProps {
  taluks: string[];
  departments: string[];
  selectedTaluk: string;
  selectedDepartment: string;
  onTalukChange: (taluk: string) => void;
  onDepartmentChange: (department: string) => void;
  onSearch: () => void;
  onReset: () => void;
  isLoading: boolean;
}

export const SearchCard: React.FC<SearchCardProps> = ({
  taluks,
  departments,
  selectedTaluk,
  selectedDepartment,
  onTalukChange,
  onDepartmentChange,
  onSearch,
  onReset,
  isLoading,
}) => {
  const isSearchDisabled = !selectedTaluk || !selectedDepartment || isLoading;
  const isResetDisabled = (!selectedTaluk && !selectedDepartment) || isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSearchDisabled) {
      onSearch();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/95 backdrop-blur-xl border border-sky-100 rounded-2xl shadow-xl shadow-sky-900/5 p-6 sm:p-8 transition-all hover:shadow-2xl hover:shadow-sky-900/10">
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white mb-3 shadow-md shadow-sky-500/25">
          <Search className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Find Contact Information
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Select your Taluk and Department to look up official contacts
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Dropdown 1: Taluk */}
        <div>
          <label
            htmlFor="taluk-select"
            className="block text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span>Select Taluk</span>
            </span>
            {selectedTaluk && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Selected
              </span>
            )}
          </label>
          <div className="relative">
            <select
              id="taluk-select"
              value={selectedTaluk}
              onChange={(e) => onTalukChange(e.target.value)}
              disabled={isLoading || taluks.length === 0}
              className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white text-slate-800 text-base font-medium py-3.5 pl-4 pr-10 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
            >
              <option value="" disabled>
                -- Select Taluk --
              </option>
              {taluks.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Dropdown 2: Department */}
        <div>
          <label
            htmlFor="department-select"
            className="block text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Building className="w-4 h-4 text-sky-600" />
              <span>Select Department</span>
            </span>
            {!selectedTaluk && (
              <span className="text-xs text-amber-600 font-medium">
                Choose Taluk first
              </span>
            )}
          </label>
          <div className="relative">
            <select
              id="department-select"
              value={selectedDepartment}
              onChange={(e) => onDepartmentChange(e.target.value)}
              disabled={!selectedTaluk || departments.length === 0 || isLoading}
              className={`w-full text-base font-medium py-3.5 pl-4 pr-10 border rounded-xl appearance-none focus:outline-none transition-all shadow-2xs ${
                !selectedTaluk
                  ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-50/80 hover:bg-slate-50 focus:bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 cursor-pointer'
              }`}
            >
              <option value="" disabled>
                {!selectedTaluk
                  ? '-- Select Taluk first --'
                  : departments.length === 0
                  ? '-- No departments found --'
                  : '-- Select Department --'}
              </option>
              {/* "All" Option in Department Dropdown */}
              {selectedTaluk && departments.length > 0 && (
                <option value="ALL">
                  All (All Departments)
                </option>
              )}
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Buttons: SEARCH & RESET */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* SEARCH Button */}
          <button
            type="submit"
            disabled={isSearchDisabled}
            className={`sm:col-span-2 py-3.5 px-6 rounded-xl font-bold text-base tracking-wide uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-md ${
              isSearchDisabled
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-700 via-sky-600 to-blue-700 hover:from-blue-800 hover:via-sky-700 hover:to-blue-800 text-white shadow-sky-600/30 hover:shadow-lg hover:shadow-sky-600/40 active:scale-[0.99] cursor-pointer'
            }`}
          >
            <Search className="w-5 h-5" />
            <span>SEARCH</span>
          </button>

          {/* RESET Button */}
          <button
            type="button"
            onClick={onReset}
            disabled={isResetDisabled}
            className={`py-3.5 px-5 rounded-xl font-bold text-base tracking-wide uppercase transition-all duration-200 flex items-center justify-center gap-2 border shadow-2xs ${
              isResetDisabled
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-white hover:bg-slate-100/90 border-slate-300 text-slate-700 hover:text-slate-900 active:scale-[0.99] cursor-pointer'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>RESET</span>
          </button>
        </div>
      </form>
    </div>
  );
};
