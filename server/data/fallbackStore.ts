export interface StoreData {
  id: number;
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface CategoryData {
  id: number;
  name: string;
  code: string;
}

export interface ProductData {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  categoryId: number;
  categoryName?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  minStockThreshold: number;
  description: string;
  createdAt: string;
}

export interface StoreInventoryData {
  id: number;
  storeId: number;
  productId: number;
  stockQuantity: number;
  lastUpdated: string;
}

export interface ActivityLogData {
  id: number;
  storeId: number;
  storeName: string;
  productId: number;
  productName: string;
  sku: string;
  unit: string;
  changeType: 'RESTOCK_IN' | 'SALE_OUT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'RETURN';
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  referenceNumber: string;
  notes: string;
  performedByUid: string;
  performedByName: string;
  timestamp: string;
}

export interface NotificationData {
  id: number;
  storeId: number | null;
  storeName: string;
  productId: number | null;
  productName: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'TRANSFER_UPDATE' | 'SYNC_SUCCESS';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

class FallbackStoreManager {
  stores: StoreData[] = [
    {
      id: 1,
      code: 'STR-001',
      name: 'Cabang Utama Jakarta Sudirman',
      city: 'Jakarta',
      address: 'Jl. Jenderal Sudirman Kav. 21, Jakarta Pusat',
      phone: '021-5551234',
      isActive: true,
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    },
    {
      id: 2,
      code: 'STR-002',
      name: 'Cabang Surabaya Tunjungan',
      city: 'Surabaya',
      address: 'Jl. Embong Malang No. 88, Surabaya Barat',
      phone: '031-6667890',
      isActive: true,
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    {
      id: 3,
      code: 'STR-003',
      name: 'Cabang Bandung Dago',
      city: 'Bandung',
      address: 'Jl. Ir. H. Juanda No. 102, Coblong, Bandung',
      phone: '022-7773456',
      isActive: true,
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
    {
      id: 4,
      code: 'STR-004',
      name: 'Cabang Medan Merdeka',
      city: 'Medan',
      address: 'Jl. Balai Kota No. 1, Medan Barat',
      phone: '061-8889012',
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 5,
      code: 'STR-005',
      name: 'Cabang Bali Kuta Square',
      city: 'Denpasar / Badung',
      address: 'Jl. Bakung Sari No. 12, Kuta, Bali',
      phone: '0361-9994321',
      isActive: true,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ];

  categories: CategoryData[] = [
    { id: 1, name: 'Elektronik & Gadget', code: 'ELK' },
    { id: 2, name: 'Makanan & Minuman', code: 'FNB' },
    { id: 3, name: 'Perawatan Pribadi & Farmasi', code: 'PHR' },
    { id: 4, name: 'Peralatan Rumah Tangga', code: 'HME' },
    { id: 5, name: 'Alat Tulis Kantor & Sekolah', code: 'ATK' },
  ];

  products: ProductData[] = [
    {
      id: 1,
      sku: 'ELK-WCH-001',
      barcode: '8991234560012',
      name: 'Wireless Fast Charger Pad 15W Qi',
      categoryId: 1,
      categoryName: 'Elektronik & Gadget',
      unit: 'pcs',
      costPrice: 85000,
      sellingPrice: 145000,
      minStockThreshold: 15,
      description: 'Pengisi daya nirkabel cepat dengan proteksi temperatur dan lampu LED indikator.',
      createdAt: new Date(Date.now() - 80 * 86400000).toISOString(),
    },
    {
      id: 2,
      sku: 'ELK-EAR-002',
      barcode: '8991234560029',
      name: 'TWS Bluetooth Earbuds ANC Pro',
      categoryId: 1,
      categoryName: 'Elektronik & Gadget',
      unit: 'pcs',
      costPrice: 220000,
      sellingPrice: 389000,
      minStockThreshold: 10,
      description: 'Earbuds dengan Active Noise Cancelling, bass bertenaga dan baterai tahan 30 jam.',
      createdAt: new Date(Date.now() - 75 * 86400000).toISOString(),
    },
    {
      id: 3,
      sku: 'ELK-CAB-003',
      barcode: '8991234560036',
      name: 'Kabel Data Braided USB-C to USB-C 100W (1.5m)',
      categoryId: 1,
      categoryName: 'Elektronik & Gadget',
      unit: 'pcs',
      costPrice: 32000,
      sellingPrice: 65000,
      minStockThreshold: 25,
      description: 'Kabel nilon tebal braided mendukung Power Delivery pengisian cepat laptop dan HP.',
      createdAt: new Date(Date.now() - 70 * 86400000).toISOString(),
    },
    {
      id: 4,
      sku: 'FNB-KOP-004',
      barcode: '8991234560043',
      name: 'Biji Kopi Arabika Gayo Specialty 250g',
      categoryId: 2,
      categoryName: 'Makanan & Minuman',
      unit: 'pack',
      costPrice: 55000,
      sellingPrice: 92000,
      minStockThreshold: 20,
      description: 'Biji kopi sangrai medium roast dengan aroma buah dan floral khas dataran tinggi Aceh Gayo.',
      createdAt: new Date(Date.now() - 65 * 86400000).toISOString(),
    },
    {
      id: 5,
      sku: 'FNB-SUS-005',
      barcode: '8991234560050',
      name: 'Susu UHT Full Cream Premium 1 Liter',
      categoryId: 2,
      categoryName: 'Makanan & Minuman',
      unit: 'karton',
      costPrice: 18500,
      sellingPrice: 24500,
      minStockThreshold: 30,
      description: 'Susu sapi murni segar kaya kalsium dan vitamin D, kemasan higienis tetra pak.',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    {
      id: 6,
      sku: 'FNB-CKL-006',
      barcode: '8991234560067',
      name: 'Dark Chocolate Batangan 70% Kakao 100g',
      categoryId: 2,
      categoryName: 'Makanan & Minuman',
      unit: 'pcs',
      costPrice: 22000,
      sellingPrice: 38000,
      minStockThreshold: 15,
      description: 'Cokelat hitam artisan dengan rasa pahit manis seimbang tanpa pengawet buatan.',
      createdAt: new Date(Date.now() - 55 * 86400000).toISOString(),
    },
    {
      id: 7,
      sku: 'PHR-SBN-007',
      barcode: '8991234560074',
      name: 'Sabun Cair Antibakterial Tea Tree 500ml',
      categoryId: 3,
      categoryName: 'Perawatan Pribadi & Farmasi',
      unit: 'botol',
      costPrice: 28000,
      sellingPrice: 46000,
      minStockThreshold: 20,
      description: 'Membersihkan kuman 99.9% sekaligus melembutkan kulit dengan ekstrak daun tea tree.',
      createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
    },
    {
      id: 8,
      sku: 'PHR-HND-008',
      barcode: '8991234560081',
      name: 'Hand Sanitizer Gel 70% Alkohol 100ml',
      categoryId: 3,
      categoryName: 'Perawatan Pribadi & Farmasi',
      unit: 'botol',
      costPrice: 9500,
      sellingPrice: 17500,
      minStockThreshold: 40,
      description: 'Pembersih tangan tanpa bilas berformula cepat kering dan tidak lengket.',
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
    {
      id: 9,
      sku: 'HME-TMB-009',
      barcode: '8991234560098',
      name: 'Tumbler Stainless Vacuum Insulated 600ml',
      categoryId: 4,
      categoryName: 'Peralatan Rumah Tangga',
      unit: 'pcs',
      costPrice: 65000,
      sellingPrice: 129000,
      minStockThreshold: 12,
      description: 'Menjaga minuman panas hingga 12 jam atau dingin 24 jam, bahan food grade SUS 304.',
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    },
    {
      id: 10,
      sku: 'ATK-BKP-010',
      barcode: '8991234560104',
      name: 'Buku Catatan Hardcover Grid A5 160 Hal',
      categoryId: 5,
      categoryName: 'Alat Tulis Kantor & Sekolah',
      unit: 'buku',
      costPrice: 18000,
      sellingPrice: 34000,
      minStockThreshold: 25,
      description: 'Kertas tebal 100gsm tidak tembus tinta, jilid jahit benang kuat dengan pita penanda.',
      createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
    },
  ];

  inventory: StoreInventoryData[] = [];
  activityLogs: ActivityLogData[] = [];
  notifications: NotificationData[] = [];

  constructor() {
    this.seedInventoryAndLogs();
  }

  private seedInventoryAndLogs() {
    let invId = 1;
    // Generate inventory for all 5 stores and all 10 products
    for (const store of this.stores) {
      for (const product of this.products) {
        // Vary stock per store
        let stock = 0;
        if (store.id === 1) {
          stock = (product.id * 7 + 12) % 65;
        } else if (store.id === 2) {
          stock = (product.id * 5 + 8) % 50;
        } else if (store.id === 3) {
          stock = (product.id * 9 + 4) % 40;
        } else {
          stock = (product.id * 4 + 10) % 35;
        }

        // Intentionally create low stock or out of stock items for demonstration
        if (product.id === 2 && store.id === 1) stock = 3; // Low stock
        if (product.id === 6 && store.id === 1) stock = 0; // Out of stock
        if (product.id === 8 && store.id === 2) stock = 4; // Low stock

        this.inventory.push({
          id: invId++,
          storeId: store.id,
          productId: product.id,
          stockQuantity: stock,
          lastUpdated: new Date(Date.now() - (product.id * 3 + store.id) * 3600000).toISOString(),
        });
      }
    }

    // Seed activity logs
    let logId = 1;
    this.activityLogs = [
      {
        id: logId++,
        storeId: 1,
        storeName: 'Cabang Utama Jakarta Sudirman',
        productId: 1,
        productName: 'Wireless Fast Charger Pad 15W Qi',
        sku: 'ELK-WCH-001',
        unit: 'pcs',
        changeType: 'RESTOCK_IN',
        quantityDelta: 20,
        stockBefore: 15,
        stockAfter: 35,
        referenceNumber: 'PO-2026-09-001',
        notes: 'Penerimaan stok dari gudang logistik pusat Cikarang',
        performedByUid: 'usr-admin-001',
        performedByName: 'Administrator Utama (Super Admin)',
        timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
      },
      {
        id: logId++,
        storeId: 1,
        storeName: 'Cabang Utama Jakarta Sudirman',
        productId: 4,
        productName: 'Biji Kopi Arabika Gayo Specialty 250g',
        sku: 'FNB-KOP-004',
        unit: 'pack',
        changeType: 'SALE_OUT',
        quantityDelta: -5,
        stockBefore: 28,
        stockAfter: 23,
        referenceNumber: 'INV-20260922-0042',
        notes: 'Penjualan kasir POS meja depan',
        performedByUid: 'usr-staff-001',
        performedByName: 'Budi Santoso (Staff Toko Cabang 1)',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      {
        id: logId++,
        storeId: 2,
        storeName: 'Cabang Surabaya Tunjungan',
        productId: 3,
        productName: 'Kabel Data Braided USB-C to USB-C 100W (1.5m)',
        sku: 'ELK-CAB-003',
        unit: 'pcs',
        changeType: 'ADJUSTMENT',
        quantityDelta: -2,
        stockBefore: 22,
        stockAfter: 20,
        referenceNumber: 'ADJ-2026-09-12',
        notes: 'Penyesuaian stok fisik rusak / cacat kemasan',
        performedByUid: 'usr-staff-002',
        performedByName: 'Siti Aminah (Kasir Toko Cabang 2)',
        timestamp: new Date(Date.now() - 7 * 3600000).toISOString(),
      },
      {
        id: logId++,
        storeId: 1,
        storeName: 'Cabang Utama Jakarta Sudirman',
        productId: 2,
        productName: 'TWS Bluetooth Earbuds ANC Pro',
        sku: 'ELK-EAR-002',
        unit: 'pcs',
        changeType: 'SALE_OUT',
        quantityDelta: -4,
        stockBefore: 7,
        stockAfter: 3,
        referenceNumber: 'INV-20260922-0089',
        notes: 'Penjualan promosi flash sale akhir pekan',
        performedByUid: 'usr-staff-001',
        performedByName: 'Budi Santoso (Staff Toko Cabang 1)',
        timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
      },
    ];

    // Seed notifications
    let notifId = 1;
    this.notifications = [
      {
        id: notifId++,
        storeId: 1,
        storeName: 'Cabang Utama Jakarta Sudirman',
        productId: 6,
        productName: 'Dark Chocolate Batangan 70% Kakao 100g',
        type: 'OUT_OF_STOCK',
        title: 'Stok Habis!',
        message: 'Produk Dark Chocolate Batangan 70% Kakao 100g di Cabang Utama Jakarta Sudirman saat ini 0 pcs. Segera lakukan restock!',
        isRead: false,
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
      {
        id: notifId++,
        storeId: 1,
        storeName: 'Cabang Utama Jakarta Sudirman',
        productId: 2,
        productName: 'TWS Bluetooth Earbuds ANC Pro',
        type: 'LOW_STOCK',
        title: 'Peringatan Stok Menipis',
        message: 'Stok TWS Bluetooth Earbuds ANC Pro tersisa 3 pcs (Batas minimum: 10 pcs).',
        isRead: false,
        createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
      },
      {
        id: notifId++,
        storeId: 2,
        storeName: 'Cabang Surabaya Tunjungan',
        productId: 8,
        productName: 'Hand Sanitizer Gel 70% Alkohol 100ml',
        type: 'LOW_STOCK',
        title: 'Peringatan Stok Menipis',
        message: 'Stok Hand Sanitizer Gel 70% Alkohol 100ml tersisa 4 pcs (Batas minimum: 40 pcs).',
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      },
    ];
  }

  // Mutator methods
  addStockMovement(
    storeId: number,
    productId: number,
    changeType: 'RESTOCK_IN' | 'SALE_OUT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'RETURN',
    quantityDelta: number,
    notes: string,
    refNum: string,
    performerUid: string,
    performerName: string
  ) {
    const store = this.stores.find((s) => s.id === storeId);
    const product = this.products.find((p) => p.id === productId);
    if (!store || !product) {
      throw new Error('Toko atau produk tidak ditemukan');
    }

    let inv = this.inventory.find((i) => i.storeId === storeId && i.productId === productId);
    if (!inv) {
      inv = {
        id: this.inventory.length + 1,
        storeId,
        productId,
        stockQuantity: 0,
        lastUpdated: new Date().toISOString(),
      };
      this.inventory.push(inv);
    }

    const stockBefore = inv.stockQuantity;
    const stockAfter = Math.max(0, stockBefore + quantityDelta);
    inv.stockQuantity = stockAfter;
    inv.lastUpdated = new Date().toISOString();

    const log: ActivityLogData = {
      id: this.activityLogs.length + 1,
      storeId,
      storeName: store.name,
      productId,
      productName: product.name,
      sku: product.sku,
      unit: product.unit,
      changeType,
      quantityDelta,
      stockBefore,
      stockAfter,
      referenceNumber: refNum || `TX-${Date.now().toString().slice(-6)}`,
      notes: notes || '',
      performedByUid: performerUid || 'usr-system',
      performedByName: performerName || 'System Operator',
      timestamp: new Date().toISOString(),
    };

    this.activityLogs.unshift(log);

    // Create notifications if stock goes below threshold
    if (stockAfter === 0) {
      this.notifications.unshift({
        id: this.notifications.length + 1,
        storeId,
        storeName: store.name,
        productId,
        productName: product.name,
        type: 'OUT_OF_STOCK',
        title: 'Stok Habis!',
        message: `Stok ${product.name} di ${store.name} telah habis (0 ${product.unit}).`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } else if (stockAfter <= product.minStockThreshold) {
      this.notifications.unshift({
        id: this.notifications.length + 1,
        storeId,
        storeName: store.name,
        productId,
        productName: product.name,
        type: 'LOW_STOCK',
        title: 'Peringatan Stok Menipis',
        message: `Stok ${product.name} di ${store.name} tersisa ${stockAfter} ${product.unit} (Batas minimum: ${product.minStockThreshold} ${product.unit}).`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    return { inv, log };
  }
}

export const fallbackStore = new FallbackStoreManager();
