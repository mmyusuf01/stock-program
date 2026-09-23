import React, { useState, useEffect } from 'react';
import { User, Store } from '../types.ts';
import {
  X,
  ShieldCheck,
  UserCheck,
  Mail,
  User as UserIcon,
  Phone,
  Store as StoreIcon,
  Lock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedUser: User, isNew: boolean) => void;
  userToEdit?: User | null;
  allStores: Store[];
  currentActiveUser: User | null;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userToEdit,
  allStores,
  currentActiveUser,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [assignedStoreId, setAssignedStoreId] = useState<number | ''>(1);
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [pin, setPin] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEditing = Boolean(userToEdit);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || '');
      setEmail(userToEdit.email || '');
      setRole(userToEdit.role || 'staff');
      setAssignedStoreId(userToEdit.assignedStoreId !== null && userToEdit.assignedStoreId !== undefined ? userToEdit.assignedStoreId : '');
      setPhone(userToEdit.phone || '');
      setStatus(userToEdit.status || 'active');
      setPin(userToEdit.pin || '');
    } else {
      setName('');
      setEmail('');
      setRole('staff');
      setAssignedStoreId(allStores.length > 0 ? allStores[0].id : 1);
      setPhone('');
      setStatus('active');
      setPin('');
    }
    setErrorMsg(null);
  }, [userToEdit, isOpen, allStores]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama lengkap pengguna wajib diisi.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Masukkan alamat email yang valid.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentActiveUser?.email) {
        headers['x-user-email'] = currentActiveUser.email;
        headers['x-user-role'] = currentActiveUser.role;
      }

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        assignedStoreId: role === 'admin' && !assignedStoreId ? null : (assignedStoreId ? Number(assignedStoreId) : null),
        phone: phone.trim() || null,
        status,
        pin: pin.trim() || null,
      };

      const url = isEditing && userToEdit
        ? `/api/auth/users/${userToEdit.id || userToEdit.uid}`
        : '/api/auth/users';
      
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan data pengguna');
      }

      onSuccess(data.user, !isEditing);
      onClose();
    } catch (err: any) {
      console.error('Error saving user:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStores = allStores.filter(
    (s) =>
      s.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
      s.city.toLowerCase().includes(storeSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(storeSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
              role === 'admin'
                ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-indigo-600/30'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-600/30'
            }`}>
              {role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {isEditing ? 'Edit Data Pengguna' : 'Tambah User & Admin Baru'}
              </h3>
              <p className="text-xs text-slate-400">
                {role === 'admin' ? 'Hak Akses Administrator Sistem' : 'Hak Akses Staff Toko / Operasional'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role Selection Segmented Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Pilih Peran Akun (Role Access) <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Staff / Kasir Option */}
              <button
                type="button"
                onClick={() => setRole('staff')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  role === 'staff'
                    ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/40 text-white'
                    : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <UserCheck className={`w-4 h-4 ${role === 'staff' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    Staff Toko / Kasir
                  </span>
                  {role === 'staff' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Pindai barcode, input stok masuk & keluar cabang toko.
                </p>
              </button>

              {/* Admin Option */}
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  role === 'admin'
                    ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/40 text-white'
                    : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <ShieldCheck className={`w-4 h-4 ${role === 'admin' ? 'text-indigo-400' : 'text-slate-400'}`} />
                    Administrator Utama
                  </span>
                  {role === 'admin' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Akses seluruh cabang, master data SKU, log audit, & pengguna.
                </p>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nama Lengkap <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Ahmad Fauzan"
                className="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Alamat Email (Login) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ahmad.fauzan@toko.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Phone Number & Status in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nomor WhatsApp / HP
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-3456-7890"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Status Akun
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="active">🟢 Aktif (Bisa Masuk)</option>
                <option value="inactive">🔴 Nonaktif (Dinonaktifkan)</option>
              </select>
            </div>
          </div>

          {/* Store Assignment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Penugasan Cabang Toko
              </label>
              {role === 'admin' && (
                <span className="text-[10px] text-indigo-400">
                  Admin dapat mengelola seluruh toko
                </span>
              )}
            </div>

            <div className="relative">
              <StoreIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={assignedStoreId}
                onChange={(e) => setAssignedStoreId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {role === 'admin' && (
                  <option value="">🏢 Seluruh Toko / Kantor Pusat (HQ Global)</option>
                )}
                {allStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.code} • {store.name} ({store.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick PIN / Password helper */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              PIN Akses Cepat Terminal / Barcode Scanner (Opsional)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Misal: 123456 (6 angka untuk login cepat)"
                className="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono tracking-wider"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Memudahkan pergantian kasir/staff di terminal kasir fisik tanpa ketik password panjang.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 ${
                role === 'admin'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-indigo-600/30'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
              }`}
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Simpan Perubahan' : 'Tambah Pengguna'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
