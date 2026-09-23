import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { NotificationItem } from '../types.ts';
import { playAlertBeep } from '../lib/sound.ts';
import {
  X,
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  Store as StoreIcon,
  RefreshCw,
  Volume2,
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationsUpdated?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNotificationsUpdated,
}) => {
  const { user, selectedStore } = useAuth();
  const { isDark, primaryText } = useTheme();
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }
      const storeParam = selectedStore ? `&storeId=${selectedStore.id}` : '';
      const res = await fetch(`/api/notifications?limit=50${storeParam}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotificationsList(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, selectedStore]);

  const markAllAsRead = async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers,
        body: JSON.stringify({ storeId: selectedStore?.id }),
      });
      setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onNotificationsUpdated?.();
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  if (!isOpen) return null;

  const displayList = filterUnreadOnly
    ? notificationsList.filter((n) => !n.isRead)
    : notificationsList;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="notifications-drawer"
        className={`border-l w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 transition-colors ${
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        {/* Drawer Header */}
        <div className={`p-4 border-b flex items-center justify-between transition-colors ${
          isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Notifikasi Stok Minimum</h2>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Peringatan Real-time PostgreSQL</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => playAlertBeep()}
              title="Uji Bunyi Alarm Bip"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-amber-600 hover:bg-slate-100'
              }`}
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className={`p-3 border-b flex items-center justify-between text-xs transition-colors ${
          isDark ? 'border-slate-850 bg-slate-900/60' : 'border-slate-200 bg-slate-50/70'
        }`}>
          <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <input
              type="checkbox"
              checked={filterUnreadOnly}
              onChange={(e) => setFilterUnreadOnly(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-[11px]">Hanya yang Belum Dibaca</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className={`text-[11px] ${primaryText} font-semibold flex items-center gap-1 cursor-pointer hover:underline`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tandai Semua Dibaca</span>
            </button>
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className={`p-1 rounded cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className={`flex-1 overflow-y-auto p-3 space-y-2.5 divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
          {displayList.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <CheckCheck className="w-10 h-10 mx-auto text-emerald-500/60" />
              <div className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Semua Stok Aman</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Tidak ada barang yang mencapai batas stok minimum saat ini.
              </p>
            </div>
          ) : (
            displayList.map((item) => {
              const isCritical = item.type === 'OUT_OF_STOCK';
              const isWarning = item.type === 'LOW_STOCK';

              return (
                <div
                  key={item.id}
                  className={`pt-2.5 p-2.5 rounded-xl border transition-all ${
                    !item.isRead
                      ? isCritical
                        ? isDark ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50 border-rose-200'
                        : isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                      : isDark ? 'bg-slate-800/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-500'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'bg-indigo-500/20 text-indigo-500'
                      }`}
                    >
                      {isCritical ? (
                        <AlertOctagon className="w-4 h-4" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold truncate ${
                            !item.isRead
                              ? isDark ? 'text-white' : 'text-slate-900'
                              : isDark ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          {item.title}
                        </span>
                        {!item.isRead && (
                          <span className={`w-2 h-2 rounded-full ${primaryText.replace('text-', 'bg-')} shrink-0`} />
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.message}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                        <span className="flex items-center gap-1">
                          <StoreIcon className="w-3 h-3 text-slate-400" />
                          <span>{item.storeName || 'Semua Cabang'}</span>
                        </span>
                        <span>{new Date(item.createdAt).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className={`p-3 border-t text-center transition-colors ${
          isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'
        }`}>
          <p className="text-[11px] text-slate-400">
            Sistem otomatis memeriksa stok minimum setiap mutasi dan memicu peringatan seketika.
          </p>
        </div>
      </div>
    </div>
  );
};
