import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { User, Store } from '../types.ts';
import { UserFormModal } from './UserFormModal.tsx';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Store as StoreIcon,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Edit3,
  LogIn,
  RefreshCw,
  Phone,
  Mail,
  Building,
  Key,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export const UsersManagementView: React.FC = () => {
  const { user: currentActiveUser, allStores, switchUser } = useAuth();
  const { isDark, primaryBg, primaryHoverBg, primaryText, primaryLightBg, primaryBorder } = useTheme();
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff'>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Show Permissions matrix
  const [showMatrix, setShowMatrix] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (currentActiveUser?.email) {
        headers['x-user-email'] = currentActiveUser.email;
        headers['x-user-role'] = currentActiveUser.role;
      }
      const res = await fetch('/api/auth/users', { headers });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentActiveUser]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    showToast(`Email ${email} disalin ke clipboard`, 'info');
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleOpenAddModal = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (targetUser: User) => {
    setUserToEdit(targetUser);
    setIsModalOpen(true);
  };

  const handleSuccessSave = (savedUser: User, isNew: boolean) => {
    fetchUsers();
    showToast(
      isNew
        ? `Pengguna ${savedUser.name} (${savedUser.role === 'admin' ? 'Administrator' : 'Staff Toko'}) berhasil ditambahkan!`
        : `Data pengguna ${savedUser.name} berhasil diperbarui!`
    );
  };

  const handleSimulateLogin = (targetUser: User) => {
    switchUser(targetUser);
    showToast(
      `Beralih aktif ke akun: ${targetUser.name} (${targetUser.role === 'admin' ? 'Administrator' : 'Staff Toko'})`,
      'success'
    );
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const headers: Record<string, string> = {};
      if (currentActiveUser?.email) {
        headers['x-user-email'] = currentActiveUser.email;
        headers['x-user-role'] = currentActiveUser.role;
      }
      const res = await fetch(`/api/auth/users/${userToDelete.id || userToDelete.uid}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus pengguna');
      }
      showToast(`Pengguna ${userToDelete.name} berhasil dihapus.`, 'info');
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus pengguna', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.storeName && u.storeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.storeCity && u.storeCity.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    const matchesStore =
      storeFilter === 'all' ||
      (storeFilter === 'hq' && (u.assignedStoreId === null || u.role === 'admin')) ||
      String(u.assignedStoreId) === storeFilter;

    return matchesSearch && matchesRole && matchesStore;
  });

  const totalAdmins = usersList.filter((u) => u.role === 'admin').length;
  const totalStaff = usersList.filter((u) => u.role === 'staff').length;
  const activeCount = usersList.filter((u) => u.status !== 'inactive').length;

  return (
    <div id="users-management-view" className="space-y-6 pb-16">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-20 right-4 sm:right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in slide-in-from-top duration-200 ${
          toastMessage.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
            : toastMessage.type === 'error'
            ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-950/50'
            : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200 shadow-indigo-950/50'
        }`}>
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner with Action Buttons */}
      <div className={`border rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-colors ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-slate-800'
          : 'bg-gradient-to-r from-white via-slate-50 to-white border-slate-200'
      }`}>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isDark ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                Manajemen Hak Akses &amp; RBAC
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {activeCount} Pengguna Aktif Sistem
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Manajemen Pengguna &amp; Administrator
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Tambah dan atur akun pengguna, tetapkan peran (Administrator Utama / Staff Toko), dan atur penugasan cabang toko secara terpusat di sistem PostgreSQL RDBMS.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowMatrix(!showMatrix)}
              className={`px-3 py-2 border rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                isDark ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-xs'
              }`}
            >
              <HelpCircle className={`w-3.5 h-3.5 ${primaryText}`} />
              <span>{showMatrix ? 'Sembunyikan Matriks Izin' : 'Matriks Izin Peran'}</span>
            </button>

            <button
              id="btn-add-user"
              type="button"
              onClick={handleOpenAddModal}
              className={`px-4 py-2 ${primaryBg} ${primaryHoverBg} text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah User &amp; Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Matrix Collapsible */}
      {showMatrix && (
        <div className={`border rounded-2xl p-5 space-y-4 shadow-xl transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-5 h-5 ${primaryText}`} />
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Matriks Hak Akses Peran (Role-Based Access Control)</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowMatrix(false)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer font-medium"
            >
              Tutup
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className={`p-3.5 rounded-xl border space-y-2 ${
              isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/60 border-indigo-200'
            }`}>
              <div className={`flex items-center gap-2 font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>Administrator Utama (Admin)</span>
              </div>
              <ul className={`space-y-1.5 list-disc pl-4 text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li>Akses penuh ke seluruh 105 cabang toko tanpa pembatasan wilayah.</li>
                <li>Tambah, edit, dan hapus master katalog produk &amp; SKU.</li>
                <li>Kelola daftar pengguna &amp; tetapkan peran baru (Admin / Staff).</li>
                <li>Melihat laporan valuasi keuangan (HPP vs Harga Jual) &amp; analitik harian.</li>
                <li>Ekspor dan impor data massal (CSV / Excel).</li>
              </ul>
            </div>

            <div className={`p-3.5 rounded-xl border space-y-2 ${
              isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200'
            }`}>
              <div className={`flex items-center gap-2 font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span>Staff Toko / Kasir (Staff)</span>
              </div>
              <ul className={`space-y-1.5 list-disc pl-4 text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li>Mengoperasikan pemindai barcode kamera untuk pencatatan mutasi cepat.</li>
                <li>Mencatat stok masuk (restock) dan stok keluar (penjualan/transfer) di cabang tugasnya.</li>
                <li>Menerima notifikasi otomatis saat stok barang di bawah ambang minimum.</li>
                <li>Melakukan stock opname cabang mandiri bahkan dalam kondisi offline.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 4 Stat Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className={`border rounded-2xl p-4 shadow-md flex items-center justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Pengguna</span>
            <div className={`text-2xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{usersList.length}</div>
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 mt-0.5">
              <span>{activeCount} akun aktif</span>
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
            isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
          }`}>
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Administrator Count */}
        <div className={`border rounded-2xl p-4 shadow-md flex items-center justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Administrator Utama</span>
            <div className={`text-2xl font-bold mt-0.5 ${primaryText}`}>{totalAdmins}</div>
            <span className={`text-[10px] font-medium flex items-center gap-1 mt-0.5 ${primaryText}`}>
              <span>Hak Akses Penuh (Global)</span>
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
            isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Staff Toko Count */}
        <div className={`border rounded-2xl p-4 shadow-md flex items-center justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Staff Toko &amp; Kasir</span>
            <div className="text-2xl font-bold text-emerald-500 mt-0.5">{totalStaff}</div>
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 mt-0.5">
              <span>Petugas Cabang &amp; Barcode</span>
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
            isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
          }`}>
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Active Stores Assignment */}
        <div className={`border rounded-2xl p-4 shadow-md flex items-center justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cakupan Cabang</span>
            <div className={`text-2xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{allStores.length}</div>
            <span className={`text-[10px] font-medium flex items-center gap-1 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Toko Terdaftar di RDBMS</span>
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
            isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
          }`}>
            <StoreIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search, Filter Toolbar & View Mode Switcher */}
      <div className={`border rounded-2xl p-3.5 space-y-3 shadow-md transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, email, toko, nomor HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-8 py-1.5 border rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters & View Toggle */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto">
            {/* Role Filter Tabs */}
            <div className={`flex items-center p-0.5 rounded-lg border text-xs font-semibold shrink-0 ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
            }`}>
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  roleFilter === 'all' ? `${primaryBg} text-white` : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua ({usersList.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('admin')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  roleFilter === 'admin' ? `${primaryBg} text-white` : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Admin ({totalAdmins})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('staff')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  roleFilter === 'staff' ? `${primaryBg} text-white` : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Staff ({totalStaff})
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className={`flex items-center p-0.5 rounded-lg border shrink-0 ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
            }`}>
              <button
                type="button"
                title="Tampilan Grid Kartu"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid' ? `${primaryBg} text-white` : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Tampilan Tabel"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table' ? `${primaryBg} text-white` : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Refresh list button */}
            <button
              type="button"
              title="Segarkan daftar"
              onClick={fetchUsers}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                isDark ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''} ${primaryText}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Users List Container */}
      {loading ? (
        <div className={`p-12 text-center border rounded-2xl space-y-3 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <RefreshCw className={`w-6 h-6 animate-spin mx-auto ${primaryText}`} />
          <p className="text-xs text-slate-400">Memuat data pengguna &amp; administrator...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className={`p-12 text-center border rounded-2xl space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto ${
            isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
          }`}>
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tidak ada pengguna yang cocok</h3>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Tidak ditemukan pengguna dengan kriteria pencarian atau filter yang dipilih. Silakan ubah filter atau tambah pengguna baru.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className={`px-4 py-2 ${primaryBg} ${primaryHoverBg} text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna Baru Sekarang</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const isAdmin = u.role === 'admin';
            const isActiveAccount = u.status !== 'inactive';
            const isSelf = currentActiveUser?.email === u.email;

            // Generate initials
            const initials = u.name
              ? u.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'U';

            return (
              <div
                key={u.id || u.uid}
                className={`border rounded-2xl p-4 flex flex-col justify-between transition-all shadow-md ${
                  isDark ? 'bg-slate-900/90' : 'bg-white'
                } ${
                  isSelf
                    ? isDark ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : 'border-indigo-400 ring-2 ring-indigo-100'
                    : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top card header: Avatar, Role Badge, Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md ${
                        isAdmin
                          ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-indigo-600/20'
                          : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-600/20'
                      }`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{u.name}</h4>
                          {isSelf && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                              Anda
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                          isAdmin
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          <span>{isAdmin ? 'Administrator' : 'Staff Toko'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${isActiveAccount ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                      <span className="text-[10px] text-slate-400">{isActiveAccount ? 'Aktif' : 'Nonaktif'}</span>
                    </div>
                  </div>

                  {/* Details: Email, Store Assignment, Contact */}
                  <div className={`space-y-2 py-2 border-y text-xs ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    {/* Email with copy button */}
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{u.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(u.email)}
                        title="Salin email"
                        className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer shrink-0 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Store assignment */}
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <StoreIcon className={`w-3.5 h-3.5 ${primaryText} shrink-0`} />
                      <span className="truncate">
                        {u.storeName || (isAdmin ? 'Semua Cabang Toko (Pusat)' : 'Belum Ditugaskan')}
                      </span>
                    </div>

                    {/* Contact Number */}
                    {u.phone && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <a
                          href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-500 transition-colors"
                        >
                          {u.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 flex items-center justify-between gap-1.5 mt-2">
                  {/* One-click user switch button */}
                  <button
                    type="button"
                    onClick={() => handleSimulateLogin(u)}
                    disabled={isSelf}
                    title={isSelf ? 'Anda sedang menggunakan akun ini' : 'Beralih ke akun ini untuk simulasi'}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelf
                        ? isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : `${primaryLightBg} ${primaryText} border ${primaryBorder} hover:brightness-110`
                    }`}
                  >
                    <LogIn className="w-3 h-3" />
                    <span>{isSelf ? 'Sedang Aktif' : 'Simulasi Masuk'}</span>
                  </button>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(u)}
                    title="Ubah data pengguna"
                    className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700/80 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => setUserToDelete(u)}
                    disabled={isSelf}
                    title={isSelf ? 'Tidak bisa menghapus akun sendiri' : 'Hapus pengguna'}
                    className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                      isSelf
                        ? 'opacity-30 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500'
                        : isDark
                        ? 'bg-slate-800 hover:bg-rose-950/40 hover:border-rose-500/40 border-slate-700 text-slate-400 hover:text-rose-400'
                        : 'bg-white hover:bg-rose-50 hover:border-rose-300 border-slate-300 text-slate-500 hover:text-rose-600'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Layout */
        <div className={`border rounded-2xl overflow-hidden shadow-xl transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">Nama &amp; Email Pengguna</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">Cabang Penugasan</th>
                  <th className="py-3 px-4">Kontak / WhatsApp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-700'}`}>
                {filteredUsers.map((u) => {
                  const isAdmin = u.role === 'admin';
                  const isSelf = currentActiveUser?.email === u.email;

                  return (
                    <tr key={u.id || u.uid} className={`transition-colors ${
                      isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    } ${isSelf ? (isDark ? 'bg-indigo-950/20' : 'bg-indigo-50/50') : ''}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                            isAdmin ? 'bg-indigo-600' : 'bg-emerald-600'
                          }`}>
                            {u.name?.slice(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-bold">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isAdmin
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          <span>{isAdmin ? 'Administrator' : 'Staff Toko'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <StoreIcon className={`w-3.5 h-3.5 ${primaryText} shrink-0`} />
                          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                            {u.storeName || (isAdmin ? 'Semua Cabang (Pusat)' : 'Belum Ditugaskan')}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {u.phone || '-'}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          u.status !== 'inactive'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status !== 'inactive' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {u.status !== 'inactive' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSimulateLogin(u)}
                            disabled={isSelf}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                              isSelf
                                ? 'text-slate-400 cursor-not-allowed'
                                : `${primaryLightBg} ${primaryText} border ${primaryBorder}`
                            }`}
                          >
                            {isSelf ? 'Aktif' : 'Masuk'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            title="Edit"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            disabled={isSelf}
                            title="Hapus"
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              isSelf
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccessSave}
        userToEdit={userToEdit}
        allStores={allStores}
        currentActiveUser={currentActiveUser}
      />

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-sm border rounded-2xl p-5 shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Konfirmasi Hapus Pengguna</h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Apakah Anda yakin ingin menghapus akun <strong className={isDark ? 'text-white' : 'text-slate-900'}>{userToDelete.name}</strong> ({userToDelete.email})? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className={`flex items-center justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                {isDeleting ? 'Menghapus...' : 'Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
