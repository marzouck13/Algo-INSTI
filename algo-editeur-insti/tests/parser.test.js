import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/interpreter/lexer.js';
import { parse } from '../src/interpreter/parser.js';
import { SyntaxError_ } from '../src/interpreter/errors.js';

/** Raccourci : source → AST. */
function ast(source) {
  return parse(tokenize(source));
}

// --- Programme -------------------------------------------------------------

describe('parser — programme', () => {
  it('parse un programme minimal', () => {
    const tree = ast('Algorithme X\nDébut\nFin');
    expect(tree.type).toBe('Program');
    expect(tree.name).toBe('X');
    expect(tree.declarations).toEqual([]);
    expect(tree.body).toEqual([]);
  });

  it('parse un programme avec déclarations', () => {
    const tree = ast(`Algorithme X
Variables
    a, b : entier
    nom : chaine
Début
Fin`);
    expect(tree.declarations).toHaveLength(2);
    expect(tree.declarations[0]).toMatchObject({
      type: 'Decl',
      names: ['a', 'b'],
      varType: 'entier',
    });
    expect(tree.declarations[1]).toMatchObject({
      type: 'Decl',
      names: ['nom'],
      varType: 'chaine',
    });
  });

  it('échoue si « Algorithme » manque', () => {
    expect(() => ast('Début\nFin')).toThrow(SyntaxError_);
  });

  it('échoue si « Fin » manque', () => {
    expect(() => ast('Algorithme X\nDébut')).toThrow(/Fin/);
  });

  it('échoue si « Début » manque', () => {
    expect(() => ast('Algorithme X\nFin')).toThrow(/Début/);
  });
});

// --- Affectation -----------------------------------------------------------

describe('parser — affectation', () => {
  it('parse les trois écritures', () => {
    for (const op of ['←', '<-', ':=']) {
      const tree = ast(`Algorithme X\nDébut\n    x ${op} 5\nFin`);
      expect(tree.body[0]).toMatchObject({
        type: 'Assign',
        target: 'x',
        expr: { type: 'Literal', value: 5 },
      });
    }
  });

  it('parse une affectation depuis une variable', () => {
    const tree = ast('Algorithme X\nDébut\n    x ← y\nFin');
    expect(tree.body[0].expr).toMatchObject({ type: 'Var', name: 'y' });
  });

  it('échoue si la cible n’est ni un appel ni une affectation', () => {
    expect(() => ast('Algorithme X\nDébut\n    x\nFin')).toThrow(/affectation/);
  });

  it('échoue si on tente d’affecter à Ecrire', () => {
    expect(() => ast('Algorithme X\nDébut\n    Ecrire ← 5\nFin'))
      .toThrow(/primitive/);
  });
});

// --- Si --------------------------------------------------------------------

describe('parser — Si', () => {
  it('parse un Si simple', () => {
    const tree = ast(`Algorithme X
Début
    Si a > b Alors
        x ← 1
    FinSi
Fin`);
    const si = tree.body[0];
    expect(si.type).toBe('If');
    expect(si.condition).toMatchObject({ type: 'Binary', op: '>' });
    expect(si.then).toHaveLength(1);
    expect(si.else).toEqual([]);
  });

  it('parse un Si avec Sinon', () => {
    const tree = ast(`Algorithme X
Début
    Si a > b Alors
        x ← 1
    Sinon
        x ← 2
    FinSi
Fin`);
    const si = tree.body[0];
    expect(si.then).toHaveLength(1);
    expect(si.else).toHaveLength(1);
  });

  it('échoue si « Alors » manque', () => {
    expect(() =>
      ast('Algorithme X\nDébut\n    Si a > b\n        x ← 1\n    FinSi\nFin')
    ).toThrow(/Alors/);
  });

  it('échoue si « FinSi » manque (message avec la ligne du Si)', () => {
    try {
      ast(`Algorithme X
Début
    Si a > b Alors
        x ← 1
Fin`);
      throw new Error('devrait échouer');
    } catch (e) {
      expect(e).toBeInstanceOf(SyntaxError_);
      expect(e.message).toMatch(/FinSi/);
      expect(e.message).toMatch(/ligne 3/);
    }
  });
});

// --- TantQue ---------------------------------------------------------------

describe('parser — TantQue', () => {
  it('parse un TantQue', () => {
    const tree = ast(`Algorithme X
Début
    TantQue i < 10 Faire
        i ← i + 1
    FinTantQue
Fin`);
    expect(tree.body[0]).toMatchObject({ type: 'While' });
    expect(tree.body[0].body).toHaveLength(1);
  });

  it('échoue si « Faire » manque', () => {
    expect(() =>
      ast('Algorithme X\nDébut\n    TantQue i < 10\n        i ← i + 1\n    FinTantQue\nFin')
    ).toThrow(/Faire/);
  });

  it('échoue si « FinTantQue » manque', () => {
    try {
      ast('Algorithme X\nDébut\n    TantQue i < 10 Faire\n        i ← i + 1\nFin');
      throw new Error('devrait échouer');
    } catch (e) {
      expect(e.message).toMatch(/FinTantQue/);
      expect(e.message).toMatch(/ligne 3/);
    }
  });
});

// --- Pour ------------------------------------------------------------------

