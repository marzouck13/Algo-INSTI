// Sérialisation / désérialisation du format .pseudo
//
// Format :
//   ---
//   title: Maximum
//   author: Élève
//   date: 2026-10-08
//   grammar: 1.0
//   ---
//
//   Algorithme Maximum
//   ...

export const GRAMMAR_VERSION = '1.0';

const HEADER_SEP = '---';

/**
 * Construit la chaîne complète d'un fichier .pseudo.
 * @param {string} code
 * @param {object} [meta]
 * @returns {string}
 */
export function serialize(code, meta = {}) {
  const safeMeta = {
    title: meta.title ?? 'Sans titre',
    author: meta.author ?? '',
    date: meta.date ?? new Date().toISOString().slice(0, 10),
    grammar: meta.grammar ?? GRAMMAR_VERSION,
  };

  const header = [
    HEADER_SEP,
    `title: ${safeMeta.title}`,
    `author: ${safeMeta.author}`,
    `date: ${safeMeta.date}`,
    `grammar: ${safeMeta.grammar}`,
    HEADER_SEP,
    '',
  ].join('\n');

  return header + code;
}

/**
 * Analyse une chaîne .pseudo et retourne { meta, code }.
 * Un fichier sans en-tête est accepté : meta = {}, code = source intégral.
 * @param {string} source
 * @returns {{ meta: object, code: string }}
 */
export function parse(source) {
  const text = String(source ?? '');

  // Doit commencer par "---\n" (tolérance sur les fins de ligne).
  if (!text.startsWith(HEADER_SEP + '\n') && !text.startsWith(HEADER_SEP + '\r\n')) {
    return { meta: {}, code: text };
  }

  // Cherche la 2e occurrence de "---" en début de ligne.
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== HEADER_SEP) {
    return { meta: {}, code: text };
  }

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === HEADER_SEP) {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) {
    return { meta: {}, code: text };
  }

  const meta = {};
  for (let i = 1; i < endIdx; i++) {
    const line = lines[i];
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key) meta[key] = val;
  }

  // Le code commence après l'en-tête et une ligne vide éventuelle.
  const codeLines = lines.slice(endIdx + 1);
  if (codeLines[0] === '') codeLines.shift();
  const code = codeLines.join('\n');

  return { meta, code };
}

/** Détecte si un fichier a une version de grammaire connue. */
export function isGrammarCompatible(meta) {
  if (!meta || !meta.grammar) return true;
  return meta.grammar === GRAMMAR_VERSION;
}