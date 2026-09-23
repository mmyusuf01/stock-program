import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { offlineStorage } from '../lib/offlineStore.ts';
import { playBarcodeBeep, playAlertBeep } from '../lib/sound.ts';
import {
  Settings,
  Database,
  ShieldCheck,
  Bell,
  HardDrive,
  RefreshCw,
  Clock,
  Trash2,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  KeyRound,
  Users,
  UserPlus,
  ArrowRight,
  Palette,
} from 'lucide-react';
import { UserFormModal } from './UserFormModal.tsx';
import { ThemeSelector } from './ThemeSelector.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { Download, FileText, Wifi, WifiOff } from 'lucide-react';

interface SettingsViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigateTab }) => {
  const { user, isAdmin, isOnline, pendingSyncCount, syncOfflineQueue, allStores } = useAuth();
  const { isDark, primaryBg, primaryHoverBg, primaryText, primaryLightBg, primaryBorder } = useTheme();
  const [minThresholdGlobal, setMinThresholdGlobal] = useState(10);
  const [autoReportHour, setAutoReportHour] = useState('23:00');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const storageStats = offlineStorage.getStorageStats();

  const handleExportLocalBackup = () => {
    const data = offlineStorage.exportLocalSnapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-offline-stock-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const count = await syncOfflineQueue();
      setSyncSuccessMsg(`Berhasil menyinkronkan ${count} mutasi ke PostgreSQL!`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearOfflineQueue = () => {
    if (window.confirm('Yakin ingin membersihkan antrean mutasi lokal?')) {
      offlineStorage.clearQueue();
      window.location.reload();
    }
  };

  return (
    <div id="settings-view" className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span>Pengaturan Sistem &amp; Database RDBMS</span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
            isDark ? 'bg-slate-800 text-indigo-400 border-slate-700' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
            Konfigurasi Terpadu
          </span>
        </h2>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Atur parameter skalabilitas database PostgreSQL, tema warna visual, hak akses peran, notifikasi stok minimum, dan sinkronisasi offline.
        </p>
      </div>

      {syncSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* Visual Theme Customization Card */}
      <div className={`border rounded-2xl p-5 shadow-lg transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <ThemeSelector variant="expanded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PostgreSQL Database Performance Card */}
        <div className={`border rounded-2xl p-5 space-y-4 shadow-lg transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center gap-2.5 font-bold text-sm border-b pb-3 ${primaryText} ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <Database className="w-4 h-4" />
            <span>Konektivitas RDBMS PostgreSQL</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className={`flex justify-between py-1.5 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Tipe Database:</span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>PostgreSQL (Cloud SQL Dedicated)</span>
            </div>
            <div className={`flex justify-between py-1.5 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Status Koneksi:</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Aktif &amp; Beroperasi
              </span>
            </div>
            <div className={`flex justify-between py-1.5 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Kapasitas Skalabilitas Toko:</span>
              <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>&gt;100 Cabang (Terdaftar: 105 Toko)</span>
            </div>
            <div className={`flex justify-between py-1.5 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Kapasitas Indeks SKU:</span>
              <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Hingga 50.000 SKU</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Connection Pooling:</span>
              <span className={`font-mono font-medium ${primaryText}`}>Drizzle ORM + PG Pool (Max 10)</span>
            </div>
          </div>
        </div>

        {/* Role-Based Access Control Card */}
        <div className={`border rounded-2xl p-5 space-y-4 shadow-lg transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center gap-2.5 font-bold text-sm border-b pb-3 ${primaryText} ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <ShieldCheck className="w-4 h-4" />
            <span>Manajemen Peran &amp; Hak Akses (RBAC)</span>
          </div>

          <div className="text-xs space-y-3">
            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`font-bold flex items-center justify-between ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>Peran Saat Ini: {user?.role === 'admin' ? 'Administrator' : 'Staff Toko'}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold ${
                    user?.role === 'admin'
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {user?.role}
                </span>
              </div>
              <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Email aktif: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{user?.email}</strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Matriks Izin:</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`font-bold mb-1 ${primaryText}`}>Administrator</div>
                  <ul className={`space-y-1 list-disc pl-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <li>Akses seluruh 105 toko</li>
                    <li>Tambah &amp; edit master SKU</li>
                    <li>Lihat laporan valuasi harian</li>
                    <li>Ekspor audit trail lengkap</li>
                  </ul>
                </div>
                <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="font-bold text-emerald-500 mb-1">Staff Toko</div>
                  <ul className={`space-y-1 list-disc pl-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <li>Pindai barcode mutasi</li>
                    <li>Stok masuk / keluar toko</li>
                    <li>Stock opname cabang</li>
                    <li>Peringatan stok minimum</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Push Notification & Minimum Stock Settings */}
        <div className={`border rounded-2xl p-5 space-y-4 shadow-lg transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center gap-2.5 font-bold text-sm border-b pb-3 ${primaryText} ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <Bell className="w-4 h-4" />
            <span>Peringatan Otomatis &amp; Notifikasi Push</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className={`block font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Batas Default Peringatan Stok Minimum:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={minThresholdGlobal}
                  onChange={(e) => setMinThresholdGlobal(parseInt(e.target.value) || 5)}
                  className={`w-24 px-3 py-1.5 border rounded-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>unit per SKU (memicu push alert)</span>
              </div>
            </div>

            <div className={`pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <label className={`block font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Uji Efek Suara Alarm Bip Scanner:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playBarcodeBeep()}
                  className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer font-medium transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  }`}
                >
                  <Volume2 className={`w-3.5 h-3.5 ${primaryText}`} />
                  <span>Bip Barcode</span>
                </button>
                <button
                  type="button"
                  onClick={() => playAlertBeep()}
                  className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer font-medium transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-rose-300' : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Bip Peringatan Kritis</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Offline Cache & Synchronization Manager */}
        <div className={`border rounded-2xl p-5 space-y-4 shadow-lg transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className={`flex items-center gap-2.5 font-bold text-sm ${primaryText}`}>
              <HardDrive className="w-4 h-4" />
              <span>PWA &amp; Sinkronisasi Offline</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              <span className={`font-semibold ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* PWA Install Banner */}
            <div>
              <label className={`block font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Instalasi Aplikasi Standalone (PWA):
              </label>
              <PWAInstallButton variant="full" />
            </div>

            {/* Offline Sync Status */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={isDark ? 'text-slate-400' : 'text-slate-500'}>Antrean Mutasi Menunggu Sinkron:</div>
                <div className={`text-lg font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {pendingSyncCount} transaksi tertunda
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing || pendingSyncCount === 0 || !isOnline}
                className={`px-3.5 py-2 rounded-xl ${primaryBg} ${primaryHoverBg} disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sinkronkan Sekarang</span>
              </button>
            </div>

            {/* Diagnostic Local Metrics */}
            <div className={`p-3 rounded-xl border space-y-2 ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50/80 border-slate-200 text-slate-700'
            }`}>
              <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                Diagnostik Memori Perangkat:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Toko Tersimpan:</span>{' '}
                  <strong className={isDark ? 'text-white' : 'text-slate-900'}>{storageStats.stores} cabang</strong>
                </div>
                <div>
                  <span className="text-slate-500">Produk Tersimpan:</span>{' '}
                  <strong className={isDark ? 'text-white' : 'text-slate-900'}>{storageStats.products} SKU</strong>
                </div>
                <div>
                  <span className="text-slate-500">Estimasi Ukuran:</span>{' '}
                  <strong className={isDark ? 'text-white' : 'text-slate-900'}>~{storageStats.estimatedSizeKB} KB</strong>
                </div>
                <div>
                  <span className="text-slate-500">Sync Terakhir:</span>{' '}
                  <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                    {storageStats.lastSync ? new Date(storageStats.lastSync).toLocaleTimeString('id-ID') : 'Belum pernah'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Local Backup Download & Actions */}
            <div className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={handleExportLocalBackup}
                className={`text-xs px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-xs'
                }`}
                title="Unduh cadangan data offline ke file JSON di perangkat"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Unduh Cadangan Lokal (.json)</span>
              </button>

              <button
                type="button"
                onClick={handleClearOfflineQueue}
                className="text-[11px] text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Cache Antrean Offline</span>
              </button>
            </div>
          </div>
        </div>

        {/* User & Admin Management Quick Card */}
        <div className={`border rounded-2xl p-5 space-y-4 shadow-lg md:col-span-2 transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className={`flex items-center gap-2.5 font-bold text-sm ${primaryText}`}>
              <Users className="w-4 h-4" />
              <span>Manajemen Akun Pengguna &amp; Hak Akses Administrator</span>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('users')}
                className={`text-xs flex items-center gap-1 font-semibold cursor-pointer ${primaryText}`}
              >
                <span>Buka Panel Pengguna Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Kelola hak akses sistem, tambah staf cabang kasir baru, atau delegasikan administrator pusat.
              </p>
              <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Setiap pengguna terdaftar memiliki peran (Admin / Staff Toko) yang membatasi hak mutasi dan akses cabang di PostgreSQL RDBMS.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(true)}
                className={`px-4 py-2 ${primaryBg} ${primaryHoverBg} text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95`}
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tambah User &amp; Admin</span>
              </button>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('users')}
                  className={`px-3.5 py-2 border rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  }`}
                >
                  Kelola Daftar User
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={(savedUser) => {
          setSyncSuccessMsg(`Pengguna ${savedUser.name} (${savedUser.role === 'admin' ? 'Administrator' : 'Staff Toko'}) berhasil disimpan!`);
          if (onNavigateTab) {
            onNavigateTab('users');
          }
        }}
        allStores={allStores}
        currentActiveUser={user}
      />
    </div>
  );
};
