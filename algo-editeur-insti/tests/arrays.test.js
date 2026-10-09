import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/interpreter/lexer.js';
import { parse } from '../src/interpreter/parser.js';
import { check } from '../src/interpreter/checker.js';
import { run } from '../src/interpreter/pipeline.js';

function ast(src) { return parse(tokenize(src)); }
function semErrors(src) { return check(parse(tokenize(src))); }
async function out(src, opts) {
  const r = await run(src, opts);
  return { output: r.output, success: r.success, errors: r.errors, variables: r.variables };
}

// --- Parser -----------------------------------------------------------------

describe('parser — déclarations de tableau', () => {
  it('parse une déclaration simple', () => {
    const tree = ast(`Algorithme X
Variables
    T : tableau [1..10] de entier
Début
Fin`);
    expect(tree.declarations).toHaveLength(1);
    expect(tree.declarations[0]).toMatchObject({
      type: 'Decl',
      names: ['T'],
      varType: 'tableau',
      array: { from: 1, to: 10, elementType: 'entier' },
    });
  });

  it('accepte d’autres bornes', () => {
    const tree = ast(`Algorithme X
Variables
    T : tableau [0..99] de réel
Début
Fin`);
    expect(tree.declarations[0].array).toMatchObject({ from: 0, to: 99, elementType: 'réel' });
  });

  it('refuse borne sup < borne inf', () => {
    expect(() => ast(`Algorithme X
Variables
    T : tableau [10..1] de entier
Début
Fin`)).toThrow(/supérieure/);
  });

  it('refuse une borne non entière', () => {
    expect(() => ast(`Algorithme X
Variables
    T : tableau [1..2.5] de entier
Début
Fin`)).toThrow(/entier/);
  });

  it('refuse plusieurs variables pour un même tableau', () => {
    expect(() => ast(`Algorithme X
Variables
    T, U : tableau [1..10] de entier
Début
Fin`)).toThrow(/une seule variable/);
  });

  it('parse un accès T[i] en lecture', () => {
    const tree = ast(`Algorithme X
Variables
    T : tableau [1..10] de entier
    x : entier
Début
    x ← T[3]
Fin`);
    expect(tree.body[0].expr).toMatchObject({
      type: 'ArrayAccess',
      name: 'T',
    });
    expect(tree.body[0].expr.index).toMatchObject({ type: 'Literal', value: 3 });
  });

  it('parse un accès T[i] en écriture', () => {
    const tree = ast(`Algorithme X
Variables
    T : tableau [1..10] de entier
Début
    T[5] ← 42
Fin`);
    expect(tree.body[0].target).toMatchObject({
      name: 'T',
    });
    expect(tree.body[0].target.index).toMatchObject({ value: 5 });
  });

  it('parse un indice expression', () => {
    const tree = ast(`Algorithme X
Variables
    T : tableau [1..10] de entier
    i, x : entier
Début
    x ← T[i + 1]
Fin`);
    expect(tree.body[0].expr.index).toMatchObject({ type: 'Binary', op: '+' });
  });
});

// --- Checker ----------------------------------------------------------------

