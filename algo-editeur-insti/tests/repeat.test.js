import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/interpreter/lexer.js';
import { parse } from '../src/interpreter/parser.js';
import { check } from '../src/interpreter/checker.js';
import { run } from '../src/interpreter/pipeline.js';

function ast(source) { return parse(tokenize(source)); }
function semErrors(source) { return check(parse(tokenize(source))); }
async function out(source) {
  const r = await run(source);
  return { output: r.output, success: r.success, errors: r.errors };
}

describe('parser — Répéter', () => {
  it('parse une boucle Répéter simple', () => {
    const tree = ast(`Algorithme X
Début
    Répéter
        i ← i + 1
    Jusqu'à i >= 10
Fin`);
    const r = tree.body[0];
    expect(r.type).toBe('Repeat');
    expect(r.body).toHaveLength(1);
    expect(r.until).toMatchObject({ type: 'Binary', op: '>=' });
  });

  it("échoue si « Jusqu'à » manque", () => {
    expect(() =>
      ast('Algorithme X\nDébut\n    Répéter\n        i ← i + 1\nFin')
    ).toThrow(/Jusqu/);
  });

  it("le message pointe la bonne ligne", () => {
    try {
      ast('Algorithme X\nDébut\n    Répéter\n        i ← i + 1\nFin');
      throw new Error('devrait échouer');
    } catch (e) {
      expect(e.message).toMatch(/ligne 3/);
    }
  });

  it('parse un Répéter imbriqué dans un Si', () => {
    const tree = ast(`Algorithme X
Début
    Si vrai Alors
        Répéter
            i ← i + 1
        Jusqu'à i >= 10
    FinSi
Fin`);
    expect(tree.body[0].type).toBe('If');
    expect(tree.body[0].then[0].type).toBe('Repeat');
  });
});

describe('checker — Répéter', () => {
  it('refuse une condition non booléenne', () => {
    const errs = semErrors(`Algorithme X
Variables
    i : entier
Début
    Répéter
        i ← 0
    Jusqu'à i
Fin`);
    expect(errs.some((e) => /booléenne/.test(e.message))).toBe(true);
  });

  it('accepte une condition booléenne valide', () => {
    const errs = semErrors(`Algorithme X
Variables
    i : entier
Début
    Répéter
        i ← i + 1
    Jusqu'à i >= 10
Fin`);
    expect(errs).toEqual([]);
  });
});

describe('interpreter — Répéter', () => {
  it('exécute le corps au moins une fois', async () => {
    const r = await out(`Algorithme X
Variables
    i : entier
Début
    i ← 100
    Répéter
        Ecrire("passé")
    Jusqu'à i >= 10
Fin`);
    expect(r.success).toBe(true);
    expect(r.output).toEqual(['passé']);
  });

  it('boucle jusqu\'à condition vraie', async () => {
    const r = await out(`Algorithme X
Variables
    i, s : entier
Début
    i ← 0
    s ← 0
    Répéter
        i ← i + 1
        s ← s + i
    Jusqu'à i >= 5
    Ecrire(s)
Fin`);
    expect(r.output).toEqual(['15']);
  });

  it('s\'arrête dès que la condition devient vraie', async () => {
    const r = await out(`Algorithme X
Variables
    i : entier
Début
    i ← 0
    Répéter
        i ← i + 1
    Jusqu'à i = 3
    Ecrire(i)
Fin`);
    expect(r.output).toEqual(['3']);
  });

  it('coupe une boucle infinie', async () => {
    const r = await run(
      `Algorithme X
Variables
    i : entier
Début
    i ← 0
    Répéter
        i ← i + 1
    Jusqu'à faux
Fin`,
      { maxInstructions: 1000 }
    );
    expect(r.success).toBe(false);
    expect(r.errors[0].message).toMatch(/infinie/i);
  });

  it('avec Lire dans le corps', async () => {
    const inputs = ['1', '2', '3'];
    const r = await run(
      `Algorithme X
Variables
    n, s, x : entier
Début
    n ← 0
    s ← 0
    Répéter
        Lire(x)
        s ← s + x
        n ← n + 1
    Jusqu'à n >= 3
    Ecrire(s)
Fin`,
      { onInput: async () => inputs.shift() }
    );
    expect(r.output).toEqual(['6']);
  });
});