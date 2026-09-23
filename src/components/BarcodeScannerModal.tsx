import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Product, InventoryItem } from '../types.ts';
import { playBarcodeBeep, playAlertBeep } from '../lib/sound.ts';
import { offlineStorage } from '../lib/offlineStore.ts';
import {
  X,
  ScanBarcode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStockUpdated?: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onStockUpdated,
}) => {
  const { user, selectedStore, isOnline } = useAuth();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<(Product & { currentStock?: number }) | null>(null);
  const [changeType, setChangeType] = useState<'RESTOCK_IN' | 'SALE_OUT' | 'ADJUSTMENT'>('RESTOCK_IN');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState<Array<{ sku: string; name: string; qty: number; type: string; time: string }>>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [quickSearchList, setQuickSearchList] = useState<Product[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      loadSampleProducts();
    }
  }, [isOpen]);

  // Load products for quick scan suggestions
  const loadSampleProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=12');
      if (res.ok) {
        const data = await res.json();
        setQuickSearchList(data.products || []);
      }
    } catch {
      setQuickSearchList(offlineStorage.getProducts().slice(0, 12));
    }
  };

  // Hardware barcode scanner listener (captures rapid keyboard inputs ending with Enter)
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in notes input, ignore
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleLookupBarcode(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedStore]);

  // Camera toggle handler
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } catch (err) {
        console.warn('Camera access not allowed or unavailable:', err);
        setStatusMessage({
          type: 'error',
          text: 'Kamera tidak dapat diakses di frame browser ini. Anda dapat memasukkan barcode secara manual atau memilih sampel di bawah.',
        });
      }
    }
  };

  // Clean up camera on close
  useEffect(() => {
    if (!isOpen && cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
    }
  }, [isOpen, cameraActive]);

  const handleLookupBarcode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setStatusMessage(null);

    // Helper to search from local offline cache
    const lookupOffline = () => {
      const cached = offlineStorage.getProducts().find(
        (p) => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase()
      );
      if (cached) {
        playBarcodeBeep();
        const storeInv = selectedStore ? offlineStorage.getStoreInventory(selectedStore.id) : [];
        const invItem = storeInv.find((i) => i.productId === cached.id);
        setScannedProduct({
          ...cached,
          currentStock: invItem?.stockQuantity ?? 0,
        });
        setBarcodeInput('');
        return true;
      }
      return false;
    };

    try {
      const storeParam = selectedStore ? `&storeId=${selectedStore.id}` : '';
      const res = await fetch(`/api/products/search/barcode?barcode=${encodeURIComponent(trimmed)}${storeParam}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data.product) {
          playBarcodeBeep();
          setScannedProduct({
            ...data.product,
            currentStock: data.currentStock ?? 0,
          });
          setBarcodeInput('');
          return;
        }
      }

      // If server returned 404 or product not found, try offline cache
      if (!lookupOffline()) {
        playAlertBeep();
        setStatusMessage({
          type: 'error',
          text: `Barcode "${trimmed}" tidak terdaftar di sistem.`,
        });
      }
    } catch {
      // Offline fallback when network is unavailable
      if (!lookupOffline()) {
        playAlertBeep();
        setStatusMessage({
          type: 'error',
          text: `Mode Offline: Barcode "${trimmed}" tidak ditemukan di data lokal perangkat.`,
        });
      }
    }
  };

  const handleSubmitMutation = async () => {
    if (!scannedProduct || !selectedStore) return;
    if (quantity <= 0) {
      setStatusMessage({ type: 'error', text: 'Jumlah harus lebih besar dari 0' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    const delta = changeType === 'RESTOCK_IN' ? quantity : changeType === 'SALE_OUT' ? -quantity : quantity;
    const refNum = `SCAN-${Date.now().toString().slice(-6)}`;

    // If Offline
    if (!isOnline) {
      offlineStorage.enqueueMutation({
        id: `offline-${Date.now()}`,
        storeId: selectedStore.id,
        productId: scannedProduct.id,
        changeType,
        quantityDelta: delta,
        referenceNumber: refNum,
        notes: notes || `Scan Barcode Offline: ${scannedProduct.name}`,
        offlineTimestamp: new Date().toISOString(),
        productName: scannedProduct.name,
      });

      playBarcodeBeep();
      setRecentScans((prev) => [
        {
          sku: scannedProduct.sku,
          name: scannedProduct.name,
          qty: quantity,
          type: changeType,
          time: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 4),
      ]);

      setStatusMessage({
        type: 'success',
        text: `Berhasil disimpan di antrean lokal (Offline). Total stok terupdate otomatis.`,
      });
      setScannedProduct((prev) => prev ? { ...prev, currentStock: Math.max(0, (prev.currentStock || 0) + delta) } : null);
      setIsProcessing(false);
      onStockUpdated?.();
      return;
    }

    // Online submission to PostgreSQL
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }

      let res: Response;
      if (changeType === 'RESTOCK_IN') {
        res = await fetch('/api/inventory/restock', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storeId: selectedStore.id,
            productId: scannedProduct.id,
            quantity,
            notes: notes || 'Penerimaan stok via pemindai barcode',
            referenceNumber: refNum,
          }),
        });
      } else if (changeType === 'SALE_OUT') {
        res = await fetch('/api/inventory/sale', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storeId: selectedStore.id,
            productId: scannedProduct.id,
            quantity,
            notes: notes || 'Pengeluaran/penjualan via barcode',
            referenceNumber: refNum,
          }),
        });
      } else {
        res = await fetch('/api/inventory/adjustment', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storeId: selectedStore.id,
            productId: scannedProduct.id,
            newQuantity: quantity,
            reason: notes || 'Penyesuaian stok fisik (Stock Opname)',
          }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        playBarcodeBeep();
        setRecentScans((prev) => [
          {
            sku: scannedProduct.sku,
            name: scannedProduct.name,
            qty: quantity,
            type: changeType,
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 4),
        ]);

        setStatusMessage({
          type: 'success',
          text: `Stok berhasil diperbarui di PostgreSQL! Stok akhir: ${data.stockAfter ?? 'Tersimpan'}`,
        });

        // Update scanned product view
        setScannedProduct((prev) => (prev ? { ...prev, currentStock: data.stockAfter } : null));
        onStockUpdated?.();
      } else {
        const err = await res.json();
        playAlertBeep();
        setStatusMessage({
          type: 'error',
          text: err.error || 'Gagal memperbarui stok di server PostgreSQL',
        });
      }
    } catch (e: any) {
      playAlertBeep();
      setStatusMessage({
        type: 'error',
        text: `Koneksi gagal: ${e.message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="barcode-scanner-modal"
        className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Pemindai Barcode Terintegrasi
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {selectedStore?.name || 'Semua Toko'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Mendukung Scanner USB/Bluetooth Fisik, Kamera, dan Pencarian Cepat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Scanner Viewport / Camera Box */}
          <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden h-44 flex flex-col items-center justify-center text-center p-4">
            {cameraActive ? (
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                  <ScanBarcode className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-xs font-medium text-slate-300">
                  Arahkan Pemindai Barcode Fisik atau Ketik Nomor Barcode
                </div>
                <div className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Scanner genggam USB/Bluetooth akan langsung mendeteksi kode secara instan dengan nada bip konfirmasi.
                </div>
              </div>
            )}

            {/* Simulated Animated Red Laser Line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500/80 shadow-[0_0_8px_#f43f5e] pointer-events-none animate-bounce opacity-75" />

            {/* Toggle Camera Button */}
            <button
              type="button"
              onClick={toggleCamera}
              className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs flex items-center gap-1.5 backdrop-blur-sm cursor-pointer transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              <span>{cameraActive ? 'Tutup Kamera' : 'Buka Kamera HP'}</span>
            </button>
          </div>

          {/* Barcode Input & Lookup */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookupBarcode(barcodeInput);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <ScanBarcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan / masukkan kode barcode (contoh: 8991001001)..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-md transition-colors cursor-pointer shrink-0"
            >
              Cari SKU
            </button>
          </form>

          {/* Quick Click Samples */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Sampel Cepat Barcode Barang:</span>
              <span className="text-[10px] text-slate-500">Klik untuk uji langsung</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickSearchList.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleLookupBarcode(item.barcode)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="font-mono text-indigo-400">{item.barcode}</span>
                  <span className="truncate max-w-[120px]">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Scanned Detail & Action Form */}
          {scannedProduct && (
            <div className="bg-slate-850 border border-indigo-500/40 rounded-xl p-4 space-y-4 shadow-lg animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 font-semibold">
                    SKU: {scannedProduct.sku} • Barcode: {scannedProduct.barcode}
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">{scannedProduct.name}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Kategori: {scannedProduct.categoryName || 'Umum'} • Satuan: {scannedProduct.unit}
                  </div>
                </div>
                <div className="text-right shrink-0 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Stok Saat Ini</div>
                  <div className="text-lg font-extrabold text-white">
                    {scannedProduct.currentStock ?? 0}{' '}
                    <span className="text-xs font-normal text-slate-400">{scannedProduct.unit}</span>
                  </div>
                </div>
              </div>

              {/* Action Mode Selection */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setChangeType('RESTOCK_IN')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    changeType === 'RESTOCK_IN'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Stok Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChangeType('SALE_OUT')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    changeType === 'SALE_OUT'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Stok Keluar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChangeType('ADJUSTMENT')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    changeType === 'ADJUSTMENT'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Opname Fisik</span>
                </button>
              </div>

              {/* Quantity and Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {changeType === 'ADJUSTMENT' ? 'Jumlah Stok Fisik Riil:' : 'Jumlah Perubahan:'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full py-1.5 text-center bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center border border-slate-700 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Catatan Mutasi:
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: DO-091, Kasir 1, Opname Rak A"
                    className="w-full py-1.5 px-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Confirm Update Button */}
              <button
                type="button"
                onClick={handleSubmitMutation}
                disabled={isProcessing}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Menyimpan ke PostgreSQL...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Konfirmasi Perubahan Stok ({quantity} {scannedProduct.unit})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Recent Scans Session */}
          {recentScans.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Riwayat Pemindaian Terakhir (Sesi Ini):
              </div>
              <div className="space-y-1.5">
                {recentScans.map((scan, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400">{scan.sku}</span>
                      <span className="text-white font-medium truncate max-w-[150px]">{scan.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          scan.type === 'RESTOCK_IN'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : scan.type === 'SALE_OUT'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {scan.type === 'RESTOCK_IN' ? '+' : scan.type === 'SALE_OUT' ? '-' : '='}
                        {scan.qty}
                      </span>
                      <span className="text-[10px] text-slate-500">{scan.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>PostgreSQL RDBMS Read/Write Ready</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
