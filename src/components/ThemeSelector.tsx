import React, { useState } from 'react';
import { useTheme, THEMES, ThemeColor } from '../context/ThemeContext.tsx';
import { Palette, Sun, Moon, Check, Sparkles } from 'lucide-react';

interface ThemeSelectorProps {
  variant?: 'compact' | 'expanded';
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ variant = 'compact' }) => {
  const { themeColor, setThemeColor, mode, toggleMode, isDark, primaryText } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themeList = Object.values(THEMES);

  if (variant === 'expanded') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-500" />
              <span>Palet Warna & Gaya Visual</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih identitas warna aplikasi sesuai preferensi kenyamanan visual Anda
            </p>
          </div>

          {/* Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Mode Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-500" />
                <span>Mode Gelap</span>
              </>
            )}
          </button>
        </div>

        {/* Theme Swatch Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {themeList.map((t) => {
            const isSelected = themeColor === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeColor(t.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? isDark
                      ? 'bg-slate-800 border-slate-500 shadow-md ring-2 ring-offset-2 ring-offset-slate-900 ring-slate-400'
                      : 'bg-white border-slate-400 shadow-md ring-2 ring-offset-2 ring-slate-400'
                    : isDark
                    ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: t.primaryHex }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300">
                    {t.badge}
                  </span>
                </div>
                <div>
                  <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {t.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Compact variant for Navbar
  return (
    <div className="relative flex items-center gap-1.5">
      {/* Light / Dark Mode Quick Switch */}
      <button
        id="btn-toggle-theme-mode"
        type="button"
        onClick={toggleMode}
        className={`p-2 rounded-xl border transition-all cursor-pointer ${
          isDark
            ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/80 text-amber-400'
            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
        }`}
        title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Palette Dropdown Switcher */}
      <div className="relative">
        <button
          id="btn-theme-palette-dropdown"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/80 text-slate-200'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
          }`}
          title="Pilih Warna Tema"
        >
          <div
            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
            style={{ backgroundColor: THEMES[themeColor].primaryHex }}
          />
          <span className="hidden sm:inline text-xs font-medium">Tema Warna</span>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)} />
            <div
              className={`absolute right-0 mt-2 w-64 rounded-2xl border p-3 z-50 shadow-2xl backdrop-blur-md ${
                isDark
                  ? 'bg-slate-900/95 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/40">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pilihan Warna Tampilan</span>
                </span>
                <span className="text-[10px] text-slate-400">5 Pilihan</span>
              </div>

              <div className="space-y-1.5">
                {themeList.map((t) => {
                  const isSelected = themeColor === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setThemeColor(t.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? isDark
                            ? 'bg-slate-800 font-bold text-white'
                            : 'bg-slate-100 font-bold text-slate-900'
                          : isDark
                          ? 'hover:bg-slate-800/60 text-slate-300'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: t.primaryHex }}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span>{t.name}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">{t.badge}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Mode Toggle inside Dropdown */}
              <div className="pt-2 mt-2 border-t border-slate-700/40 flex items-center justify-between">
                <span className="text-xs text-slate-400">Mode Tampilan</span>
                <button
                  type="button"
                  onClick={toggleMode}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-amber-300'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  {isDark ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mode Terang</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Mode Gelap</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
