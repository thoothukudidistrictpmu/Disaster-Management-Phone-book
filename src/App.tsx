/**
 * Disaster Management Directory
 * Emergency and incident response operational phone registry
 */
import React, { useEffect, useState, useTransition } from 'react';
import { Header } from './components/Header.tsx';
import { SearchCard } from './components/SearchCard.tsx';
import { ContactResults } from './components/ContactResults.tsx';
import { Footer } from './components/Footer.tsx';
import { ThreeBackground } from './components/ThreeBackground.tsx';
import { ChatInterface } from './components/ChatInterface.tsx';
import { ContactRecord, DirectoryData } from './types.ts';
import { processDirectoryCSV } from './utils/csvParser.ts';
import { Search, HelpCircle, AlertCircle, Loader2 } from 'lucide-react';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';

const SHEET_ID = '1oenzjQh390rwWfXbybfcHGqVisqmeKUPRPvWDhNhau4';
const SHEET_GID = '1561800236'; // Sheet2
const FALLBACK_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const FALLBACK_GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet2`;

export default function App() {
  const [data, setData] = useState<DirectoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form selections
  const [selectedTaluk, setSelectedTaluk] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  // Search state
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<ContactRecord[]>([]);
  const [activeSearchQuery, setActiveSearchQuery] = useState<{ taluk: string; dept: string }>({
    taluk: '',
    dept: '',
  });

  const [, startTransition] = useTransition();

  // Load directory data from backend API with fallback
  const loadDirectoryData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // 1. Try server-side API first
      const apiUrl = forceRefresh ? '/api/contacts?refresh=true' : '/api/contacts';
      const response = await fetch(apiUrl);

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setData(json.data);
          // If we had a previous search, refresh its results
          if (hasSearched && selectedTaluk && selectedDepartment) {
            updateSearchResults(json.data.contacts, selectedTaluk, selectedDepartment);
          }
          return;
        }
      }

      // 2. Client-side fallback directly to Google Sheet export URL if API proxy is unavailable
      let csvText = '';
      try {
        const directResponse = await fetch(FALLBACK_CSV_URL);
        if (!directResponse.ok) throw new Error('Primary fallback failed');
        csvText = await directResponse.text();
      } catch {
        const gvizResponse = await fetch(FALLBACK_GVIZ_URL);
        if (!gvizResponse.ok) throw new Error('Unable to connect to Google Sheets');
        csvText = await gvizResponse.text();
      }
      const processed = processDirectoryCSV(csvText);
      setData(processed);
      if (hasSearched && selectedTaluk && selectedDepartment) {
        updateSearchResults(processed.contacts, selectedTaluk, selectedDepartment);
      }
    } catch (err) {
      console.warn('Directory fetch notice:', err);
      setError('Unable to load directory records at this time. Please check your connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDirectoryData();
  }, []);

  // Update search results helper
  const updateSearchResults = (allContacts: ContactRecord[], taluk: string, dept: string) => {
    const trimmedTaluk = taluk.trim().toLowerCase();
    const isAllDept =
      dept === 'ALL' ||
      dept.trim().toLowerCase() === 'all' ||
      dept.trim().toLowerCase() === 'all departments' ||
      dept.trim().toLowerCase() === 'all (all departments)';

    const matches = allContacts.filter((c) => {
      const matchTaluk = c.taluk.trim().toLowerCase() === trimmedTaluk;
      if (!matchTaluk) return false;
      if (isAllDept) return true;
      return c.department.trim().toLowerCase() === dept.trim().toLowerCase();
    });

    setSearchResults(matches);
    setActiveSearchQuery({ taluk, dept: isAllDept ? 'All Departments' : dept });
  };

  // Reset filters and results back to initial screen
  const handleReset = () => {
    setSelectedTaluk('');
    setSelectedDepartment('');
    setHasSearched(false);
    setSearchResults([]);
    setActiveSearchQuery({ taluk: '', dept: '' });
  };

  // Handle Taluk change
  const handleTalukChange = (newTaluk: string) => {
    setSelectedTaluk(newTaluk);
    // Reset department whenever Taluk changes
    setSelectedDepartment('');
  };

  // Handle Department change
  const handleDepartmentChange = (newDept: string) => {
    setSelectedDepartment(newDept);
  };

  // Handle SEARCH button click
  const handleSearch = () => {
    if (!data || !selectedTaluk || !selectedDepartment) return;

    startTransition(() => {
      updateSearchResults(data.contacts, selectedTaluk, selectedDepartment);
      setHasSearched(true);
    });

    // Smooth scroll down to results section
    setTimeout(() => {
      const resultsEl = document.getElementById('results-section');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Compute available departments for current taluk
  const availableDepartments =
    data && selectedTaluk && data.departmentsByTaluk[selectedTaluk]
      ? data.departmentsByTaluk[selectedTaluk]
      : [];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50/60 via-white to-sky-50/40 text-slate-800 relative selection:bg-sky-200 selection:text-sky-900">
      {/* 3D Animated Background */}
      <ThreeBackground />

      {/* Subtle overlay texture to guarantee readability */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(186,230,253,0.25),rgba(255,255,255,0))]" />

      {/* Main Header */}
      <Header
        onRefresh={() => loadDirectoryData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 relative z-10">
        {/* Hero Title Section */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-block px-3.5 py-1 mb-3 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-semibold tracking-wide shadow-2xs">
            Disaster Management Response Network
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Disaster Management Directory
          </h1>
          <p className="text-slate-600 text-sm sm:text-base md:text-lg mt-2 max-w-2xl mx-auto font-normal">
            Direct operational access to disaster mitigation officers, incident coordinators, and emergency response teams.
          </p>
          <div className="mt-4 flex items-center justify-center">
            <PWAInstallButton variant="hero" />
          </div>
        </div>

        {/* Central Search Card */}
        <section aria-label="Search contacts" className="mb-8">
          <SearchCard
            taluks={data?.taluks || []}
            departments={availableDepartments}
            selectedTaluk={selectedTaluk}
            selectedDepartment={selectedDepartment}
            onTalukChange={handleTalukChange}
            onDepartmentChange={handleDepartmentChange}
            onSearch={handleSearch}
            onReset={handleReset}
            isLoading={isLoading}
          />
        </section>

        {/* Dynamic Display Area */}
        <div id="results-section" className="scroll-mt-24">
          {isLoading ? (
            /* Requirement 14: LOADING */
            <div className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl border border-sky-100 p-12 text-center shadow-md">
              <Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800">Loading...</h3>
              <p className="text-xs text-slate-500 mt-1">
                Fetching latest records from Disaster Management Directory Sheet
              </p>
            </div>
          ) : error ? (
            /* Error Fallback */
            <div className="w-full max-w-2xl mx-auto bg-rose-50/90 backdrop-blur-md rounded-2xl border border-rose-200 p-8 text-center shadow-md">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-rose-900">Connection Error</h3>
              <p className="text-sm text-rose-700 mt-1">{error}</p>
              <button
                onClick={() => loadDirectoryData(true)}
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Try Again
              </button>
            </div>
          ) : !hasSearched ? (
            /* Requirement 12: INITIAL SCREEN */
            <div className="w-full max-w-2xl mx-auto bg-white/85 backdrop-blur-md rounded-2xl border border-sky-100/80 p-10 sm:p-12 text-center shadow-md shadow-sky-900/5 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4 border border-sky-100">
                <HelpCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                Find the contact you need
              </h3>
              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-md mx-auto">
                Select a Taluk and Department to view contact information.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> Live Phone Dialer
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> WhatsApp Integration
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Verified Official Numbers
                </span>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            /* Requirement 13: NO RESULTS */
            <div className="w-full max-w-2xl mx-auto bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 p-10 sm:p-12 text-center shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
                No contact records found
              </h3>
              <p className="text-sm sm:text-base text-slate-500 mt-2">
                Please try another Taluk or Department.
              </p>
            </div>
          ) : (
            /* Requirement 4-7: RESULTS */
            <ContactResults
              contacts={searchResults}
              taluk={activeSearchQuery.taluk}
              department={activeSearchQuery.dept}
            />
          )}
        </div>
      </main>

      {/* AI Citizen Chatbot */}
      <ChatInterface />

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Footer */}
      <Footer />
    </div>
  );
}
