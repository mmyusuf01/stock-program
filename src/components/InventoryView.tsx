import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { InventoryItem } from '../types.ts';
import { playBarcodeBeep, playAlertBeep } from '../lib/sound.ts';
import { offlineStorage } from '../lib/offlineStore.ts';
import {
  Package,
  Search,
  Filter,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ScanBarcode,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';

interface InventoryViewProps {
  onOpenScanner: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onOpenScanner }) => {
  const { user, selectedStore, isOnline } = useAuth();
  const { isDark, primaryBg, primaryHoverBg, primaryText, primaryLightBg, primaryBorder } = useTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 25;

  // Mutation modal state
  const [selectedItemForAction, setSelectedItemForAction] = useState<InventoryItem | null>(null);
  const [actionType, setActionType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [actionQty, setActionQty] = useState(1);
  const [actionNotes, setActionNotes] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchInventory = async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }

      const offset = (page - 1) * limit;
      const lowStockParam = statusFilter === 'LOW' ? '&lowStock=true' : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';

      const res = await fetch(
        `/api/inventory?storeId=${selectedStore.id}&limit=${limit}&offset=${offset}${lowStockParam}${searchParam}`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        const inv = data.inventory || [];
        setItems(inv);
        setTotalCount(data.total || 0);
        offlineStorage.mergeInventory(selectedStore.id, inv);
      } else {
        throw new Error('Server offline');
      }
    } catch {
      // Offline fallback: load cached store inventory and apply search/filter locally
      let cached = offlineStorage.getStoreInventory(selectedStore.id);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        cached = cached.filter((i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          (i.barcode && i.barcode.toLowerCase().includes(q))
        );
      }
      if (statusFilter === 'LOW') {
        cached = cached.filter((i) => i.stockQuantity <= i.minStockThreshold && i.stockQuantity > 0);
      } else if (statusFilter === 'OUT') {
        cached = cached.filter((i) => i.stockQuantity <= 0);
      }
      setTotalCount(cached.length);
      const offset = (page - 1) * limit;
      setItems(cached.slice(offset, offset + limit));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [selectedStore, statusFilter, searchQuery]);

  useEffect(() => {
    fetchInventory();
  }, [selectedStore, page, statusFilter, searchQuery]);

  const handleExecuteAction = async () => {
    if (!selectedItemForAction || !selectedStore) return;
    setActionProcessing(true);
    setActionError(null);

    const refNum = `MUT-${Date.now().toString().slice(-6)}`;
    const delta = actionType === 'IN' ? actionQty : actionType === 'OUT' ? -actionQty : actionQty;

    if (!isOnline) {
      // Enqueue offline
      offlineStorage.enqueueMutation({
        id: `offline-${Date.now()}`,
        storeId: selectedStore.id,
        productId: selectedItemForAction.productId,
        changeType: actionType === 'IN' ? 'RESTOCK_IN' : actionType === 'OUT' ? 'SALE_OUT' : 'ADJUSTMENT',
        quantityDelta: delta,
        referenceNumber: refNum,
        notes: actionNotes || `Mutasi Offline ${actionType}`,
        offlineTimestamp: new Date().toISOString(),
        productName: selectedItemForAction.name,
      });

      playBarcodeBeep();
      setSelectedItemForAction(null);
      setActionProcessing(false);
      fetchInventory();
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }

      let res: Response;
      if (actionType === 'IN') {
        res = await fetch('/api/inventory/restock', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storeId: selectedStore.id,
            productId: selectedItemForAction.productId,
            quantity: actionQty,
            notes: actionNotes || 'Restock manual inventaris',
            referenceNumber: refNum,
          }),
        });
      } else if (actionType === 'OUT') {
        res = await fetch('/api/inventory/sale', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storeId: selectedStore.id,
            productId: selectedItemForAction.productId,
            quantity: actionQty,
            notes: actionNotes || 'Pengeluaran barang',
            referenceNumber: refNum,
          }),
        });
      } else {
        res = await fetch('/api/inventory/adjustment', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storeId: selectedStore.id,
            productId: selectedItemForAction.productId,
            newQuantity: actionQty,
            reason: actionNotes || 'Stock Opname Fisik Toko',
          }),
        });
      }

      if (res.ok) {
        playBarcodeBeep();
        setSelectedItemForAction(null);
        fetchInventory();
      } else {
        const err = await res.json();
        playAlertBeep();
        setActionError(err.error || 'Gagal memproses mutasi stok.');
      }
    } catch (e: any) {
      playAlertBeep();
      setActionError(e.message || 'Koneksi bermasalah');
    } finally {
      setActionProcessing(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div id="inventory-view" className="space-y-5 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <span>Manajemen Stok Inventaris</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
              isDark ? 'bg-slate-800 text-indigo-400 border-slate-700' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              {selectedStore?.name || 'Cabang Belum Dipilih'}
            </span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Kelola level kuantitas stok per SKU dengan konfirmasi real-time di PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInventory}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
            }`}
            title="Segarkan Stok"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenScanner}
            className={`flex items-center gap-2 px-3.5 py-2 ${primaryBg} ${primaryHoverBg} text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95`}
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Pindai Barcode</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`border rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari SKU, Barcode, atau Nama Produk..."
            className={`w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              statusFilter === 'ALL'
                ? isDark ? 'bg-slate-700 text-white' : 'bg-slate-800 text-white'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua Stok
          </button>
          <button
            onClick={() => setStatusFilter('LOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
              statusFilter === 'LOW'
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                : 'text-amber-500/80 hover:bg-amber-500/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Stok Tipis (≤ Min)</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-xl transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b uppercase font-bold text-[11px] tracking-wider ${
              isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3.5 px-4">Barang / SKU</th>
                <th className="py-3.5 px-3">Barcode</th>
                <th className="py-3.5 px-3">Kategori</th>
                <th className="py-3.5 px-3 text-right">Stok Fisik</th>
                <th className="py-3.5 px-3 text-right">Batas Min</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Tindakan Cepat</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Memuat data inventaris dari PostgreSQL...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Tidak ada barang yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isZero = item.stockQuantity <= 0;
                  const isLow = item.stockQuantity <= item.minStockThreshold;

                  return (
                    <tr key={item.inventoryId} className={`transition-colors ${
                      isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}>
                      <td className="py-3 px-4">
                        <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium">
                        {item.barcode}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {item.categoryName || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        <span className={`text-sm ${isZero ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {item.stockQuantity}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 font-medium">
                        {item.minStockThreshold} {item.unit}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isZero ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30">
                            Kosong
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                            Stok Tipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemForAction(item);
                              setActionType('IN');
                              setActionQty(10);
                            }}
                            title="Tambah Stok Masuk"
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 cursor-pointer transition-all hover:scale-110 shadow-sm"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemForAction(item);
                              setActionType('OUT');
                              setActionQty(1);
                            }}
                            title="Keluarkan / Jual Stok"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 cursor-pointer transition-all hover:scale-110 shadow-sm"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemForAction(item);
                              setActionType('ADJUST');
                              setActionQty(item.stockQuantity);
                            }}
                            title="Opname Fisik"
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 cursor-pointer transition-all hover:scale-110 shadow-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
            Menampilkan <strong className={isDark ? 'text-white' : 'text-slate-900'}>{items.length}</strong> dari <strong className={isDark ? 'text-white' : 'text-slate-900'}>{totalCount}</strong> barang
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

      {/* Quick Action Modal */}
      {selectedItemForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className={`border rounded-2xl p-5 w-full max-w-md space-y-4 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="font-bold text-sm">
                {actionType === 'IN'
                  ? 'Penerimaan Stok (Stok Masuk)'
                  : actionType === 'OUT'
                  ? 'Pengeluaran Stok (Stok Keluar)'
                  : 'Penyesuaian Fisik (Stock Opname)'}
              </h3>
              <button
                onClick={() => setSelectedItemForAction(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
                {actionError}
              </div>
            )}

            <div>
              <div className="text-xs text-slate-400">Produk:</div>
              <div className="font-bold text-sm">{selectedItemForAction.name}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                SKU: {selectedItemForAction.sku} • Stok Saat Ini: <span className="font-bold text-indigo-500">{selectedItemForAction.stockQuantity} {selectedItemForAction.unit}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {actionType === 'ADJUST' ? 'Kuantitas Stok Fisik Nyata:' : 'Jumlah Unit:'}
              </label>
              <input
                type="number"
                min="1"
                value={actionQty}
                onChange={(e) => setActionQty(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full px-3 py-2 border rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Catatan / Alasan Mutasi:
              </label>
              <input
                type="text"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Contoh: No Surat Jalan, Penjualan Kasir, dll."
                className={`w-full px-3 py-2 border rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedItemForAction(null)}
                className={`flex-1 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionProcessing}
                onClick={handleExecuteAction}
                className={`flex-1 py-2 rounded-xl ${primaryBg} ${primaryHoverBg} text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-md`}
              >
                {actionProcessing ? 'Menyimpan...' : 'Konfirmasi Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
