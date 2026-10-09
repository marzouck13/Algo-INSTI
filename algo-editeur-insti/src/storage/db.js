// Couche de persistance (IndexedDB via Dexie).
// Table `files` : { id, name, code, meta, createdAt, updatedAt }

import Dexie from 'dexie';

export const db = new Dexie('algo-editeur-insti');

db.version(1).stores({
  // Index sur name et updatedAt pour trier / chercher plus tard.
  files: '++id, name, updatedAt, createdAt',
});

// --- CRUD ------------------------------------------------------------------

/** Liste tous les fichiers, triés du plus récent au plus ancien. */
export async function listFiles() {
  const all = await db.files.toArray();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Récupère un fichier par id. */
export async function getFile(id) {
  return db.files.get(id);
}

/**
 * Crée un nouveau fichier. Si `name` existe déjà, suffixe " 2", " 3"…
 * @returns {Promise<number>} id créé
 */
export async function createFile({ name, code = '', meta = {} } = {}) {
  const finalName = await uniqueName(name || 'Sans titre');
  const now = Date.now();
  const id = await db.files.add({
    name: finalName,
    code,
    meta,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/** Met à jour le contenu d'un fichier (crée si l'id n'existe pas ? non). */
export async function updateFile(id, patch) {
  const patchWithTime = { ...patch, updatedAt: Date.now() };
  return db.files.update(id, patchWithTime);
}

/** Renomme un fichier (avec gestion d'unicité). */
export async function renameFile(id, newName) {
  const finalName = await uniqueName(newName, id);
  return db.files.update(id, { name: finalName, updatedAt: Date.now() });
}

/** Duplique un fichier. */
export async function duplicateFile(id) {
  const original = await db.files.get(id);
  if (!original) throw new Error(`Fichier introuvable : ${id}`);
  const newName = await uniqueName(original.name);
  const now = Date.now();
  return db.files.add({
    name: newName,
    code: original.code,
    meta: { ...original.meta },
    createdAt: now,
    updatedAt: now,
  });
}

/** Supprime un fichier. */
export async function deleteFile(id) {
  return db.files.delete(id);
}

/** Compte les fichiers. */
export async function countFiles() {
  return db.files.count();
}

// --- Helpers ---------------------------------------------------------------

async function uniqueName(desired, excludeId = null) {
  const base = (desired || 'Sans titre').trim() || 'Sans titre';
  const existing = await db.files.toArray();
  const taken = new Set(
    existing
      .filter((f) => f.id !== excludeId)
      .map((f) => f.name)
  );
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}