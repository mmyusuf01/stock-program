import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { AnalyticsSummary, TrendPoint, UrgentItem } from '../types.ts';
import { offlineStorage } from '../lib/offlineStore.ts';
import {
  Database,
  Store as StoreIcon,
  Package,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  ScanBarcode,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  RefreshCw,
  Zap,
  Users,
  Sparkles,
  WifiOff,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenScanner: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenScanner,
  onNavigateTab,
}) => {
  const { user, selectedStore, allStores, isOnline, isAdmin } = useAuth();
  const { isDark, primaryBg, primaryHoverBg, primaryText, primaryLightBg, primaryBorder } = useTheme();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFromCache, setIsFromCache] = useState(false);
  const [cachedTime, setCachedTime] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }
      const storeParam = selectedStore ? `?storeId=${selectedStore.id}` : '';

      const res = await fetch(`/api/analytics/dashboard${storeParam}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const s = data.summary || null;
        const t = data.trend || [];
        const u = data.urgentItems || [];
        setSummary(s);
        setTrends(t);
        setUrgentItems(u);
        setIsFromCache(false);
        setCachedTime(null);
        if (s) {
          offlineStorage.setDashboardCache(selectedStore?.id || null, { summary: s, trend: t, urgentItems: u });
        }
      } else {
        throw new Error('Server unreachable');
      }
    } catch {
      // Offline fallback: load cached analytics
      const cached = offlineStorage.getDashboardCache(selectedStore?.id || null);
      if (cached) {
        setSummary(cached.summary);
        setTrends(cached.trend || []);
        setUrgentItems(cached.urgentItems || []);
        setIsFromCache(true);
        setCachedTime(cached.cachedAt);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedStore]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div id="dashboard-view" className="space-y-6 pb-12">
      {/* Top Banner / Store Context with Rich Vibrant Gradient */}
      <div className={`rounded-2xl p-4 sm:p-6 border transition-all shadow-xl relative overflow-hidden ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/20'
          : 'bg-gradient-to-r from-white via-indigo-50/50 to-sky-50 border-indigo-200 shadow-indigo-100/50'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${primaryLightBg} ${primaryText} border ${primaryBorder}`}>
                <Zap className="w-3.5 h-3.5" />
                PostgreSQL High-Performance RDBMS
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {allStores.length} Cabang Toko Aktif
              </span>
              {isFromCache && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <WifiOff className="w-3 h-3" />
                  Mode Offline (Data Cache Lokal {cachedTime ? new Date(cachedTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''})
                </span>
              )}
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Dashboard Analitik & Laporan Stok Real-Time
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Menampilkan ringkasan inventaris untuk:{' '}
              <strong className={`font-bold ${primaryText}`}>
                {selectedStore ? `${selectedStore.name} (${selectedStore.code})` : 'Konsolidasi Seluruh Toko (105 Cabang)'}
              </strong>
            </p>
          </div>

          {/* Quick Trigger Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={loading}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
              title="Muat Ulang Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-500" />
              <span>User &amp; Admin</span>
            </button>

            <button
              type="button"
              onClick={onOpenScanner}
              className={`flex items-center gap-2 px-4 py-2.5 ${primaryBg} ${primaryHoverBg} text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer active:scale-95`}
            >
              <ScanBarcode className="w-4 h-4" />
              <span>Pindai Barcode Cepat</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - Each with Vibrant Color Personality */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Catalog SKUs - Cyan / Blue Vibrant Card */}
        <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between border transition-all hover:scale-[1.02] shadow-lg ${
          isDark
            ? 'bg-gradient-to-br from-slate-900 to-sky-950/40 border-sky-500/30'
            : 'bg-gradient-to-br from-white to-sky-50 border-sky-200 shadow-sky-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
              Katalog SKU
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/40 shadow-sm">
              <Package className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {summary?.totalCatalogSkus ? summary.totalCatalogSkus.toLocaleString('id-ID') : '...'}
            </div>
            <div className="text-[11px] text-sky-500 font-medium mt-1">
              Kapasitas skala s/d 50.000 SKU
            </div>
          </div>
        </div>

        {/* Total Stock Units - Emerald Green Vibrant Card */}
        <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between border transition-all hover:scale-[1.02] shadow-lg ${
          isDark
            ? 'bg-gradient-to-br from-slate-900 to-emerald-950/40 border-emerald-500/30'
            : 'bg-gradient-to-br from-white to-emerald-50 border-emerald-200 shadow-emerald-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              Unit Fisik Stok
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-sm">
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {summary?.totalStockUnits ? summary.totalStockUnits.toLocaleString('id-ID') : '...'}
            </div>
            <div className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Nilai: {summary ? formatRupiah(summary.totalSellingValuation) : '-'}</span>
            </div>
          </div>
        </div>

        {/* Low Stock Warning - Amber / Orange Vibrant Alert Card */}
        <div
          onClick={() => onNavigateTab('inventory')}
          className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between border transition-all hover:scale-[1.02] shadow-lg cursor-pointer ${
            isDark
              ? 'bg-gradient-to-br from-slate-900 to-amber-950/40 border-amber-500/40 hover:border-amber-400'
              : 'bg-gradient-to-br from-white to-amber-50 border-amber-300 shadow-amber-100 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              Stok Menipis
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-sm animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-500">
              {summary?.lowStockCount !== undefined ? summary.lowStockCount : '...'}
            </div>
            <div className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
              <span>{summary?.outOfStockCount || 0} barang habis (0 unit)</span>
            </div>
          </div>
        </div>

        {/* Total Branches - Violet / Purple Vibrant Card */}
        <div className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between border transition-all hover:scale-[1.02] shadow-lg ${
          isDark
            ? 'bg-gradient-to-br from-slate-900 to-violet-950/40 border-violet-500/30'
            : 'bg-gradient-to-br from-white to-violet-50 border-violet-200 shadow-violet-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
              Jaringan Toko
            </span>
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center border border-violet-500/40 shadow-sm">
              <StoreIcon className="w-4 h-4 text-violet-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {summary?.totalStores || allStores.length}
            </div>
            <div className="text-[11px] text-violet-500 font-medium mt-1">
              Sinkronisasi multi-lokasi &gt;100 cabang
            </div>
          </div>
        </div>
      </div>

      {/* Today's Transactions Activity Cards with Colorful Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Stok Masuk */}
        <div className={`rounded-xl p-4 flex items-center gap-3.5 border transition-all ${
          isDark
            ? 'bg-slate-900/90 border-emerald-500/30 shadow-md'
            : 'bg-white border-emerald-200 shadow-sm'
        }`}>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-sm">
            <ArrowDownRight className="w-6 h-6 text-emerald-500 stroke-[2.5]" />
          </div>
          <div>
            <div className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Stok Masuk Hari Ini
            </div>
            <div className="text-lg font-black text-emerald-500">
              +{summary?.stockInToday ? summary.stockInToday.toLocaleString('id-ID') : 0} unit
            </div>
          </div>
        </div>

        {/* Stok Keluar */}
        <div className={`rounded-xl p-4 flex items-center gap-3.5 border transition-all ${
          isDark
            ? 'bg-slate-900/90 border-rose-500/30 shadow-md'
            : 'bg-white border-rose-200 shadow-sm'
        }`}>
          <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 shadow-sm">
            <ArrowUpRight className="w-6 h-6 text-rose-500 stroke-[2.5]" />
          </div>
          <div>
            <div className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Stok Keluar / Penjualan
            </div>
            <div className="text-lg font-black text-rose-500">
              -{summary?.stockOutToday ? summary.stockOutToday.toLocaleString('id-ID') : 0} unit
            </div>
          </div>
        </div>

        {/* Total Mutasi */}
        <div className={`rounded-xl p-4 flex items-center gap-3.5 border transition-all ${
          isDark
            ? 'bg-slate-900/90 border-indigo-500/30 shadow-md'
            : 'bg-white border-indigo-200 shadow-sm'
        }`}>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-indigo-500 stroke-[2.5]" />
          </div>
          <div>
            <div className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Transaksi Mutasi
            </div>
            <div className="text-lg font-black text-indigo-500">
              {summary?.transactionCountToday || 0} transaksi tercatat
            </div>
          </div>
        </div>
      </div>

      {/* Trends & Urgent Attention Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Stock Flow Chart */}
        <div className={`lg:col-span-2 rounded-2xl p-5 border shadow-lg flex flex-col justify-between ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Arus Mutasi Stok 7 Hari Terakhir
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Perbandingan Stok Masuk (Restock Hijau) vs Stok Keluar (Penjualan Merah)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-500 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Masuk
              </span>
              <span className="flex items-center gap-1.5 text-rose-500 font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Keluar
              </span>
            </div>
          </div>

          {/* Bar Visualizer with Vibrant Colors */}
          <div className={`h-52 flex items-end justify-between gap-2 pt-6 px-2 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
            {trends.map((pt, idx) => {
              const maxVal = Math.max(...trends.flatMap((t) => [t.stockIn, t.stockOut]), 50);
              const inHeight = Math.min(100, Math.round((pt.stockIn / maxVal) * 160));
              const outHeight = Math.min(100, Math.round((pt.stockOut / maxVal) * 160));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-40">
                    <div
                      style={{ height: `${Math.max(6, inHeight)}%` }}
                      className="w-1/2 max-w-[22px] bg-emerald-500 rounded-t-md transition-all group-hover:bg-emerald-400 group-hover:scale-105 shadow-md shadow-emerald-500/20 relative"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white border border-emerald-500 px-1.5 py-0.5 rounded text-[10px] font-mono pointer-events-none transition-opacity z-20 shadow-md">
                        +{pt.stockIn}
                      </span>
                    </div>
                    <div
                      style={{ height: `${Math.max(6, outHeight)}%` }}
                      className="w-1/2 max-w-[22px] bg-rose-500 rounded-t-md transition-all group-hover:bg-rose-400 group-hover:scale-105 shadow-md shadow-rose-500/20 relative"
                    >
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white border border-rose-500 px-1.5 py-0.5 rounded text-[10px] font-mono pointer-events-none transition-opacity z-20 shadow-md">
                        -{pt.stockOut}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] mt-2 font-mono font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {pt.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Data realtime dari PostgreSQL <code className="text-indigo-500 font-bold">stock_activity_logs</code>
            </span>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-indigo-500 hover:text-indigo-600 font-bold cursor-pointer transition-colors"
            >
              Lihat Seluruh Log &rarr;
            </button>
          </div>
        </div>

        {/* Urgent Low Stock Alerts */}
        <div className={`rounded-2xl p-5 border shadow-lg flex flex-col justify-between ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Perlu Tindakan Segera</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/30">
                {urgentItems.length} SKU Kritis
              </span>
            </div>
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Barang di bawah batas stok minimum yang membutuhkan restock segera.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {urgentItems.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  Stok barang berada pada level aman.
                </div>
              ) : (
                urgentItems.slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      item.stockQuantity === 0
                        ? isDark
                          ? 'bg-rose-950/20 border-rose-500/30'
                          : 'bg-rose-50/70 border-rose-200'
                        : isDark
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-amber-50/70 border-amber-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className={`font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                        <span className="font-semibold text-indigo-400">{item.sku}</span>
                        <span>•</span>
                        <span>{item.storeName}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-black ${item.stockQuantity === 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                        {item.stockQuantity} {item.unit}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Min: {item.minStockThreshold}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenScanner}
            className={`w-full mt-4 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-slate-700'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
          >
            <ScanBarcode className="w-3.5 h-3.5" />
            <span>Pindai Barcode untuk Restock</span>
          </button>
        </div>
      </div>
    </div>
  );
};
