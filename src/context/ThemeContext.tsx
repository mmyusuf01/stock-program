import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeColor = 'emerald' | 'ocean' | 'indigo' | 'amber' | 'rose';
export type ThemeMode = 'dark' | 'light';

export interface ThemeConfig {
  id: ThemeColor;
  name: string;
  badge: string;
  primaryHex: string;
  accentClass: string;
  gradient: string;
}

export const THEMES: Record<ThemeColor, ThemeConfig> = {
  emerald: {
    id: 'emerald',
    name: 'Hijau Zamrud',
    badge: 'Retail Fresh',
    primaryHex: '#10b981',
    accentClass: 'emerald',
    gradient: 'from-emerald-600 to-teal-700',
  },
  ocean: {
    id: 'ocean',
    name: 'Biru Samudra',
    badge: 'Modern Tech',
    primaryHex: '#0284c7',
    accentClass: 'sky',
    gradient: 'from-sky-600 to-blue-700',
  },
  indigo: {
    id: 'indigo',
    name: 'Ungu Indigo',
    badge: 'Royal Elegance',
    primaryHex: '#6366f1',
    accentClass: 'indigo',
    gradient: 'from-indigo-600 to-violet-700',
  },
  amber: {
    id: 'amber',
    name: 'Amber Surya',
    badge: 'Vibrant Warm',
    primaryHex: '#f59e0b',
    accentClass: 'amber',
    gradient: 'from-amber-500 to-orange-600',
  },
  rose: {
    id: 'rose',
    name: 'Merah Delima',
    badge: 'Bold Ruby',
    primaryHex: '#f43f5e',
    accentClass: 'rose',
    gradient: 'from-rose-600 to-pink-700',
  },
};

interface ThemeContextType {
  themeColor: ThemeColor;
  mode: ThemeMode;
  setThemeColor: (color: ThemeColor) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  // Dynamic Styling helpers
  primaryBg: string;
  primaryHoverBg: string;
  primaryText: string;
  primaryBorder: string;
  primaryLightBg: string;
  primaryRing: string;
  primaryGlow: string;
  // Surface helpers
  isDark: boolean;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  navBg: string;
  inputBg: string;
  subtextColor: string;
  headingColor: string;
  tableHover: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    try {
      const saved = localStorage.getItem('rdbms_theme_color');
      if (saved && (saved in THEMES)) return saved as ThemeColor;
    } catch {}
    return 'emerald'; // Default to fresh retail Emerald green
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('rdbms_theme_mode');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark'; // Default dark with rich accents
  });

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    try {
      localStorage.setItem('rdbms_theme_color', color);
    } catch {}
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem('rdbms_theme_mode', newMode);
    } catch {}
  };

  const toggleMode = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [mode]);

  // Derived style maps
  const colorMap: Record<ThemeColor, {
    bg: string;
    hoverBg: string;
    text: string;
    border: string;
    lightBg: string;
    ring: string;
    glow: string;
  }> = {
    emerald: {
      bg: 'bg-emerald-600',
      hoverBg: 'hover:bg-emerald-500',
      text: mode === 'dark' ? 'text-emerald-400' : 'text-emerald-600',
      border: mode === 'dark' ? 'border-emerald-500/30' : 'border-emerald-300',
      lightBg: mode === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50',
      ring: 'focus:ring-emerald-500',
      glow: 'shadow-emerald-600/25',
    },
    ocean: {
      bg: 'bg-sky-600',
      hoverBg: 'hover:bg-sky-500',
      text: mode === 'dark' ? 'text-sky-400' : 'text-sky-600',
      border: mode === 'dark' ? 'border-sky-500/30' : 'border-sky-300',
      lightBg: mode === 'dark' ? 'bg-sky-500/10' : 'bg-sky-50',
      ring: 'focus:ring-sky-500',
      glow: 'shadow-sky-600/25',
    },
    indigo: {
      bg: 'bg-indigo-600',
      hoverBg: 'hover:bg-indigo-500',
      text: mode === 'dark' ? 'text-indigo-400' : 'text-indigo-600',
      border: mode === 'dark' ? 'border-indigo-500/30' : 'border-indigo-300',
      lightBg: mode === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-50',
      ring: 'focus:ring-indigo-500',
      glow: 'shadow-indigo-600/25',
    },
    amber: {
      bg: 'bg-amber-500',
      hoverBg: 'hover:bg-amber-400',
      text: mode === 'dark' ? 'text-amber-400' : 'text-amber-600',
      border: mode === 'dark' ? 'border-amber-500/30' : 'border-amber-300',
      lightBg: mode === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50',
      ring: 'focus:ring-amber-500',
      glow: 'shadow-amber-500/25',
    },
    rose: {
      bg: 'bg-rose-600',
      hoverBg: 'hover:bg-rose-500',
      text: mode === 'dark' ? 'text-rose-400' : 'text-rose-600',
      border: mode === 'dark' ? 'border-rose-500/30' : 'border-rose-300',
      lightBg: mode === 'dark' ? 'bg-rose-500/10' : 'bg-rose-50',
      ring: 'focus:ring-rose-500',
      glow: 'shadow-rose-600/25',
    },
  };

  const isDark = mode === 'dark';
  const cur = colorMap[themeColor];

  const value: ThemeContextType = {
    themeColor,
    mode,
    setThemeColor,
    setMode,
    toggleMode,
    primaryBg: cur.bg,
    primaryHoverBg: cur.hoverBg,
    primaryText: cur.text,
    primaryBorder: cur.border,
    primaryLightBg: cur.lightBg,
    primaryRing: cur.ring,
    primaryGlow: cur.glow,
    isDark,
    pageBg: isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800',
    cardBg: isDark ? 'bg-slate-900/90' : 'bg-white shadow-sm',
    cardBorder: isDark ? 'border-slate-800' : 'border-slate-200/80',
    navBg: isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-sm',
    inputBg: isDark
      ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
    subtextColor: isDark ? 'text-slate-400' : 'text-slate-500',
    headingColor: isDark ? 'text-white' : 'text-slate-900',
    tableHover: isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100/70',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
