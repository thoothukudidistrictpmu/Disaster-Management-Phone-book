import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  RotateCcw,
  Phone,
  MessageCircle,
  Copy,
  Check,
  MapPin,
  Building,
  Truck,
  Users,
  AlertCircle,
  Loader2,
  HelpCircle,
  ChevronDown,
  X,
} from 'lucide-react';
import { NonGovRecord, NonGovDirectoryData } from '../types.ts';
import { processNonGovCSV } from '../utils/csvParser.ts';
import { getCallLink, getWhatsAppLink, cleanIndianMobile } from '../utils/phone.ts';

const SHEET_ID = '1oenzjQh390rwWfXbybfcHGqVisqmeKUPRPvWDhNhau4';
const SHEET3_GID = '2023828270';
const FALLBACK_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET3_GID}`;
const FALLBACK_GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet3`;

interface NonGovDirectoryProps {
  onBack: () => void;
}

export const NonGovDirectory: React.FC<NonGovDirectoryProps> = ({ onBack }) => {
  const [data, setData] = useState<NonGovDirectoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3 Dropdown selections
  const [selectedAgency, setSelectedAgency] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStreet, setSelectedStreet] = useState('');

  // Typing assistance state for Street Name / Village dropdown
  const [streetInput, setStreetInput] = useState('');
  const [isStreetDropdownOpen, setIsStreetDropdownOpen] = useState(false);
  const streetDropdownRef = useRef<HTMLDivElement>(null);

  // Search Results State
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<NonGovRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Available streets dynamically based on selected Location
  const availableStreets = selectedLocation && data?.streetsByLocation?.[selectedLocation]
    ? data.streetsByLocation[selectedLocation]
    : [];

  // Filtered streets according to typing assistance in dropdown
  const filteredStreets = availableStreets.filter((st) => {
    if (!streetInput.trim() || streetInput.trim().toLowerCase() === 'all') {
      return true;
    }
    return st.toLowerCase().includes(streetInput.trim().toLowerCase());
  });

  // Handle click outside to close the street typing dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        streetDropdownRef.current &&
        !streetDropdownRef.current.contains(e.target as Node)
      ) {
        setIsStreetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    // 1. Try local API proxy
    try {
      const res = await fetch('/api/non-gov-contacts');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Continue to client-side fallback
    }

    // 2. Direct fallback to Google Sheets
    try {
      let csvText = '';
      try {
        const primaryRes = await fetch(FALLBACK_CSV_URL);
        if (primaryRes.ok) {
          csvText = await primaryRes.text();
        } else {
          throw new Error('Primary export failed');
        }
      } catch {
        const gvizRes = await fetch(FALLBACK_GVIZ_URL);
        if (!gvizRes.ok) throw new Error('Sheet3 fetch failed');
        csvText = await gvizRes.text();
      }

      const parsed = processNonGovCSV(csvText);
      setData(parsed);
    } catch (err: any) {
      console.warn('Non-gov directory load warning:', err);
      setError('Unable to load Non-Government Agency records at this time.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When Location changes, set Street to 'All' according to their location
  const handleLocationChange = (loc: string) => {
    setSelectedLocation(loc);
    if (loc) {
      setSelectedStreet('All');
      setStreetInput('All');
    } else {
      setSelectedStreet('');
      setStreetInput('');
    }
    setIsStreetDropdownOpen(false);
  };

  const handleSearch = () => {
    if (!data) return;
    const streetToFilter = selectedStreet || (streetInput.trim() ? streetInput.trim() : 'All');

    const filtered = data.records.filter((r) => {
      if (selectedAgency && r.agency !== selectedAgency) return false;
      if (selectedLocation && r.location !== selectedLocation) return false;
      if (streetToFilter && streetToFilter !== 'All' && r.streetName !== streetToFilter) return false;
      return true;
    });

    setSearchResults(filtered);
    setHasSearched(true);
  };

  const handleReset = () => {
    setSelectedAgency('');
    setSelectedLocation('');
    setSelectedStreet('');
    setStreetInput('');
    setIsStreetDropdownOpen(false);
    setHasSearched(false);
    setSearchResults([]);
  };

  const handleCopy = (id: string, phone: string) => {
    const clean = cleanIndianMobile(phone) || phone;
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isSearchDisabled = (!selectedAgency && !selectedLocation) || isLoading;
  const isResetDisabled = (!selectedAgency && !selectedLocation && !selectedStreet && !hasSearched) || isLoading;

  return (
    <div className="w-full">
      {/* Top Navigation Bar with Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 font-semibold text-xs sm:text-sm border border-slate-200 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Government Directory</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-800 text-xs font-semibold rounded-full border border-sky-200">
          <Truck className="w-3.5 h-3.5 text-sky-600" />
          <span>Non-Government Operations</span>
        </div>
      </div>

      {/* Main Box: Non Government Agency with 3 Dropdowns in a single grid */}
      <div className="w-full max-w-4xl mx-auto bg-white/95 backdrop-blur-xl border border-sky-100 rounded-2xl shadow-xl shadow-sky-900/5 p-6 sm:p-8 transition-all">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white mb-3 shadow-md shadow-sky-500/25">
            <Building className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Non Government Agency
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search private emergency equipment operators, volunteer task forces, and ground logistics
          </p>
        </div>

        {/* 3 Dropdowns in a Single Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Dropdown 1: Agency */}
          <div>
            <label
              htmlFor="agency-select"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Agency
            </label>
            <div className="relative">
              <select
                id="agency-select"
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                disabled={isLoading}
                className="w-full appearance-none bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-900 text-sm font-medium rounded-xl px-3.5 py-3 pr-10 outline-none transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="">Select Agency</option>
                {data?.agencies.map((agency) => (
                  <option key={agency} value={agency}>
                    {agency}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Dropdown 2: Location */}
          <div>
            <label
              htmlFor="location-select"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Location
            </label>
            <div className="relative">
              <select
                id="location-select"
                value={selectedLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
                disabled={isLoading}
                className="w-full appearance-none bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-900 text-sm font-medium rounded-xl px-3.5 py-3 pr-10 outline-none transition-all cursor-pointer disabled:opacity-50"
              >
                <option value="">Select Location</option>
                {data?.locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Dropdown 3: Street name/Village Name with Typing Assistance and "All" */}
          <div className="relative" ref={streetDropdownRef}>
            <label
              htmlFor="street-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Street name/Village Name
            </label>
            <div className="relative">
              <input
                id="street-input"
                type="text"
                autoComplete="off"
                value={streetInput}
                disabled={isLoading || !selectedLocation}
                placeholder={
                  selectedLocation
                    ? 'Type street or select All...'
                    : 'Select Location first'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setStreetInput(val);
                  setSelectedStreet(val);
                  setIsStreetDropdownOpen(true);
                }}
                onFocus={() => {
                  if (selectedLocation) {
                    setIsStreetDropdownOpen(true);
                  }
                }}
                className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-900 text-sm font-medium rounded-xl px-3.5 py-3 pr-16 outline-none transition-all disabled:opacity-50 disabled:bg-slate-100 placeholder:text-slate-400"
              />

              <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-0.5">
                {streetInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setStreetInput('');
                      setSelectedStreet('');
                      setIsStreetDropdownOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Clear street input"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={!selectedLocation || isLoading}
                  onClick={() => setIsStreetDropdownOpen((prev) => !prev)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Toggle street list"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStreetDropdownOpen ? 'rotate-180 text-sky-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Dropdown with Typing Assistance & "All" Option */}
            {isStreetDropdownOpen && selectedLocation && (
              <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-1.5">
                {/* Prominent "All" Option according to location */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStreet('All');
                    setStreetInput('All');
                    setIsStreetDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer mb-1 border ${
                    selectedStreet === 'All' || streetInput.toLowerCase() === 'all'
                      ? 'bg-sky-50 text-sky-800 font-bold border-sky-300'
                      : 'text-slate-800 hover:bg-slate-100 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-sky-600 text-white text-[11px] font-bold shadow-2xs">
                      All
                    </span>
                    <span className="text-slate-800 font-medium text-xs sm:text-sm">
                      All in {selectedLocation}
                    </span>
                  </div>
                  {(selectedStreet === 'All' || streetInput.toLowerCase() === 'all') && (
                    <Check className="w-4 h-4 text-sky-600 shrink-0" />
                  )}
                </button>

                {/* Filtered Street Options */}
                {filteredStreets.length > 0 ? (
                  filteredStreets.map((street) => (
                    <button
                      key={street}
                      type="button"
                      onClick={() => {
                        setSelectedStreet(street);
                        setStreetInput(street);
                        setIsStreetDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        selectedStreet === street
                          ? 'bg-sky-50 text-sky-800 font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate pr-2">{street}</span>
                      {selectedStreet === street && (
                        <Check className="w-4 h-4 text-sky-600 shrink-0" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="py-3 px-3 text-center text-xs text-slate-400">
                    No streets found matching "{streetInput}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search & Reset Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleSearch}
            disabled={isSearchDisabled}
            className="w-full sm:w-auto min-w-[140px] px-6 py-3 bg-gradient-to-r from-blue-700 via-sky-600 to-blue-800 hover:from-blue-800 hover:to-sky-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>

          <button
            onClick={handleReset}
            disabled={isResetDisabled}
            className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300/80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Dynamic Results Area */}
      <div className="w-full max-w-4xl mx-auto mt-8">
        {isLoading ? (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-sky-100 p-12 text-center shadow-md">
            <Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Loading...</h3>
            <p className="text-xs text-slate-500 mt-1">
              Fetching records from Non Government Agency Directory
            </p>
          </div>
        ) : error ? (
          <div className="bg-rose-50/90 backdrop-blur-md rounded-2xl border border-rose-200 p-8 text-center shadow-md">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-rose-900">Connection Error</h3>
            <p className="text-sm text-rose-700 mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Try Again
            </button>
          </div>
        ) : !hasSearched ? (
          <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-sky-100/80 p-8 sm:p-10 text-center shadow-md shadow-sky-900/5">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3 border border-sky-100">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Select Search Criteria
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-md mx-auto">
              Choose Agency, Location, and Street name/Village Name, then click Search to display contact details.
            </p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 p-8 sm:p-10 text-center shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">
              No contact records found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Please adjust your agency, location, or street filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Results Count Banner */}
            <div className="bg-white/90 backdrop-blur-md border border-sky-100 rounded-xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                  Search Results
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  {selectedAgency || 'All Agencies'}
                  {selectedLocation ? ` • ${selectedLocation}` : ''}
                  {selectedStreet && selectedStreet !== 'All' ? ` (${selectedStreet})` : ' (All Streets/Villages)'}
                </span>
              </div>
              <span className="px-2.5 py-0.5 bg-sky-50 text-sky-800 text-xs font-bold rounded-full border border-sky-200">
                {searchResults.length} {searchResults.length === 1 ? 'Contact' : 'Contacts'}
              </span>
            </div>

            {/* Contact Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((record) => {
                const callHref = getCallLink(record.mobileNo);
                const waHref = getWhatsAppLink(record.mobileNo);
                const isCopied = copiedId === record.id;
                const hasValidPhone = !!record.mobileNo && record.mobileNo.trim().length >= 6;

                return (
                  <div
                    key={record.id}
                    className="bg-white/95 backdrop-blur-md rounded-2xl border border-sky-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200/80">
                          {record.agency === 'JCB Operator' ? (
                            <Truck className="w-3.5 h-3.5 text-sky-600" />
                          ) : (
                            <Users className="w-3.5 h-3.5 text-sky-600" />
                          )}
                          <span>{record.agency || 'Agency'}</span>
                        </span>

                        {record.regNumber && (
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {record.regNumber}
                          </span>
                        )}
                      </div>

                      {/* Owner / Name */}
                      <h4 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                        {record.ownerName || 'Contact Person'}
                      </h4>

                      {/* Location & Street */}
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800">{record.location}</span>
                          {record.streetName && (
                            <span className="text-slate-600"> — {record.streetName}</span>
                          )}
                        </div>
                      </div>

                      {/* Full Address if available */}
                      {record.currentAddress && (
                        <p className="mt-2 text-xs text-slate-500 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                          {record.currentAddress}
                        </p>
                      )}
                    </div>

                    {/* Contact & Actions Row */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Phone Number Display with Copy */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm sm:text-base text-slate-900 tracking-wide">
                          {record.mobileNo || '—'}
                        </span>
                        {record.mobileNo && (
                          <button
                            onClick={() => handleCopy(record.id, record.mobileNo)}
                            title="Copy mobile number"
                            className="p-1 text-slate-400 hover:text-sky-600 rounded-md hover:bg-sky-50 transition-colors cursor-pointer"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Action Buttons: WhatsApp and Call */}
                      {hasValidPhone && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {/* Call Button */}
                          <a
                            href={callHref}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5 fill-current" />
                            <span>CALL</span>
                          </a>

                          {/* WhatsApp Button */}
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
