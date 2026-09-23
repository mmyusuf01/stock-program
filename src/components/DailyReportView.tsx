import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { offlineStorage } from '../lib/offlineStore.ts';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  RefreshCw,
  Store as StoreIcon,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
} from 'lucide-react';

export const DailyReportView: React.FC = () => {
  const { user, selectedStore, allStores } = useAuth();
  const { isDark, primaryBg, primaryHoverBg, primaryText, primaryLightBg, primaryBorder } = useTheme();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const fetchDailyReport = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }
      const storeParam = selectedStore ? `&storeId=${selectedStore.id}` : '';
      const res = await fetch(`/api/analytics/daily-report?date=${selectedDate}${storeParam}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        throw new Error('Server unreachable');
      }
    } catch {
      // Offline fallback: calculate summary from local queued mutations and inventory
      const q = offlineStorage.getQueue();
      const localTodayMutations = q.filter((item) => {
        const itemDate = new Date(item.offlineTimestamp).toISOString().slice(0, 10);
        return itemDate === selectedDate && (!selectedStore || item.storeId === selectedStore.id);
      });
      const inQty = localTodayMutations
        .filter((m) => m.changeType === 'RESTOCK_IN')
        .reduce((acc, m) => acc + Math.abs(m.quantityDelta), 0);
      const outQty = localTodayMutations
        .filter((m) => m.changeType === 'SALE_OUT')
        .reduce((acc, m) => acc + Math.abs(m.quantityDelta), 0);
      const adjQty = localTodayMutations
        .filter((m) => m.changeType === 'ADJUSTMENT')
        .reduce((acc, m) => acc + Math.abs(m.quantityDelta), 0);

      setReportData({
        isOfflinePreview: true,
        summary: {
          stockInToday: inQty,
          stockOutToday: outQty,
          adjustmentsToday: adjQty,
          totalTransactions: localTodayMutations.length,
          totalValuation: 0,
        },
        breakdown: [
          {
            storeName: selectedStore?.name || 'Toko Cabang Lokal (Antrean Offline)',
            stockIn: inQty,
            stockOut: outQty,
            adjustments: adjQty,
            transactions: localTodayMutations.length,
            valuation: 0,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyReport();
  }, [selectedDate, selectedStore]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    if (!reportData?.breakdown) return;
    const headers = ['Cabang Toko', 'Stok Masuk', 'Stok Keluar', 'Opname Fisik', 'Total Transaksi', 'Nilai Valuasi'];
    const rows = reportData.breakdown.map((b: any) => [
      `"${b.storeName}"`,
      b.stockIn,
      b.stockOut,
      b.adjustments,
      b.transactions,
      b.valuation,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan_stok_harian_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="daily-report-view" className="space-y-5 pb-12">
      {/* Offline Preview Alert */}
      {reportData?.isOfflinePreview && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2.5">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-500" />
          <div>
            <strong className="font-semibold">Mode Offline Aktif:</strong> Laporan ini dikalkulasikan sementara dari data antrean mutasi lokal pada perangkat Anda. Ketika koneksi internet pulih, laporan akan dikonsolidasikan secara akurat dengan database PostgreSQL pusat.
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <span>Laporan Stok Otomatis &amp; Mutasi Harian</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
              isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              Otomatisasi Real-time
            </span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Laporan rekapitulasi mutasi harian, audit stok per toko, dan kalkulasi nilai aset.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
              isDark ? 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            <Printer className={`w-4 h-4 ${primaryText}`} />
            <span>Cetak Laporan</span>
          </button>
          <button
            onClick={handleDownloadCSV}
            className={`flex items-center gap-1.5 px-3.5 py-2 ${primaryBg} ${primaryHoverBg} text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95`}
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Date & Store Scope Selector */}
      <div className={`border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2.5">
          <Calendar className={`w-4 h-4 ${primaryText}`} />
          <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Pilih Tanggal Laporan:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`px-3 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Cakupan:{' '}
          <strong className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {selectedStore ? selectedStore.name : 'Konsolidasi 105 Cabang Toko'}
          </strong>
        </div>
      </div>

      {/* Report Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className={`border rounded-xl p-4 transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Stok Masuk ({selectedDate})</div>
          <div className="text-xl font-bold text-emerald-500 mt-1">
            +{reportData?.totalStockIn ? reportData.totalStockIn.toLocaleString('id-ID') : 0} unit
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Penerimaan dari supplier &amp; restock</div>
        </div>

        <div className={`border rounded-xl p-4 transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Stok Keluar ({selectedDate})</div>
          <div className="text-xl font-bold text-rose-500 mt-1">
            -{reportData?.totalStockOut ? reportData.totalStockOut.toLocaleString('id-ID') : 0} unit
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Penjualan kasir &amp; mutasi keluar</div>
        </div>

        <div className={`border rounded-xl p-4 transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Perubahan Bersih (Net Flow)</div>
          <div className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {(reportData?.totalStockIn || 0) - (reportData?.totalStockOut || 0) >= 0 ? '+' : ''}
            {((reportData?.totalStockIn || 0) - (reportData?.totalStockOut || 0)).toLocaleString('id-ID')} unit
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Selisih kuantitas fisik</div>
        </div>

        <div className={`border rounded-xl p-4 transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Valuasi Aset Stok</div>
          <div className={`text-xl font-bold mt-1 ${primaryText}`}>
            {formatRupiah(reportData?.totalValuation || 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Berdasarkan harga jual retail</div>
        </div>
      </div>

      {/* Per-Store Breakdown Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-xl transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rincian Laporan Per Cabang Toko</h3>
          <span className="text-xs text-slate-400">Tanggal: {selectedDate}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b uppercase font-bold text-[11px] tracking-wider ${
              isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4">Nama Toko Cabang</th>
                <th className="py-3 px-3">Kota</th>
                <th className="py-3 px-3 text-right">Stok Masuk</th>
                <th className="py-3 px-3 text-right">Stok Keluar</th>
                <th className="py-3 px-3 text-right">Opname</th>
                <th className="py-3 px-3 text-right">Total Transaksi</th>
                <th className="py-3 px-4 text-right">Estimasi Nilai Stok</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Membuat laporan otomatis dari PostgreSQL...
                  </td>
                </tr>
              ) : !reportData?.breakdown || reportData.breakdown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Tidak ada transaksi tercatat pada tanggal {selectedDate}.
                  </td>
                </tr>
              ) : (
                reportData.breakdown.map((row: any, i: number) => (
                  <tr key={i} className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                    <td className={`py-3 px-4 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <div className="flex items-center gap-2">
                        <StoreIcon className={`w-3.5 h-3.5 ${primaryText}`} />
                        <span>{row.storeName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-medium">{row.city}</td>
                    <td className="py-3 px-3 text-right text-emerald-500 font-mono font-bold">
                      +{row.stockIn}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-500 font-mono font-bold">
                      -{row.stockOut}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-500 font-mono font-bold">
                      {row.adjustments}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium">
                      {row.transactions}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {formatRupiah(row.valuation)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