describe('parser — Pour', () => {
  it('parse un Pour', () => {
    const tree = ast(`Algorithme X
Début
    Pour i de 1 à 10 Faire
        Ecrire(i)
    FinPour
Fin`);
    const p = tree.body[0];
    expect(p.type).toBe('For');
    expect(p.var).toBe('i');
    expect(p.from).toMatchObject({ value: 1 });
    expect(p.to).toMatchObject({ value: 10 });
    expect(p.body).toHaveLength(1);
  });

  it('échoue si « de » manque', () => {
    expect(() =>
      ast('Algorithme X\nDébut\n    Pour i 1 à 10 Faire\n    FinPour\nFin')
    ).toThrow(/de/);
  });

  it('échoue si « FinPour » manque', () => {
    try {
      ast('Algorithme X\nDébut\n    Pour i de 1 à 10 Faire\n        Ecrire(i)\nFin');
      throw new Error('devrait échouer');
    } catch (e) {
      expect(e.message).toMatch(/FinPour/);
    }
  });
});

// --- Appels ----------------------------------------------------------------

describe('parser — appels', () => {
  it('parse un appel sans argument', () => {
    const tree = ast('Algorithme X\nDébut\n    Ecrire()\nFin');
    expect(tree.body[0]).toMatchObject({ type: 'Call', name: 'Ecrire', args: [] });
  });

  it('parse un appel à un argument', () => {
    const tree = ast('Algorithme X\nDébut\n    Ecrire(42)\nFin');
    expect(tree.body[0].args).toHaveLength(1);
  });

  it('parse un appel à plusieurs arguments', () => {
    const tree = ast('Algorithme X\nDébut\n    Lire(a, b)\nFin');
    expect(tree.body[0].args).toHaveLength(2);
  });

  it('parse Ecrire avec chaîne et variable', () => {
    const tree = ast('Algorithme X\nDébut\n    Ecrire("résultat : ", x)\nFin');
    const call = tree.body[0];
    expect(call.args[0]).toMatchObject({ type: 'Literal', value: 'résultat : ' });
    expect(call.args[1]).toMatchObject({ type: 'Var', name: 'x' });
  });

  it('échoue si « ) » manque', () => {
    expect(() => ast('Algorithme X\nDébut\n    Ecrire(42\nFin')).toThrow(/\)/);
  });
});

// --- Expressions -----------------------------------------------------------

describe('parser — expressions', () => {
  it('respecte la précédence × avant +', () => {
    const tree = ast('Algorithme X\nDébut\n    x ← 1 + 2 * 3\nFin');
    const e = tree.body[0].expr;
    expect(e.op).toBe('+');
    expect(e.left.value).toBe(1);
    expect(e.right.op).toBe('*');
  });

  it('respecte les parenthèses', () => {
    const tree = ast('Algorithme X\nDébut\n    x ← (1 + 2) * 3\nFin');
    const e = tree.body[0].expr;
    expect(e.op).toBe('*');
    expect(e.left.op).toBe('+');
  });

  it('parse div et mod', () => {
    const tree = ast('Algorithme X\nDébut\n    x ← 10 div 3\n    y ← 10 mod 3\nFin');
    expect(tree.body[0].expr.op).toBe('div');
    expect(tree.body[1].expr.op).toBe('mod');
  });

  it('parse une comparaison', () => {
    const tree = ast('Algorithme X\nDébut\n    b ← a ≤ 10\nFin');
    expect(tree.body[0].expr).toMatchObject({ type: 'Binary', op: '≤' });
  });

  it('parse et / ou (et prioritaire)', () => {
    const tree = ast('Algorithme X\nDébut\n    b ← a ou c et d\nFin');
    const e = tree.body[0].expr;
    expect(e.op).toBe('ou');
    expect(e.right.op).toBe('et');
  });

  it('parse non x = 5 comme non (x = 5)', () => {
    const tree = ast('Algorithme X\nDébut\n    b ← non x = 5\nFin');
    const e = tree.body[0].expr;
    expect(e.type).toBe('Unary');
    expect(e.op).toBe('non');
    expect(e.operand.type).toBe('Binary');
    expect(e.operand.op).toBe('=');
  });

  it('parse le moins unaire', () => {
    const tree = ast('Algorithme X\nDébut\n    x ← -5\nFin');
    expect(tree.body[0].expr).toMatchObject({ type: 'Unary', op: '-' });
  });

  it('parse les booléens', () => {
    const tree = ast('Algorithme X\nDébut\n    b ← vrai\nFin');
    expect(tree.body[0].expr).toMatchObject({
      type: 'Literal',
      value: true,
      literalType: 'booléen',
    });
  });

  it('parse un réel', () => {
    const tree = ast('Algorithme X\nDébut\n    x ← 3,14\nFin');
    expect(tree.body[0].expr).toMatchObject({
      value: 3.14,
      literalType: 'réel',
    });
  });

  it('échoue si une parenthèse n’est pas fermée', () => {
    expect(() => ast('Algorithme X\nDébut\n    x ← (1 + 2\nFin')).toThrow(/\)/);
  });

  it('échoue sur une expression vide', () => {
    expect(() => ast('Algorithme X\nDébut\n    x ←\nFin')).toThrow(/Expression/);
  });
});

// --- Programme complet -----------------------------------------------------

describe('parser — programme complet', () => {
  it('parse le programme Maximum', () => {
    const tree = ast(`Algorithme Maximum
Variables
    a, b, max : entier
Début
    Ecrire("Entrez deux nombres")
    Lire(a, b)
    Si a > b Alors
        max ← a
    Sinon
        max ← b
    FinSi
    Ecrire("Le maximum est ", max)
Fin`);
    expect(tree.name).toBe('Maximum');
    expect(tree.declarations).toHaveLength(1);
    expect(tree.body).toHaveLength(4);
    expect(tree.body[2].type).toBe('If');
    expect(tree.body[2].then[0]).toMatchObject({
      type: 'Assign',
      target: 'max',
    });
  });
});