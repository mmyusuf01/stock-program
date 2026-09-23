import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme, THEMES } from '../context/ThemeContext.tsx';
import { ThemeSelector } from './ThemeSelector.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { Store } from '../types.ts';
import {
  Database,
  Store as StoreIcon,
  Wifi,
  WifiOff,
  Bell,
  ScanBarcode,
  LogOut,
  ChevronDown,
  RefreshCw,
  Shield,
  User,
  Search,
  Users,
} from 'lucide-react';

interface NavbarProps {
  onOpenScanner: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenScanner,
  onOpenNotifications,
  unreadCount,
  activeTab,
  setActiveTab,
}) => {
  const { user, selectedStore, allStores, setSelectedStore, isOnline, pendingSyncCount, syncOfflineQueue, logout, isAdmin } = useAuth();
  const { themeColor, primaryBg, primaryHoverBg, primaryText, isDark, navBg } = useTheme();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const filteredStores = allStores.filter(
    (s) =>
      s.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(storeSearch.toLowerCase()) ||
      s.city.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  const currentTheme = THEMES[themeColor];

  return (
    <header className={`sticky top-0 z-40 ${navBg} backdrop-blur-md transition-colors duration-200 border-b`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Left: Brand & Navigation */}
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md transition-transform hover:scale-105"
                style={{ backgroundColor: currentTheme.primaryHex }}
              >
                <Database className="w-5 h-5" />
              </div>
              <div className="hidden sm:block leading-tight">
                <span className={`font-bold text-sm tracking-tight block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Inventaris Toko
                </span>
                <span className={`text-[10px] font-medium block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  PostgreSQL RDBMS
                </span>
              </div>
            </div>

            {/* Store Switcher Dropdown (Supports >100 Stores!) */}
            <div className="relative">
              <button
                id="btn-store-selector"
                type="button"
                onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer max-w-[180px] sm:max-w-[220px] ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800'
                }`}
              >
                <StoreIcon className={`w-3.5 h-3.5 shrink-0 ${primaryText}`} />
                <span className="truncate font-medium">{selectedStore?.name || 'Pilih Cabang Toko'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
              </button>

              {storeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setStoreDropdownOpen(false)} />
                  <div className={`absolute left-0 mt-1.5 w-72 max-h-80 border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    <div className={`p-2 border-b ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-slate-100 bg-slate-50'}`}>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Cari dari 105 toko..."
                          value={storeSearch}
                          onChange={(e) => setStoreSearch(e.target.value)}
                          className={`w-full pl-8 pr-2.5 py-1 border rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 ${
                            isDark
                              ? 'bg-slate-800 border-slate-700 text-white focus:ring-emerald-500'
                              : 'bg-white border-slate-200 text-slate-900 focus:ring-emerald-500'
                          }`}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className={`overflow-y-auto p-1 divide-y ${isDark ? 'divide-slate-700/40' : 'divide-slate-100'}`}>
                      {filteredStores.map((store) => (
                        <button
                          key={store.id}
                          onClick={() => {
                            setSelectedStore(store);
                            setStoreDropdownOpen(false);
                            setStoreSearch('');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex flex-col transition-colors cursor-pointer ${
                            selectedStore?.id === store.id
                              ? `${primaryBg} text-white font-semibold shadow-sm`
                              : isDark
                              ? 'text-slate-200 hover:bg-slate-700/60'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{store.name}</span>
                            <span className="text-[10px] opacity-75">{store.code}</span>
                          </div>
                          <span className="text-[10px] opacity-75 mt-0.5">{store.city}</span>
                        </button>
                      ))}
                      {filteredStores.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">Tidak ada toko cocok</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center: Main Navigation Tabs */}
          <nav className={`hidden lg:flex items-center gap-1 p-1 rounded-xl border text-xs font-medium ${
            isDark ? 'bg-slate-800/80 border-slate-700/70' : 'bg-slate-100/90 border-slate-200/80'
          }`}>
            {[
              { id: 'dashboard', label: 'Dashboard Analitik' },
              { id: 'inventory', label: 'Manajemen Stok' },
              { id: 'catalog', label: 'Katalog SKU' },
              { id: 'logs', label: 'Log Aktivitas' },
              { id: 'report', label: 'Laporan Harian' },
              { id: 'users', label: 'User & Admin', icon: Users },
              { id: 'settings', label: 'Pengaturan' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? `${primaryBg} text-white shadow-sm font-semibold`
                      : isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Theme Selector, Barcode Scanner, Network, Notif & User */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Barcode Scanner Trigger Button */}
            <button
              id="btn-nav-scanner"
              type="button"
              onClick={onOpenScanner}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${primaryBg} ${primaryHoverBg} text-white rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer active:scale-95`}
            >
              <ScanBarcode className="w-4 h-4" />
              <span className="hidden sm:inline">Pindai Barcode</span>
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton variant="navbar" />

            {/* Offline / Online Network Indicator */}
            {isOnline ? (
              <div
                title="Status: Online terhubung ke PostgreSQL"
                className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium ${
                  isDark
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Online</span>
              </div>
            ) : (
              <div
                title="Status: Offline - Transaksi disimpan di lokal"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-500 text-[11px] animate-pulse font-medium"
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </div>
            )}

            {/* Pending Offline Sync Badge */}
            {pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={handleSyncClick}
                disabled={!isOnline || isSyncing}
                title="Ada transaksi offline menunggu sinkronisasi ke PostgreSQL"
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                  isDark
                    ? 'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/40 text-indigo-300'
                    : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingSyncCount} Sync</span>
              </button>
            )}

            {/* Theme & Palette Selector Component */}
            <ThemeSelector variant="compact" />

            {/* Notifications Button */}
            <button
              id="btn-nav-notifications"
              type="button"
              onClick={onOpenNotifications}
              className={`relative p-2 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Notifikasi Stok Minimum"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Profile & Role Info */}
            <div className={`flex items-center gap-2 pl-1 border-l ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="hidden md:flex flex-col items-end leading-tight text-right">
                <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {user?.name || 'Pengguna'}
                </span>
                <span className="text-[10px] capitalize flex items-center gap-1">
                  {isAdmin ? (
                    <span className="text-amber-500 font-bold flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                      <User className="w-2.5 h-2.5" />
                      <span>Staff</span>
                    </span>
                  )}
                </span>
              </div>

              {/* Logout Button */}
              <button
                id="btn-logout"
                type="button"
                onClick={logout}
                title="Keluar dari akun"
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 hover:bg-rose-950/40 hover:border-rose-500/40 border-slate-700 text-slate-400 hover:text-rose-400'
                    : 'bg-slate-100 hover:bg-rose-50 hover:border-rose-300 border-slate-200 text-slate-500 hover:text-rose-600'
                }`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className={`flex lg:hidden overflow-x-auto py-2 gap-1 border-t scrollbar-none text-xs ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}>
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'inventory', label: 'Stok Barang' },
            { id: 'catalog', label: 'Katalog SKU' },
            { id: 'logs', label: 'Log Aktivitas' },
            { id: 'report', label: 'Laporan' },
            { id: 'users', label: 'User & Admin', icon: Users },
            { id: 'settings', label: 'Pengaturan' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-md shrink-0 transition-colors flex items-center gap-1 ${
                  isActive
                    ? `${primaryBg} text-white font-semibold`
                    : isDark
                    ? 'text-slate-400 hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
