import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingSyncCount, syncOfflineQueue } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const count = await syncOfflineQueue();
      if (count > 0) {
        setSyncFeedback(`Berhasil menyinkronkan ${count} mutasi ke server online!`);
        setTimeout(() => setSyncFeedback(null), 4000);
      } else if (navigator.onLine) {
        setSyncFeedback('Semua data lokal telah tersinkronisasi.');
        setTimeout(() => setSyncFeedback(null), 3000);
      } else {
        setSyncFeedback('Masih offline. Data aman di memori lokal.');
        setTimeout(() => setSyncFeedback(null), 3000);
      }
    } catch {
      setSyncFeedback('Gagal menghubungi server. Akan dicoba lagi otomatis.');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // If online and no pending queue and no feedback, don't show
  if (isOnline && pendingSyncCount === 0 && !syncFeedback) {
    return null;
  }

  return (
    <aside
      aria-label="Status Koneksi & Sinkronisasi"
      className={`w-full py-2.5 px-4 transition-all duration-300 z-30 shadow-md ${
        !isOnline
          ? 'bg-amber-600 text-amber-50'
          : pendingSyncCount > 0
          ? 'bg-indigo-600 text-indigo-50'
          : 'bg-emerald-600 text-emerald-50'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 font-medium">
          {!isOnline ? (
            <>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/80 shrink-0">
                <WifiOff className="w-3.5 h-3.5 text-amber-100" />
              </div>
              <div>
                <span className="font-bold">Mode Offline Aktif:</span>{' '}
                <span>Koneksi terputus. Anda tetap bisa scan barcode, cek katalog, dan ubah stok secara normal.</span>
                {pendingSyncCount > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 rounded-full bg-amber-800 text-white font-bold text-xs inline-block">
                    {pendingSyncCount} transaksi menunggu sinkronisasi
                  </span>
                )}
              </div>
            </>
          ) : pendingSyncCount > 0 ? (
            <>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-700/80 shrink-0">
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-100 ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <span className="font-bold">Koneksi Online Pulih:</span>{' '}
                <span>Terdapat {pendingSyncCount} transaksi offline yang siap disinkronkan ke basis data server.</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-700/80 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100" />
              </div>
              <span>{syncFeedback}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pendingSyncCount > 0 && (
            <button
              id="btn-sync-offline-banner"
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-xs transition cursor-pointer backdrop-blur-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
