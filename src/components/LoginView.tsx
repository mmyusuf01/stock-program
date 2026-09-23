import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { User } from '../types.ts';
import { ShieldCheck, UserCheck, Database, ScanBarcode, ArrowRight, Lock, Mail, Store, Users, Sparkles } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginAs, loginWithGoogle, switchUser, isLoading } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch('/api/auth/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.users && Array.isArray(data.users)) {
          setRegisteredUsers(data.users);
        }
      })
      .catch(() => {});
  }, []);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMsg('Masukkan alamat email');
      return;
    }
    setErrorMsg(null);
    const found = registeredUsers.find(
      (u) => u.email.toLowerCase() === emailInput.trim().toLowerCase()
    );
    if (found) {
      switchUser(found);
      return;
    }
    const role = emailInput.toLowerCase().includes('admin') ? 'admin' : 'staff';
    await loginAs(role, emailInput.trim());
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg('Google Sign-In tidak dapat dibuka di jendela frame saat ini. Silakan gunakan tombol Masuk Cepat Administrator / Staff di bawah.');
    }
  };

  return (
    <div id="login-screen" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="w-full max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4 shadow-lg shadow-indigo-950/50">
          <Database className="w-8 h-8" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
          Inventaris Toko RDBMS
        </h1>
        <p className="text-slate-400 text-sm">
          Sistem Terintegrasi PostgreSQL • Barcode Scanner • Multi-Toko &gt;100 Cabang
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Quick Demo Access - Recommended for Fast Testing */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Pilih Peran Akses (Role-Based Access)
          </div>

          <div className="space-y-3">
            {/* Admin Role Button */}
            <button
              id="btn-login-admin"
              type="button"
              disabled={isLoading}
              onClick={() => loginAs('admin')}
              className="w-full text-left p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-900/40 hover:border-indigo-400 transition-all flex items-start gap-3.5 group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-indigo-200">Administrator Utama</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Akses Penuh
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Multi-toko (&gt;100 cabang), analitik real-time, audit log lengkap, impor/ekspor massal, dan pengaturan sistem.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-300 self-center shrink-0 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Staff / Kasir Role Button */}
            <button
              id="btn-login-staff"
              type="button"
              disabled={isLoading}
              onClick={() => loginAs('staff')}
              className="w-full text-left p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-900/30 hover:border-emerald-400 transition-all flex items-start gap-3.5 group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <ScanBarcode className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-emerald-200">Staff Toko / Kasir</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Akses Operasional
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Pemindaian barcode, catat stok masuk &amp; keluar toko cabang, peringatan stok minimum lokal.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-300 self-center shrink-0 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Quick Click for Registered Users */}
          {registeredUsers.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-700/60">
              <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                <span>Akun Terdaftar di Sistem ({registeredUsers.length}):</span>
                <span className="text-[10px] text-indigo-400">Klik untuk masuk langsung</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {registeredUsers.map((u) => (
                  <button
                    key={u.id || u.uid}
                    type="button"
                    onClick={() => switchUser(u)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-700 border border-slate-700 text-left text-xs transition-all flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white group"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${u.role === 'admin' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                    <span className="font-medium truncate max-w-[130px]">{u.name}</span>
                    <span className="text-[9px] text-slate-500 group-hover:text-slate-400 uppercase">({u.role})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-800 px-3 text-slate-400 font-medium">atau masuk dengan kredensial</span>
          </div>
        </div>

        {/* Standard Email Input Form */}
        <form onSubmit={handleCustomLogin} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Alamat Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="nama@perusahaan.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Kata Sandi</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            Masuk ke Sistem
          </button>

          {/* Google Sign In option */}
          <button
            id="btn-google-login"
            type="button"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full py-2 px-4 bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600/60 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Masuk dengan Google (Firebase Auth)
          </button>
        </form>
      </div>

      {/* System Features Indicator */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>PostgreSQL RDBMS Aktif</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-indigo-400" />
          <span>105 Cabang Terintegrasi</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <ScanBarcode className="w-3.5 h-3.5 text-amber-400" />
          <span>Pemindai Barcode Kamera</span>
        </div>
      </div>
    </div>
  );
};
