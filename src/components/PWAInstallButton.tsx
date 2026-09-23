import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { Download, Smartphone, CheckCircle2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'full' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { isDark, primaryBg, primaryHoverBg } = useTheme();

  // If already installed and running standalone, display a subtle badge or hide
  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
          isDark ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Aplikasi Terpasang (PWA Standalone)</span>
        </div>
      );
    }
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'full') {
      return (
        <button
          id="btn-pwa-install-full"
          type="button"
          onClick={install}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Install Aplikasi (Bisa Dibuka Tanpa Kuota)</span>
        </button>
      );
    }

    return (
      <button
        id="btn-pwa-install-nav"
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all hover:scale-105 cursor-pointer"
        title="Pasang aplikasi ke perangkat Anda agar bisa dibuka offline"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install PWA</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
            isDark
              ? 'border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/30'
              : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50'
          }`}
          title="Pasang di iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install di iOS</span>
          <span className="sm:hidden">iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-bold">Pasang di iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white font-bold shrink-0 text-[10px]">1</span>
                  <span>Buka website ini menggunakan browser <strong>Safari</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white font-bold shrink-0 text-[10px]">2</span>
                  <span>Sentuh tombol <strong>Share (Bagikan)</strong> di bagian bawah layar Safari.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white font-bold shrink-0 text-[10px]">3</span>
                  <span>Gulir ke bawah dan pilih <strong>"Add to Home Screen" (Tambah ke Layar Utama)</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white font-bold shrink-0 text-[10px]">4</span>
                  <span>Aplikasi akan muncul di layar utama dan siap dibuka secara offline kapan saja!</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for desktop browser where prompt isn't fired yet or already standalone
  if (variant === 'full') {
    return (
      <div className={`p-4 rounded-xl border text-xs ${
        isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <p className="font-semibold text-slate-200 mb-1">Aplikasi Mendukung PWA (Progressive Web App)</p>
        <p>Buka menu browser Anda (titik tiga ⋮ di Chrome/Edge) lalu pilih <strong>"Install Remix Stock System"</strong> atau klik ikon install di kolom URL browser untuk menjalankan offline.</p>
      </div>
    );
  }

  return null;
};
