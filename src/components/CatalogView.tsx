import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { Product } from '../types.ts';
import { offlineStorage } from '../lib/offlineStore.ts';
import {
  Package,
  Plus,
  Search,
  Tag,
  Barcode,
  Layers,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  WifiOff,
} from 'lucide-react';

export const CatalogView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { isDark, primaryBg, primaryHoverBg, primaryText, primaryLightBg, primaryBorder } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  // Add Product Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    unit: 'pcs',
    costPrice: 0,
    sellingPrice: 0,
    minStockThreshold: 10,
    description: '',
  });
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/products?limit=${limit}&offset=${offset}${searchParam}`);
      if (res.ok) {
        const data = await res.json();
        const prods = data.products || [];
        setProducts(prods);
        setTotal(data.total || 0);
        if (prods.length > 0) {
          offlineStorage.mergeProducts(prods);
        }
      } else {
        throw new Error('Server returned error');
      }
    } catch (e) {
      // Offline fallback: load cached products from device memory
      let cached = offlineStorage.getProducts();
      if (search) {
        const q = search.toLowerCase();
        cached = cached.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
        );
      }
      const offset = (page - 1) * limit;
      setProducts(cached.slice(offset, offset + limit));
      setTotal(cached.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.name || !formData.barcode) {
      setModalError('Harap lengkapi SKU, Barcode, dan Nama Barang');
      return;
    }

    setModalSaving(true);
    setModalError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({
          sku: '',
          barcode: '',
          name: '',
          unit: 'pcs',
          costPrice: 0,
          sellingPrice: 0,
          minStockThreshold: 10,
          description: '',
        });
        fetchProducts();
      } else {
        const data = await res.json();
        setModalError(data.error || 'Gagal menambahkan produk');
      }
    } catch (err: any) {
      setModalError(err.message || 'Koneksi bermasalah');
    } finally {
      setModalSaving(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div id="catalog-view" className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <span>Katalog Master SKU & Produk</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
              isDark ? 'bg-slate-800 text-indigo-400 border-slate-700' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              Skala s/d 50.000 SKU
            </span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Daftar master seluruh SKU yang terdistribusi ke lebih dari 100 toko cabang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2 ${primaryBg} ${primaryHoverBg} text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95`}
            >
              <Plus className="w-4 h-4" />
              <span>Tambah SKU Baru</span>
            </button>
          ) : (
            <div
              title="Hanya Administrator yang memiliki akses mengubah master katalog"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Akses Staff: Read-Only Master</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className={`border rounded-xl p-3 flex items-center justify-between gap-3 transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan SKU, Barcode, atau Nama Produk..."
            className={`w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>
        <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Total Master Terdaftar: <strong className={`font-bold ${primaryText}`}>{total.toLocaleString('id-ID')} SKU</strong>
        </div>
      </div>

      {/* Products Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-xl transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b uppercase font-bold text-[11px] tracking-wider ${
              isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3.5 px-4">SKU / Kode Barang</th>
                <th className="py-3.5 px-3">Barcode Fisik</th>
                <th className="py-3.5 px-4">Nama Produk &amp; Deskripsi</th>
                <th className="py-3.5 px-3">Kategori</th>
                <th className="py-3.5 px-3 text-right">Harga Beli</th>
                <th className="py-3.5 px-3 text-right">Harga Jual</th>
                <th className="py-3.5 px-3 text-right">Batas Min</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Memuat katalog produk dari PostgreSQL...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Tidak ditemukan produk dengan kata kunci tersebut.
                  </td>
                </tr>
              ) : (
                products.map((item) => (
                  <tr key={item.id} className={`transition-colors ${
                    isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                  }`}>
                    <td className={`py-3 px-4 font-mono font-bold ${primaryText}`}>
                      {item.sku}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.barcode}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</div>
                      {item.description && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-medium">
                      {item.categoryName || 'Umum'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 font-mono">
                      {formatRupiah(item.costPrice)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-500 font-bold font-mono">
                      {formatRupiah(item.sellingPrice)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 font-medium">
                      {item.minStockThreshold} {item.unit}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className={`px-4 py-3 border-t flex items-center justify-between text-xs ${
          isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div>
            Menampilkan <strong className={isDark ? 'text-white' : 'text-slate-900'}>{products.length}</strong> dari <strong className={isDark ? 'text-white' : 'text-slate-900'}>{total}</strong> produk
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

      {/* Add Product Modal (Admin Exclusive) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <form
            onSubmit={handleCreateProduct}
            className={`border rounded-2xl p-5 w-full max-w-lg space-y-4 shadow-2xl transition-all ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="font-bold text-sm">Tambah Master SKU Baru</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">SKU Barang:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SKU-10025"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Kode Barcode:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 899123456789"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Nama Produk:</label>
              <input
                type="text"
                required
                placeholder="Contoh: Beras Premium 5kg"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Harga Beli (Rp):</label>
                <input
                  type="number"
                  min="0"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseInt(e.target.value) || 0 })}
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Harga Jual (Rp):</label>
                <input
                  type="number"
                  min="0"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: parseInt(e.target.value) || 0 })}
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Batas Min Stok:</label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStockThreshold}
                  onChange={(e) => setFormData({ ...formData, minStockThreshold: parseInt(e.target.value) || 0 })}
                  className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className={`px-4 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                }`}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={modalSaving}
                className={`px-4 py-2 rounded-xl ${primaryBg} ${primaryHoverBg} text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-md`}
              >
                {modalSaving ? 'Menyimpan...' : 'Simpan Produk'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
