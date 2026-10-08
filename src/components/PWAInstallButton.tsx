import React, { useState } from 'react';
import { Download, Share, PlusSquare, Check, X, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  variant?: 'header' | 'hero' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already installed and running as standalone app, suppress prompt
  if (isInstalled) {
    if (variant === 'hero') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>App Installed</span>
        </span>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  // Header compact button
  if (variant === 'header') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          title="Download & Install app on your device"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-700 via-sky-600 to-blue-800 hover:from-blue-800 hover:to-sky-700 rounded-xl shadow-md shadow-sky-900/20 active:scale-95 transition-all cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showGuide && (
          <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuide(false)} />
        )}
      </>
    );
  }

  // Hero card prominent button
  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-slate-900/20 active:scale-95 transition-all cursor-pointer border border-slate-700 ${className}`}
      >
        <Download className="w-4 h-4 text-sky-400" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuide(false)} />
      )}
    </>
  );
};

// Step-by-step installation guide modal
const InstallGuideModal: React.FC<{ isIOS: boolean; onClose: () => void }> = ({
  isIOS,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Install as Mobile / Desktop App
              </h3>
              <p className="text-xs text-slate-500">
                Disaster Management Directory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {isIOS ? (
            /* iOS Safari Instructions */
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-sky-50 rounded-xl border border-sky-100">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span className="font-bold text-slate-800">Tap the Share button</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    In Safari's bottom toolbar, tap the <Share className="inline w-3.5 h-3.5 text-blue-600 mx-0.5" /> share icon.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-sky-50 rounded-xl border border-sky-100">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-bold text-slate-800">Add to Home Screen</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scroll down the menu and tap <PlusSquare className="inline w-3.5 h-3.5 text-blue-600 mx-0.5" /> <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-sky-50 rounded-xl border border-sky-100">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <span className="font-bold text-slate-800">Confirm & Tap Add</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    The app will install directly on your home screen with offline capability!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Android / Chrome / Edge / Desktop Instructions */
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <Smartphone className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">On Android / Chrome:</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tap the <strong>three dots (⋮)</strong> at the top right of your browser, then tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <Monitor className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">On Laptop / Desktop:</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click the <strong>Install App icon (⊕ or ⭳)</strong> in the right corner of your browser's address bar to install as a native desktop application.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Installed apps launch instantly in full-screen with offline access!</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
