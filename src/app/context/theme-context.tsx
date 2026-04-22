import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const STORAGE_KEY = 'phulpur24_theme_mode';
const modes: ThemeMode[] = ['system', 'light', 'dark'];
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

function syncDocumentTheme(mode: ThemeMode, resolvedTheme: ResolvedTheme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.theme = resolvedTheme;
  root.dataset.themeMode = mode;
  root.style.colorScheme = resolvedTheme;

  let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColor) {
    themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    document.head.appendChild(themeColor);
  }
  themeColor.content = resolvedTheme === 'dark' ? '#0B1220' : '#194890';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initialMode = getStoredMode();
  const [mode, setModeState] = useState<ThemeMode>(() => initialMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(initialMode));

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // Browsers can block storage in private contexts; the visible theme should still update.
    }
  }, []);

  const cycleMode = useCallback(() => {
    const currentIndex = modes.indexOf(mode);
    setMode(modes[(currentIndex + 1) % modes.length]);
  }, [mode, setMode]);

  useEffect(() => {
    const apply = () => {
      const nextResolvedTheme = resolveTheme(mode);
      setResolvedTheme(nextResolvedTheme);
      syncDocumentTheme(mode, nextResolvedTheme);
    };

    apply();

    if (mode !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
      cycleMode,
    }),
    [cycleMode, mode, resolvedTheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
