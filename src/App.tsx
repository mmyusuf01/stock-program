import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.tsx';
import { LoginView } from './components/LoginView.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { CatalogView } from './components/CatalogView.tsx';
import { ActivityLogsView } from './components/ActivityLogsView.tsx';
import { DailyReportView } from './components/DailyReportView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { UsersManagementView } from './components/UsersManagementView.tsx';
import { BarcodeScannerModal } from './components/BarcodeScannerModal.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';
import { OfflineBanner } from './components/OfflineBanner.tsx';

function MainApp() {
  const { user, selectedStore } = useAuth();
  const { pageBg, isDark, primaryGlow } = useTheme();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'catalog' | 'logs' | 'report' | 'settings' | 'users'>('dashboard');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll notifications count
  const fetchUnreadCount = async () => {
    try {
      const headers: Record<string, string> = {};
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }
      const storeParam = selectedStore ? `?storeId=${selectedStore.id}&unreadOnly=true` : '?unreadOnly=true';
      const res = await fetch(`/api/notifications${storeParam}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.totalUnread || (data.notifications ? data.notifications.length : 0));
      }
    } catch {
      // offline silent
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 20000);
      return () => clearInterval(interval);
    }
  }, [user, selectedStore]);

  // If not logged in, enforce the initial Login Page required by user prompt
  if (!user) {
    return <LoginView />;
  }

  return (
    <div className={`min-h-screen ${pageBg} flex flex-col font-sans transition-colors duration-200 selection:bg-emerald-500 selection:text-white`}>
      {/* Top Application Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab: any) => setActiveTab(tab)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadCount={unreadCount}
      />

      {/* Offline Status & Sync Alert Banner */}
      <OfflineBanner />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-5">
        {activeTab === 'dashboard' && (
          <DashboardView
            onOpenScanner={() => setIsScannerOpen(true)}
            onNavigateTab={(t: any) => setActiveTab(t)}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryView onOpenScanner={() => setIsScannerOpen(true)} />
        )}
        {activeTab === 'catalog' && <CatalogView />}
        {activeTab === 'logs' && <ActivityLogsView />}
        {activeTab === 'report' && <DailyReportView />}
        {activeTab === 'users' && <UsersManagementView />}
        {activeTab === 'settings' && <SettingsView onNavigateTab={(t: any) => setActiveTab(t)} />}
      </main>

      {/* Barcode Scanner Modal Component */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onStockUpdated={() => {
          fetchUnreadCount();
        }}
      />

      {/* Notifications Drawer Component */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNotificationsUpdated={() => {
          fetchUnreadCount();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
