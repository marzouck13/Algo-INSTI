import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/interpreter/lexer.js';
import { parse } from '../src/interpreter/parser.js';
import { check } from '../src/interpreter/checker.js';

/** Raccourci : source → erreurs sémantiques. */
function errors(source) {
  return check(parse(tokenize(source)));
}

describe('checker — programme valide', () => {
  it('aucune erreur sur un programme correct', () => {
    const errs = errors(`Algorithme Maximum
Variables
    a, b, max : entier
Début
    a ← 1
    b ← 2
    Si a > b Alors
        max ← a
    Sinon
        max ← b
    FinSi
Fin`);
    expect(errs).toEqual([]);
  });

  it('entier affecté à réel autorisé', () => {
    const errs = errors(`Algorithme X
Variables
    x : réel
Début
    x ← 5
Fin`);
    expect(errs).toEqual([]);
  });
});

describe('checker — variables non déclarées', () => {
  it('détecte une variable utilisée sans déclaration', () => {
    const errs = errors(`Algorithme X
Variables
    a : entier
Début
    a ← b
Fin`);
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toMatch(/b.*n'est pas déclarée/);
  });

  it('suggère une variable proche (maxx → max)', () => {
    const errs = errors(`Algorithme X
Variables
    max : entier
Début
    maxx ← 5
Fin`);
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toMatch(/maxx/);
    expect(errs[0].hint).toMatch(/max/);
  });

  it('ne suggère rien si aucune variable n’est proche', () => {
    const errs = errors(`Algorithme X
Variables
    a : entier
Début
    completementAutre ← 5
Fin`);
    expect(errs).toHaveLength(1);
    expect(errs[0].hint).toBeNull();
  });

  it('détecte une variable non déclarée dans une condition', () => {
    const errs = errors(`Algorithme X
Variables
    a : entier
Début
    Si zzz > 0 Alors
        a ← 1
    FinSi
Fin`);
    expect(errs.some((e) => /zzz/.test(e.message))).toBe(true);
  });
});

describe('checker — déclarations', () => {
  it('détecte une double déclaration', () => {
    const errs = errors(`Algorithme X
Variables
    a : entier
    a : réel
Début
    a ← 1
Fin`);
    expect(errs.some((e) => /deux fois/.test(e.message))).toBe(true);
  });
});

describe('checker — types', () => {
  it('refuse d’affecter une chaîne à un entier', () => {
    const errs = errors(`Algorithme X
Variables
    a : entier
Début
    a ← "bonjour"
Fin`);
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toMatch(/chaine|chaîne/i);
  });

  it('refuse d’affecter un réel à un entier', () => {
    const errs = errors(`Algorithme X
Variables
    a : entier
Début
    a ← 3.14
Fin`);
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toMatch(/réel/i);
  });

  it('refuse d’additionner une chaîne et un entier', () => {
    const errs = errors(`Algorithme X
Variables
    a : entier
    s : chaine
Début
    a ← s + 1
Fin`);
    expect(errs.some((e) => /Opération/.test(e.message))).toBe(true);
  });

  it('refuse une condition « Si » non booléenne', () => {
    const errs = errors(`Algorithme X
Variables
    a : entier
Début
    Si a Alors
        a ← 1
    FinSi
Fin`);
    expect(errs.some((e) => /booléenne/.test(e.message))).toBe(true);
  });

  it('accepte une condition booléenne correcte', () => {
    const errs = errors(`Algorithme X
Variables
    a, b : entier
Début
    Si a > b Alors
        a ← 1
    FinSi
Fin`);
    expect(errs).toEqual([]);
  });
});

describe('checker — appels', () => {
  it('accepte Ecrire avec n’importe quel type', () => {
    const errs = errors(`Algorithme X
Variables
    a : entier
    s : chaine
Début
    Ecrire("valeur : ", a, s)
Fin`);
    expect(errs).toEqual([]);
  });

  it('refuse Lire sur une expression non-variable', () => {
    const errs = errors(`Algorithme X
Début
    Lire(1 + 2)
Fin`);
    expect(errs.some((e) => /variable/.test(e.message))).toBe(true);
  });

  it('refuse Lire sur une variable non déclarée', () => {
    const errs = errors(`Algorithme X
Début
    Lire(x)
Fin`);
    expect(errs.some((e) => /x.*n'est pas déclarée/.test(e.message))).toBe(true);
  });

  it('refuse un appel à une fonction inconnue', () => {
    const errs = errors(`Algorithme X
Début
    FaireTruc(1)
Fin`);
       expect(errs.some((e) => /Sous-programme inconnu/.test(e.message))).toBe(true);
  });
});

describe('checker — Pour', () => {
  it('la variable de boucle est implicitement entière', () => {
    const errs = errors(`Algorithme X
Début
    Pour i de 1 à 10 Faire
        Ecrire(i)
    FinPour
Fin`);
    expect(errs).toEqual([]);
  });

  it('la variable de boucle est accessible dans le corps', () => {
    const errs = errors(`Algorithme X
Début
    Pour i de 1 à 10 Faire
        x ← i + 1
    FinPour
Fin`);
    // x non déclarée → 1 erreur
    expect(errs.some((e) => /x.*n'est pas déclarée/.test(e.message))).toBe(true);
  });

  it('refuse une borne non entière', () => {
    const errs = errors(`Algorithme X
Début
    Pour i de 1.5 à 10 Faire
        Ecrire(i)
    FinPour
Fin`);
    expect(errs.some((e) => /inférieure.*entière/.test(e.message))).toBe(true);
  });
});