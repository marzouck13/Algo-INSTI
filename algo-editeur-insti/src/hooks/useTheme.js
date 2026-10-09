// Gestion du thème clair/sombre, persisté dans localStorage.

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'algo-editeur-insti:theme';
const DEFAULT_THEME = 'light';

function readInitial() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

export function useTheme() {
  const [theme, setTheme] = useState(readInitial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  return { theme, setTheme, toggle };
}