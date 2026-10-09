// Sauvegarde automatique du code courant dans IndexedDB.
// Debounce 800 ms après la dernière frappe.

import { useEffect, useRef } from 'react';

export function useAutoSave(code, meta, { enabled, onSave, delay = 800 }) {
  const timerRef = useRef(null);
  const lastSavedRef = useRef(null);
  const onSaveRef = useRef(onSave);
  const metaRef = useRef(meta);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);

  useEffect(() => {
    if (!enabled) return;
    if (lastSavedRef.current === null) {
      // Première valeur : mémoriser sans sauvegarder.
      lastSavedRef.current = code;
      return;
    }
    if (lastSavedRef.current === code) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await onSaveRef.current({ code, meta: metaRef.current });
        lastSavedRef.current = code;
      } catch (e) {
        console.error('Échec de la sauvegarde auto :', e);
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [code, enabled, delay]);

  // Forcer la sauvegarde immédiate (utile avant un changement de fichier).
  const flush = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (lastSavedRef.current === code) return;
    await onSaveRef.current({ code, meta: metaRef.current });
    lastSavedRef.current = code;
  };

  return { flush };
}