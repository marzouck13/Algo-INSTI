// Lexer : source -> tokens.
// Une seule passe, O(n). Pas de token NEWLINE (l'indentation est libre).

import { LexError } from './errors.js';
import {
  canonicalKeyword,
  canonicalBuiltin,
  canonicalType,
  canonicalBoolean,
  OPERATORS_TWO,
  OPERATORS_ONE,
  PUNCTUATION,
} from './keywords.js';

export const TT = {
  KEYWORD: 'KEYWORD',
  BUILTIN: 'BUILTIN',
  TYPE: 'TYPE',
  BOOL: 'BOOL',
  IDENT: 'IDENT',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  OP: 'OP',
  PUNCT: 'PUNCT',
  EOF: 'EOF',
};

/**
 * Transforme une source en tableau de tokens.
 * @param {string} source
 * @returns {Array<{type:string, value:any, line:number, column:number}>}
 * @throws {LexError}
 */
export function tokenize(source) {
  const tokens = [];
  const len = source.length;
  let pos = 0;
  let line = 1;
  let col = 1;

  function peek(offset = 0) { return source[pos + offset]; }

  function advance() {
    const ch = source[pos++];
    if (ch === '\n') { line++; col = 1; }
    else { col++; }
    return ch;
  }

  function push(type, value, l, c) {
    tokens.push({ type, value, line: l, column: c });
  }

  while (pos < len) {
    const ch = peek();
    const startLine = line;
    const startCol = col;

    // 1. Espaces et retours ligne : ignorés (pas de token NEWLINE)
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance();
      continue;
    }

    // 2. Commentaire ligne : // ... jusqu'à \n
    if (ch === '/' && peek(1) === '/') {
      while (pos < len && peek() !== '\n') advance();
      continue;
    }

    // 3. Commentaire bloc : { ... }
    if (ch === '{') {
      advance(); // consomme {
      while (pos < len && peek() !== '}') advance();
      if (pos >= len) {
        throw new LexError("Commentaire « { » non fermé.", startLine, startCol);
      }
      advance(); // consomme }
      continue;
    }

    // 4. Identifiant ou mot-clé
    if (isIdentStart(ch)) {
      let raw = '';
      while (pos < len && isIdentPart(peek())) raw += advance();

      const kw = canonicalKeyword(raw);
      if (kw !== null) { push(TT.KEYWORD, kw, startLine, startCol); continue; }

      const bi = canonicalBuiltin(raw);
      if (bi !== null) { push(TT.BUILTIN, bi, startLine, startCol); continue; }

      const ty = canonicalType(raw);
      if (ty !== null) { push(TT.TYPE, ty, startLine, startCol); continue; }

      const bo = canonicalBoolean(raw);
      if (bo !== null) { push(TT.BOOL, bo, startLine, startCol); continue; }

      push(TT.IDENT, raw, startLine, startCol);
      continue;
    }

    // 5. Nombre (entier ou réel ; séparateur décimal . ou , entre deux chiffres)
    if (isDigit(ch)) {
      let num = '';
      while (pos < len && isDigit(peek())) num += advance();

      let isReal = false;
      const sep = peek();
      if ((sep === '.' || sep === ',') && isDigit(peek(1))) {
        isReal = true;
        num += '.';
        advance(); // consomme le séparateur
        while (pos < len && isDigit(peek())) num += advance();
      }

      push(TT.NUMBER, { value: Number(num), isReal }, startLine, startCol);
      continue;
    }

    // 6. Chaîne "..." avec échappements
    if (ch === '"') {
      advance(); // ouvre
      let str = '';
      let closed = false;
      while (pos < len) {
        const c = peek();
        if (c === '\\') {
          advance();
          const esc = advance();
          if (esc === 'n') str += '\n';
          else if (esc === 't') str += '\t';
          else if (esc === '"') str += '"';
          else if (esc === '\\') str += '\\';
          else str += esc; // échappement inconnu : conservé tel quel
        } else if (c === '"') {
          advance();
          closed = true;
          break;
        } else if (c === '\n') {
          throw new LexError(
            'Chaîne non fermée avant la fin de la ligne.',
            startLine, startCol
          );
        } else {
          str += advance();
        }
      }
      if (!closed) {
        throw new LexError('Chaîne non fermée.', startLine, startCol);
      }
      push(TT.STRING, str, startLine, startCol);
      continue;
    }

    // 7. Opérateurs 2 caractères (avant les 1 caractère)
    const two = source.slice(pos, pos + 2);
    if (OPERATORS_TWO.includes(two)) {
      advance(); advance();
      push(TT.OP, two, startLine, startCol);
      continue;
    }

    // 8. Opérateurs 1 caractère
    if (OPERATORS_ONE.includes(ch)) {
      advance();
      push(TT.OP, ch, startLine, startCol);
      continue;
    }

    // 9. Ponctuation
    if (PUNCTUATION.includes(ch)) {
      advance();
      push(TT.PUNCT, ch, startLine, startCol);
      continue;
    }

    // 10. Caractère inconnu
    throw new LexError(`Caractère inconnu : « ${ch} ».`, startLine, startCol);
  }

  push(TT.EOF, null, line, col);
  return tokens;
}

// --- Helpers ----------------------------------------------------------------

function isIdentStart(ch) {
  return /[\p{L}_]/u.test(ch);
}

function isIdentPart(ch) {
  // \p{L} lettre unicode, \p{N} chiffre unicode, _ et apostrophes (' et ')
  return /[\p{L}\p{N}_'’]/u.test(ch);
}

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}