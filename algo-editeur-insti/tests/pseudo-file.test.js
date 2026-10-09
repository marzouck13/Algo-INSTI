import { describe, it, expect } from 'vitest';
import { serialize, parse, isGrammarCompatible, GRAMMAR_VERSION } from '../src/storage/pseudo-file.js';

describe('pseudo-file — serialize', () => {
  it('génère un en-tête complet', () => {
    const s = serialize('Algorithme X\nDébut\nFin\n', {
      title: 'Test',
      author: 'Élève',
      date: '2026-10-08',
      grammar: '1.0',
    });
    expect(s).toMatch(/^---\n/);
    expect(s).toMatch(/title: Test/);
    expect(s).toMatch(/author: Élève/);
    expect(s).toMatch(/date: 2026-10-08/);
    expect(s).toMatch(/grammar: 1\.0/);
    expect(s).toMatch(/Algorithme X/);
  });

  it('utilise les valeurs par défaut si meta absent', () => {
    const s = serialize('x');
    expect(s).toMatch(/title: Sans titre/);
    expect(s).toMatch(new RegExp(`grammar: ${GRAMMAR_VERSION.replace('.', '\\.')}`));
  });
});

describe('pseudo-file — parse', () => {
  it('extrait meta et code', () => {
    const src = `---
title: Maximum
author: Élève
date: 2026-10-08
grammar: 1.0
---

Algorithme Maximum
Fin
`;
    const { meta, code } = parse(src);
    expect(meta.title).toBe('Maximum');
    expect(meta.author).toBe('Élève');
    expect(meta.grammar).toBe('1.0');
    expect(code).toMatch(/^Algorithme Maximum/);
  });

  it('accepte un fichier sans en-tête', () => {
    const src = 'Algorithme X\nDébut\nFin\n';
    const { meta, code } = parse(src);
    expect(meta).toEqual({});
    expect(code).toBe(src);
  });

  it('ignore les lignes sans deux-points dans l’en-tête', () => {
    const src = `---
title: X
ligne invalide sans colon
author: Y
---
code
`;
    const { meta } = parse(src);
    expect(meta.title).toBe('X');
    expect(meta.author).toBe('Y');
  });

  it('round-trip : serialize → parse', () => {
    const code = 'Algorithme X\nDébut\nFin\n';
    const meta = { title: 'Test', author: 'A', date: '2026-01-01', grammar: '1.0' };
    const round = parse(serialize(code, meta));
    expect(round.code).toBe(code);
    expect(round.meta.title).toBe('Test');
    expect(round.meta.grammar).toBe('1.0');
  });
});

describe('pseudo-file — isGrammarCompatible', () => {
  it('accepte la même version', () => {
    expect(isGrammarCompatible({ grammar: '1.0' })).toBe(true);
  });
  it('accepte un meta sans grammar', () => {
    expect(isGrammarCompatible({})).toBe(true);
  });
  it('refuse une version différente', () => {
    expect(isGrammarCompatible({ grammar: '0.9' })).toBe(false);
  });
});