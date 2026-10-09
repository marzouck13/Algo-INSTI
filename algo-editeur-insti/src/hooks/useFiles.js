// Gestion des fichiers : liste, fichier courant (code + meta), CRUD, import/export.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listFiles,
  createFile,
  updateFile,
  renameFile as dbRename,
  duplicateFile as dbDuplicate,
  deleteFile as dbDelete,
  getFile,
  countFiles,
} from '../storage/db.js';
import { parse as parsePseudo, serialize } from '../storage/pseudo-file.js';

const EMPTY_META = { title: 'Sans titre', author: '', date: todayISO(), grammar: '1.0' };

export function useFiles() {
  const [files, setFiles] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [currentCode, setCurrentCode] = useState('');
  const [currentMeta, setCurrentMeta] = useState({});
  const [loading, setLoading] = useState(true);

  const currentIdRef = useRef(null);
  useEffect(() => { currentIdRef.current = currentId; }, [currentId]);

  const refresh = useCallback(async () => {
    const list = await listFiles();
    setFiles(list);
    return list;
  }, []);

  // --- Initialisation : créer le fichier exemple au premier lancement ------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const count = await countFiles();
      if (cancelled) return;
      if (count === 0) {
        const id = await createFile({
          name: 'Maximum',
          code: SAMPLE_CODE,
          meta: { title: 'Maximum', author: '', date: todayISO(), grammar: '1.0' },
        });
        if (cancelled) return;
        await refresh();
        setCurrentId(id);
      } else {
        const list = await refresh();
        if (cancelled) return;
        if (list.length > 0) setCurrentId(list[0].id);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  // --- Charger le fichier courant quand currentId change -------------------
  // Les setState sont après un await : pas de cascading render synchrone.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (currentId == null) return;
      const data = await getFile(currentId);
      if (cancelled || !data) return;
      setCurrentCode(data.code ?? '');
      setCurrentMeta(data.meta ?? {});
    })();
    return () => { cancelled = true; };
  }, [currentId]);

  // --- Ouvre un fichier (l'effect ci-dessus chargera le contenu) ----------
  const openFile = useCallback((id) => {
    setCurrentId(id);
  }, []);

  // --- Crée un nouveau fichier vide et l'ouvre ----------------------------
  const newFile = useCallback(async () => {
    const id = await createFile({
      name: 'Sans titre',
      code: '',
      meta: { ...EMPTY_META, date: todayISO() },
    });
    await refresh();
    setCurrentId(id);
    return id;
  }, [refresh]);

  // --- Sauvegarde le contenu du fichier courant ---------------------------
  const saveCurrent = useCallback(async ({ code, meta }) => {
    const id = currentIdRef.current;
    if (id == null) return;
    await updateFile(id, { code, meta });
    await refresh();
  }, [refresh]);

  // --- Renommer -----------------------------------------------------------
  const rename = useCallback(async (id, newName) => {
    await dbRename(id, newName);
    await refresh();
    if (id === currentIdRef.current) {
      setCurrentMeta((m) => ({ ...m, title: newName }));
    }
  }, [refresh]);

  // --- Dupliquer ----------------------------------------------------------
  const duplicate = useCallback(async (id) => {
    const newId = await dbDuplicate(id);
    await refresh();
    return newId;
  }, [refresh]);

  // --- Supprimer (crée un nouveau fichier si plus rien) -------------------
  const remove = useCallback(async (id) => {
    await dbDelete(id);
    const list = await refresh();
    if (id !== currentIdRef.current) return;
    if (list.length > 0) {
      setCurrentId(list[0].id);
    } else {
      const newId = await createFile({
        name: 'Sans titre',
        code: '',
        meta: { ...EMPTY_META, date: todayISO() },
      });
      await refresh();
      setCurrentId(newId);
    }
  }, [refresh]);

  // --- Import -------------------------------------------------------------
  const importFromText = useCallback(async (text, suggestedName) => {
    const { meta, code } = parsePseudo(text);
    const name = meta.title || suggestedName || 'Importé';
    const id = await createFile({ name, code, meta });
    await refresh();
    setCurrentId(id);
    return id;
  }, [refresh]);

  // --- Export -------------------------------------------------------------
  const exportCurrent = useCallback(async () => {
    const id = currentIdRef.current;
    if (id == null) return null;
    const file = await getFile(id);
    if (!file) return null;
    return {
      name: file.name,
      text: serialize(file.code, { ...file.meta, title: file.name }),
    };
  }, []);

  return {
    loading,
    files,
    currentId,
    currentCode,
    currentMeta,
    setCurrentCode,
    setCurrentMeta,
    openFile,
    newFile,
    saveCurrent,
    rename,
    duplicate,
    remove,
    importFromText,
    exportCurrent,
    refresh,
  };
}

// --- Constantes ------------------------------------------------------------

const SAMPLE_CODE = `Algorithme Maximum
Variables
    a, b, max : entier
Début
    Ecrire("Entrez deux nombres")
    Lire(a, b)
    Si a > b Alors
        max <- a
    Sinon
        max <- b
    FinSi
    Ecrire("Le maximum est ", max)
Fin
`;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}