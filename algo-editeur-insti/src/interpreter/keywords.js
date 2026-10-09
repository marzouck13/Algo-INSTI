// SOURCE UNIQUE DE VÉRITÉ pour les mots-clés du pseudo-code.

function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalize(s) {
  return stripAccents(s).replace(/[\u2018\u2019]/g, "'").toLowerCase();
}

function normalizeStrict(s) {
  return s.replace(/[\u2018\u2019]/g, "'").toLowerCase();
}

export const KEYWORDS_BY_CATEGORY = {
  structure: ['Algorithme', 'Variables', 'Début', 'Fin'],
  subprogram: ['Fonction', 'Procédure', 'Retourner'],
  condition: ['Si', 'Alors', 'Sinon', 'FinSi'],
  boucle: [
    'TantQue', 'Faire', 'FinTantQue',
    'Pour', 'de', 'à', 'FinPour',
    'Répéter', "Jusqu'à",
  ],
  logique: ['et', 'ou', 'non'],
  operateur: ['div', 'mod'],
};

export const BOOLEANS = ['vrai', 'faux'];

export const KEYWORDS = Object.values(KEYWORDS_BY_CATEGORY).flat();

export const BUILTINS = ['Ecrire', 'Lire'];

export const TYPES = [
  'entier', 'réel', 'booléen', 'caractère', 'chaine', 'tableau',
];

export const OPERATORS_TWO = ['..', '<-', ':=', '!=', '<=', '>='];
export const OPERATORS_ONE = [
  '←', '+', '-', '*', '/',
  '=', '≠', '<', '>', '≤', '≥',
];
export const PUNCTUATION = ['(', ')', '[', ']', ',', ':'];

function buildIndex(words) {
  const strict = new Map();
  const loose = new Map();
  const looseCounts = new Map();

  for (const w of words) {
    const l = normalize(w);
    looseCounts.set(l, (looseCounts.get(l) ?? 0) + 1);
  }

  for (const w of words) {
    strict.set(normalizeStrict(w), w);
    const l = normalize(w);
    if (looseCounts.get(l) === 1) {
      loose.set(l, w);
    }
  }

  return { strict, loose };
}

function lookup(index, raw) {
  const strictKey = normalizeStrict(raw);
  if (index.strict.has(strictKey)) return index.strict.get(strictKey);
  if (raw.length < 2) return null;
  const looseKey = normalize(raw);
  if (index.loose.has(looseKey)) return index.loose.get(looseKey);
  return null;
}

const kwIndex = buildIndex(KEYWORDS);
const builtinIndex = buildIndex(BUILTINS);
const typeIndex = buildIndex(TYPES);
const boolIndex = buildIndex(BOOLEANS);

export function isKeyword(raw) { return lookup(kwIndex, raw) !== null; }
export function isBuiltin(raw) { return lookup(builtinIndex, raw) !== null; }
export function isType(raw) { return lookup(typeIndex, raw) !== null; }
export function isBoolean(raw) { return lookup(boolIndex, raw) !== null; }

export function canonicalKeyword(raw) { return lookup(kwIndex, raw); }
export function canonicalBuiltin(raw) { return lookup(builtinIndex, raw); }
export function canonicalType(raw) { return lookup(typeIndex, raw); }
export function canonicalBoolean(raw) { return lookup(boolIndex, raw); }