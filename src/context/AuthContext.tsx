import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Store } from '../types.ts';
import { offlineStorage } from '../lib/offlineStore.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  authToken: string | null;
  selectedStore: Store | null;
  allStores: Store[];
  isOnline: boolean;
  pendingSyncCount: number;
  isLoading: boolean;
  loginAs: (role: 'admin' | 'staff', email?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  switchUser: (targetUser: User) => void;
  logout: () => void;
  setSelectedStore: (store: Store) => void;
  refreshStores: () => Promise<void>;
  syncOfflineQueue: () => Promise<number>;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    // Check saved session in localStorage
    try {
      const saved = localStorage.getItem('rdbms_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [allStores, setAllStores] = useState<Store[]>(() => offlineStorage.getStores());
  const [selectedStore, setSelectedStoreState] = useState<Store | null>(() => {
    try {
      const saved = localStorage.getItem('rdbms_selected_store');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => offlineStorage.getQueue().length);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          setAuthToken(token);
        } catch (e) {
          console.error('Error getting Firebase token:', e);
        }
      } else {
        setAuthToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync offline queue
  const syncOfflineQueue = useCallback(async (): Promise<number> => {
    const queue = offlineStorage.getQueue();
    if (queue.length === 0 || !navigator.onLine) {
      setPendingSyncCount(queue.length);
      return 0;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }

      const res = await fetch('/api/sync/batch', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mutations: queue }),
      });

      if (res.ok) {
        const data = await res.json();
        offlineStorage.clearQueue();
        offlineStorage.setLastSync(new Date().toISOString());
        setPendingSyncCount(0);
        return data.syncedCount || queue.length;
      }
    } catch (e) {
      console.warn('Sync failed, will retry later:', e);
    }
    setPendingSyncCount(offlineStorage.getQueue().length);
    return 0;
  }, [user, authToken]);

  // Load stores from server or fallback to cache
  const refreshStores = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      if (user?.email) {
        headers['x-user-email'] = user.email;
        headers['x-user-role'] = user.role;
      }

      const res = await fetch('/api/stores?limit=250', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.stores && data.stores.length > 0) {
          setAllStores(data.stores);
          offlineStorage.setStores(data.stores);
          if (!selectedStore && data.stores.length > 0) {
            setSelectedStoreState(data.stores[0]);
            localStorage.setItem('rdbms_selected_store', JSON.stringify(data.stores[0]));
          }
        }
      }
    } catch {
      // offline fallback
      const cached = offlineStorage.getStores();
      if (cached.length > 0) {
        setAllStores(cached);
        if (!selectedStore) setSelectedStoreState(cached[0]);
      }
    }
  }, [user, authToken, selectedStore]);

  useEffect(() => {
    if (user) {
      refreshStores();
    }
  }, [user, refreshStores]);

  // Login handler
  const loginAs = async (role: 'admin' | 'staff', email?: string) => {
    setIsLoading(true);
    try {
      const targetEmail = email || (role === 'admin' ? 'admin@toko.com' : 'staff@toko.com');
      const targetName = role === 'admin' ? 'Administrator Utama' : 'Budi Santoso (Staff Toko)';

      const newUser: User = {
        uid: role === 'admin' ? 'usr-admin-001' : 'usr-staff-001',
        email: targetEmail,
        name: targetName,
        role,
        assignedStoreId: 1,
      };

      setUser(newUser);
      localStorage.setItem('rdbms_current_user', JSON.stringify(newUser));

      // Refresh stores
      await refreshStores();
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      setAuthToken(idToken);
      const email = result.user.email || 'user@example.com';
      const name = result.user.displayName || email.split('@')[0];
      const role = email.toLowerCase().includes('admin') ? 'admin' : 'staff';

      const newUser: User = {
        uid: result.user.uid,
        email,
        name,
        role,
        assignedStoreId: 1,
      };

      setUser(newUser);
      localStorage.setItem('rdbms_current_user', JSON.stringify(newUser));
      await refreshStores();
    } catch (error: any) {
      console.warn('Firebase signInWithPopup:', error);
      // If popup fails (e.g. iframe constraints), fallback to simulated admin login
      await loginAs('admin', 'admin@toko.com');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('rdbms_current_user');
    try {
      fbSignOut(auth);
    } catch {}
  };

  const switchUser = (targetUser: User) => {
    setUser(targetUser);
    localStorage.setItem('rdbms_current_user', JSON.stringify(targetUser));
    if (targetUser.assignedStoreId && allStores.length > 0) {
      const match = allStores.find((s) => s.id === targetUser.assignedStoreId);
      if (match) {
        setSelectedStoreState(match);
        localStorage.setItem('rdbms_selected_store', JSON.stringify(match));
      }
    }
  };

  const setSelectedStore = (store: Store) => {
    setSelectedStoreState(store);
    localStorage.setItem('rdbms_selected_store', JSON.stringify(store));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authToken,
        selectedStore,
        allStores,
        isOnline,
        pendingSyncCount,
        isLoading,
        loginAs,
        loginWithGoogle,
        switchUser,
        logout,
        setSelectedStore,
        refreshStores,
        syncOfflineQueue,
        isAdmin: user?.role === 'admin',
        isStaff: user?.role === 'staff',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
