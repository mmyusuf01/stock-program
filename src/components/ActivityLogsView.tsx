import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { ActivityLog } from '../types.ts';
import {
  History,
  Search,
  Filter,
  Download,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  RefreshCw,
  User,
  Store as StoreIcon,
} from 'lucide-react';

export const ActivityLogsView: React.FC = () => {
  const { user, selectedStore } = useAuth();
  const { isDark, primaryBg, primaryHoverBg, primaryText, primaryLightBg, primaryBorder } = useTheme();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }
      const offset = (page - 1) * limit;
      const storeParam = selectedStore ? `&storeId=${selectedStore.id}` : '';
      const typeParam = typeFilter ? `&changeType=${typeFilter}` : '';

      const res = await fetch(
        `/api/audit-logs?limit=${limit}&offset=${offset}${storeParam}${typeParam}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [selectedStore, typeFilter]);

  useEffect(() => {
    fetchLogs();
  }, [page, selectedStore, typeFilter]);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Waktu', 'Toko', 'SKU', 'Nama Produk', 'Jenis Mutasi', 'Perubahan', 'Stok Awal', 'Stok Akhir', 'Pengguna', 'Catatan'];
    const rows = logs.map((l) => [
      new Date(l.timestamp).toLocaleString('id-ID'),
      `"${l.storeName}"`,
      `"${l.sku}"`,
      `"${l.productName}"`,
      l.changeType,
      l.quantityDelta,
      l.stockBefore,
      l.stockAfter,
      `"${l.performedByName}"`,
      `"${l.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `log_aktivitas_stok_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.productName.toLowerCase().includes(search.toLowerCase()) ||
      l.sku.toLowerCase().includes(search.toLowerCase()) ||
      l.performedByName.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div id="activity-logs-view" className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <span>Log Aktivitas &amp; Audit Trail Stok</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
              isDark ? 'bg-slate-800 text-indigo-400 border-slate-700' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              Immutable PostgreSQL Logs
            </span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Pencatatan riwayat setiap pergerakan barang, pengguna, kuantitas sebelum dan sesudah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
            }`}
            title="Segarkan Log"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-xs'
            }`}
          >
            <Download className={`w-4 h-4 ${primaryText}`} />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`border rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari SKU, Barang, atau Petugas..."
            className={`w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setTypeFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              typeFilter === ''
                ? isDark
                  ? 'bg-slate-750 text-white font-semibold'
                  : 'bg-slate-200 text-slate-900 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua Mutasi
          </button>
          <button
            onClick={() => setTypeFilter('RESTOCK_IN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              typeFilter === 'RESTOCK_IN'
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-semibold'
                : 'text-emerald-500/80 hover:bg-emerald-500/10'
            }`}
          >
            Stok Masuk
          </button>
          <button
            onClick={() => setTypeFilter('SALE_OUT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              typeFilter === 'SALE_OUT'
                ? 'bg-rose-600/30 text-rose-400 border border-rose-500/40 font-semibold'
                : 'text-rose-500/80 hover:bg-rose-500/10'
            }`}
          >
            Stok Keluar
          </button>
          <button
            onClick={() => setTypeFilter('ADJUSTMENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              typeFilter === 'ADJUSTMENT'
                ? 'bg-amber-600/30 text-amber-400 border border-amber-500/40 font-semibold'
                : 'text-amber-500/80 hover:bg-amber-500/10'
            }`}
          >
            Opname
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-xl transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b uppercase font-bold text-[11px] tracking-wider ${
              isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-3">Toko Cabang</th>
                <th className="py-3 px-3">Barang / SKU</th>
                <th className="py-3 px-3">Tipe Mutasi</th>
                <th className="py-3 px-3 text-right">Perubahan</th>
                <th className="py-3 px-3 text-right">Sebelum &rarr; Sesudah</th>
                <th className="py-3 px-4">Petugas &amp; Catatan</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Memuat log aktivitas dari PostgreSQL...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Belum ada catatan mutasi yang cocok.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isIn = log.changeType === 'RESTOCK_IN' || log.changeType === 'TRANSFER_IN';
                  const isOut = log.changeType === 'SALE_OUT' || log.changeType === 'TRANSFER_OUT';

                  return (
                    <tr key={log.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <StoreIcon className={`w-3.5 h-3.5 ${primaryText} shrink-0`} />
                          <span className="truncate max-w-[140px] font-medium">{log.storeName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className={`font-bold truncate max-w-[180px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{log.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{log.sku}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isIn
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isOut
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isIn ? (
                            <ArrowDownRight className="w-3 h-3" />
                          ) : isOut ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          <span>
                            {log.changeType === 'RESTOCK_IN'
                              ? 'Masuk'
                              : log.changeType === 'SALE_OUT'
                              ? 'Keluar'
                              : 'Opname'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span
                          className={
                            log.quantityDelta > 0
                              ? 'text-emerald-500'
                              : log.quantityDelta < 0
                              ? 'text-rose-500'
                              : 'text-slate-400'
                          }
                        >
                          {log.quantityDelta > 0 ? `+${log.quantityDelta}` : log.quantityDelta}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400 font-normal">{log.unit}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                        <span>{log.stockBefore}</span>
                        <span className="text-slate-400 mx-1">&rarr;</span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{log.stockAfter}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[130px] font-medium">{log.performedByName}</span>
                        </div>
                        {log.notes && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-[200px]">
                            {log.notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className={`px-4 py-3 border-t flex items-center justify-between text-xs ${
          isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div>
            Menampilkan <strong className={isDark ? 'text-white' : 'text-slate-900'}>{filteredLogs.length}</strong> dari <strong className={isDark ? 'text-white' : 'text-slate-900'}>{total}</strong> log tercatat
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`px-3 py-1 rounded-lg border font-semibold disabled:opacity-40 cursor-pointer transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Sebelumnya
            </button>
            <span className="font-medium">
              Halaman {page} dari {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={`px-3 py-1 rounded-lg border font-semibold disabled:opacity-40 cursor-pointer transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