describe('checker — tableaux', () => {
  it('refuse l’usage d’une variable non déclarée comme tableau', () => {
    const errs = semErrors(`Algorithme X
Début
    T[1] ← 5
Fin`);
    expect(errs.some((e) => /T.*n'est pas déclarée/.test(e.message))).toBe(true);
  });

  it('refuse l’accès indexé à un scalaire', () => {
    const errs = semErrors(`Algorithme X
Variables
    x : entier
Début
    x[1] ← 5
Fin`);
    expect(errs.some((e) => /pas un tableau/.test(e.message))).toBe(true);
  });

  it('refuse un indice non entier', () => {
    const errs = semErrors(`Algorithme X
Variables
    T : tableau [1..10] de entier
Début
    T[1.5] ← 5
Fin`);
    expect(errs.some((e) => /indice.*entier/.test(e.message))).toBe(true);
  });

  it('refuse un indice littéral hors bornes', () => {
    const errs = semErrors(`Algorithme X
Variables
    T : tableau [1..10] de entier
Début
    T[11] ← 5
Fin`);
    expect(errs.some((e) => /hors limites/.test(e.message))).toBe(true);
  });

  it('refuse l’affectation d’une chaîne à un tableau d’entiers', () => {
    const errs = semErrors(`Algorithme X
Variables
    T : tableau [1..10] de entier
Début
    T[1] ← "abc"
Fin`);
    expect(errs.some((e) => /chaine|chaîne/i.test(e.message))).toBe(true);
  });

  it('refuse l’utilisation d’un tableau sans indice', () => {
    const errs = semErrors(`Algorithme X
Variables
    T : tableau [1..10] de entier
    x : entier
Début
    x ← T
Fin`);
    expect(errs.some((e) => /précisez un indice/.test(e.message))).toBe(true);
  });

  it('refuse l’affectation à un tableau entier', () => {
    const errs = semErrors(`Algorithme X
Variables
    T : tableau [1..10] de entier
Début
    T ← 5
Fin`);
    expect(errs.some((e) => /précisez un indice/.test(e.message))).toBe(true);
  });

  it('accepte un programme correct', () => {
    const errs = semErrors(`Algorithme X
Variables
    T : tableau [1..10] de entier
    i : entier
Début
    T[1] ← 5
    T[i] ← 10
    i ← T[2]
Fin`);
    expect(errs).toEqual([]);
  });
});

// --- Interpréteur -----------------------------------------------------------

describe('interpreter — tableaux', () => {
  it('initialise les éléments à la valeur par défaut du type', async () => {
    const r = await out(`Algorithme X
Variables
    T : tableau [1..3] de entier
Début
    Ecrire(T[1], T[2], T[3])
Fin`);
    expect(r.output).toEqual(['000']);
  });

  it('écrit et relit une valeur', async () => {
    const r = await out(`Algorithme X
Variables
    T : tableau [1..5] de entier
Début
    T[3] ← 42
    Ecrire(T[3])
Fin`);
    expect(r.output).toEqual(['42']);
  });

  it('utilise les vraies bornes 1..N', async () => {
    const r = await out(`Algorithme X
Variables
    T : tableau [5..7] de entier
Début
    T[5] ← 10
    T[6] ← 20
    T[7] ← 30
    Ecrire(T[5] + T[6] + T[7])
Fin`);
    expect(r.output).toEqual(['60']);
  });

  it('calcule la somme via une boucle', async () => {
    const r = await out(`Algorithme X
Variables
    T : tableau [1..5] de entier
    i, s : entier
Début
    Pour i de 1 à 5 Faire
        T[i] ← i * i
    FinPour
    s ← 0
    Pour i de 1 à 5 Faire
        s ← s + T[i]
    FinPour
    Ecrire(s)
Fin`);
    // 1 + 4 + 9 + 16 + 25 = 55
    expect(r.output).toEqual(['55']);
  });

  it('détecte un indice hors limites à l’exécution', async () => {
    const r = await run(`Algorithme X
Variables
    T : tableau [1..5] de entier
    i : entier
Début
    i ← 10
    T[i] ← 1
Fin`);
    expect(r.success).toBe(false);
    expect(r.errors[0].message).toMatch(/hors limites/);
    expect(r.errors[0].message).toMatch(/10/);
  });

  it('détecte un indice < borne inf', async () => {
    const r = await run(`Algorithme X
Variables
    T : tableau [1..5] de entier
    i : entier
Début
    i ← 0
    Ecrire(T[i])
Fin`);
    expect(r.success).toBe(false);
    expect(r.errors[0].message).toMatch(/hors limites/);
  });

  it('affiche un tableau dans la console', async () => {
    const r = await out(`Algorithme X
Variables
    T : tableau [1..3] de entier
Début
    T[1] ← 10
    T[2] ← 20
    T[3] ← 30
    Ecrire(T)
Fin`);
    expect(r.output).toEqual(['[10, 20, 30]']);
  });

  it('expose le tableau dans le panneau Variables', async () => {
    const r = await out(`Algorithme X
Variables
    T : tableau [1..3] de entier
Début
    T[1] ← 5
Fin`);
    const v = r.variables.find((x) => x.name === 'T');
    expect(v).toBeTruthy();
    expect(v.value.__array).toBe(true);
    expect(v.value.from).toBe(1);
    expect(v.value.to).toBe(3);
    expect(v.value.data[0]).toBe(5);
  });

  it('avec Lire sur une case de tableau', async () => {
    const inputs = ['5'];
    const r = await run(
      `Algorithme X
Variables
    T : tableau [1..3] de entier
Début
    Lire(T[2])
    Ecrire(T[2])
Fin`,
      { onInput: async () => inputs.shift() }
    );
    expect(r.output).toEqual(['5']);
  });

  it('tableau de réels', async () => {
    const r = await out(`Algorithme X
Variables
    T : tableau [1..2] de réel
Début
    T[1] ← 3.14
    T[2] ← 1,5
    Ecrire(T[1], " ", T[2])
Fin`);
    expect(r.output).toEqual(['3,14 1,5']);
  });
});