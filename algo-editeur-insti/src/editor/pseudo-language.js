// Langage CodeMirror pour le pseudo-code Algo Éditeur INSTI.
// - Coloration via StreamLanguage (keywords.js = source unique de vérité)
// - Auto-complétion basée sur la même liste
// - Indentation à 4 espaces, réindentée sur les mots-clés ouvrants/fermants

import { StreamLanguage, indentService, indentUnit } from '@codemirror/language';
import { Tag } from '@lezer/highlight';
import {
  isKeyword, isBuiltin, isType, isBoolean, canonicalKeyword,
  KEYWORDS, BUILTINS, TYPES, BOOLEANS,
  OPERATORS_TWO, OPERATORS_ONE, PUNCTUATION,
} from '../interpreter/keywords.js';

// --- Tags custom pour la coloration ----------------------------------------

export const builtinTag = Tag.define();
export const booleanTag = Tag.define();

// Mots-clés "de contrôle" — colorés différemment (rose pâle).
// Inclut les ouvertures de blocs, les fermetures et Retourner.
const CONTROL_KEYWORDS = new Set([
  'Si', 'Alors', 'Sinon', 'FinSi',
  'TantQue', 'Faire', 'FinTantQue',
  'Pour', 'FinPour',
  'Répéter', "Jusqu'à",
  'Retourner',
]);

// --- Tokenizer stream ------------------------------------------------------

function startState() {
  return { inBlockComment: false };
}

function token(stream, state) {
  // Commentaire bloc en cours { ... }
  if (state.inBlockComment) {
    while (!stream.eol()) {
      if (stream.match('}')) {
        state.inBlockComment = false;
        break;
      }
      stream.next();
    }
    return 'comment';
  }

  // Commentaire ligne //
  if (stream.match('//')) {
    stream.skipToEnd();
    return 'comment';
  }

  // Ouverture commentaire bloc {
  if (stream.peek() === '{') {
    stream.next();
    state.inBlockComment = true;
    return 'comment';
  }

  // Espaces
  if (stream.eatSpace()) return null;

  const ch = stream.peek();

  // Chaîne "…"
  if (ch === '"') {
    stream.next();
    let escaped = false;
    while (!stream.eol()) {
      const c = stream.next();
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === '"') break;
    }
    return 'string';
  }

  // Nombre (entier ou réel, . ou , comme séparateur décimal)
  if (ch >= '0' && ch <= '9') {
    stream.match(/^[0-9]+(?:[.,][0-9]+)?/);
    return 'number';
  }

  // Identifiant ou mot réservé
  if (/[\p{L}_]/u.test(ch)) {
    let word = '';
    while (!stream.eol()) {
      const c = stream.peek();
      if (/[\p{L}\p{N}_'’]/u.test(c)) {
        word += c;
        stream.next();
      } else break;
    }
    if (isKeyword(word)) {
      const canonical = canonicalKeyword(word);
      if (CONTROL_KEYWORDS.has(canonical)) return 'controlKeyword';
      return 'keyword';
    }
    if (isBuiltin(word)) return 'builtin';
    if (isType(word)) return 'typeName';
    if (isBoolean(word)) return 'boolean';
    return 'variableName';
  }

  // Opérateur sur 2 caractères
  const two = stream.string.slice(stream.pos, stream.pos + 2);
  if (OPERATORS_TWO.includes(two)) {
    stream.pos += 2;
    return 'operator';
  }

  // Opérateur 1 caractère
  if (OPERATORS_ONE.includes(ch)) {
    stream.next();
    return 'operator';
  }

  // Ponctuation
  if (PUNCTUATION.includes(ch)) {
    stream.next();
    return 'punctuation';
  }

  stream.next();
  return null;
}

export const pseudoLanguage = StreamLanguage.define(
  {
    name: 'pseudo',
    startState,
    token,
  },
  {
    tokenTable: {
      builtin: builtinTag,
      boolean: booleanTag,
    },
    languageData: {
      commentTokens: { line: '//', block: { open: '{', close: '}' } },
      indentOnInput: /^\s*(Fin|FinSi|FinPour|FinTantQue|Sinon)$/i,
    },
  }
);

// --- Indentation -----------------------------------------------------------

const INDENT_SIZE = 4;

function leadingSpaces(text) {
  const m = text.match(/^ */);
  return m ? m[0].length : 0;
}

export const pseudoIndentUnit = indentUnit.of(' '.repeat(INDENT_SIZE));

export const pseudoIndent = indentService.of((context, pos) => {
  const line = context.state.doc.lineAt(pos);
  if (line.number <= 1) return 0;

  const prevLine = context.state.doc.line(line.number - 1);
  const prevText = prevLine.text;
  const currentTrim = line.text.replace(/^\s+/, '');

  const prevIndent = leadingSpaces(prevText);
  const prevTrimEnd = prevText.replace(/\s+$/, '');

  // La ligne commence par un mot-clé fermant → désindenter d'un cran.
  if (/^(Fin\b|FinSi\b|FinPour\b|FinTantQue\b|Sinon\b)/i.test(currentTrim)) {
    return Math.max(0, prevIndent - INDENT_SIZE);
  }

  // La ligne précédente ouvre un bloc → indenter d'un cran.
  if (/(Début|Alors|Faire|Sinon)$/i.test(prevTrimEnd)) {
    return prevIndent + INDENT_SIZE;
  }

  // Sinon : aligner sur la ligne précédente.
  return prevIndent;
});

// --- Auto-complétion -------------------------------------------------------

const COMPLETION_ITEMS = [
  ...KEYWORDS.map((k) => ({ label: k, type: 'keyword' })),
  ...BUILTINS.map((k) => ({ label: k, type: 'function' })),
  ...TYPES.map((k) => ({ label: k, type: 'type' })),
  ...BOOLEANS.map((k) => ({ label: k, type: 'constant' })),
];

export function pseudoCompletions(context) {
  const word = context.matchBefore(/[\p{L}_][\p{L}\p{N}_'’]*/u);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: COMPLETION_ITEMS,
  };
}