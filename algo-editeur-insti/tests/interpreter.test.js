import { describe, it, expect } from 'vitest';
import { run } from '../src/interpreter/pipeline.js';

/** Raccourci : exécute et renvoie le résultat complet. */
function exec(source, opts) {
  return run(source, opts);
}

/** Raccourci : exécute et renvoie juste la sortie console. */
async function out(source, opts) {
  const r = await run(source, opts);
  return r.output;
}

// --- Programmes sans entrée ------------------------------------------------

describe('interpreter — Ecrire', () => {
  it('affiche un entier', async () => {
    const r = await out('Algorithme X\nDébut\n    Ecrire(42)\nFin');
    expect(r).toEqual(['42']);
  });

  it('affiche une chaîne', async () => {
    const r = await out('Algorithme X\nDébut\n    Ecrire("bonjour")\nFin');
    expect(r).toEqual(['bonjour']);
  });

  it('affiche un réel avec virgule', async () => {
    const r = await out('Algorithme X\nDébut\n    Ecrire(3,14)\nFin');
    expect(r).toEqual(['3,14']);
  });

  it('affiche un booléen', async () => {
    const r = await out('Algorithme X\nDébut\n    Ecrire(vrai)\n    Ecrire(faux)\nFin');
    expect(r).toEqual(['vrai', 'faux']);
  });

  it('concatène plusieurs arguments', async () => {
    const r = await out('Algorithme X\nDébut\n    Ecrire("x=", 42)\nFin');
    expect(r).toEqual(['x=42']);
  });
});

describe('interpreter — affectation', () => {
  it('assigne un entier et l’affiche', async () => {
    const r = await exec('Algorithme X\nVariables\n    a : entier\nDébut\n    a ← 5\n    Ecrire(a)\nFin');
    expect(r.output).toEqual(['5']);
    const v = r.variables.find((x) => x.name === 'a');
    expect(v.value).toBe(5);
    expect(v.type).toBe('entier');
  });

  it('assigne un réel', async () => {
    const r = await out('Algorithme X\nDébut\n    Ecrire(3.14)\nFin');
    expect(r).toEqual(['3,14']);
  });
});

describe('interpreter — arithmétique', () => {
  it('respecte la précédence', async () => {
    expect(await out('Algorithme X\nDébut\n    Ecrire(1 + 2 * 3)\nFin')).toEqual(['7']);
  });

  it('respecte les parenthèses', async () => {
    expect(await out('Algorithme X\nDébut\n    Ecrire((1 + 2) * 3)\nFin')).toEqual(['9']);
  });

  it('div est une division entière', async () => {
    expect(await out('Algorithme X\nDébut\n    Ecrire(10 div 3)\nFin')).toEqual(['3']);
  });

  it('mod renvoie le reste', async () => {
    expect(await out('Algorithme X\nDébut\n    Ecrire(10 mod 3)\nFin')).toEqual(['1']);
  });

  it('division réelle', async () => {
    expect(await out('Algorithme X\nDébut\n    Ecrire(1 / 4)\nFin')).toEqual(['0,25']);
  });

  it('refuse la division par zéro', async () => {
    const r = await exec('Algorithme X\nDébut\n    Ecrire(1 / 0)\nFin');
    expect(r.success).toBe(false);
    expect(r.errors[0].message).toMatch(/zéro/);
  });

  it('refuse div par zéro', async () => {
    const r = await exec('Algorithme X\nDébut\n    Ecrire(1 div 0)\nFin');
    expect(r.success).toBe(false);
    expect(r.errors[0].message).toMatch(/zéro/);
  });
});

describe('interpreter — comparaisons et logique', () => {
  it('compare des entiers', async () => {
    const src = (op) => `Algorithme X\nDébut\n    Ecrire(3 ${op} 5)\nFin`;
    expect(await out(src('='))).toEqual(['faux']);
    expect(await out(src('≠'))).toEqual(['vrai']);
    expect(await out(src('<'))).toEqual(['vrai']);
    expect(await out(src('>'))).toEqual(['faux']);
    expect(await out(src('≤'))).toEqual(['vrai']);
    expect(await out(src('≥'))).toEqual(['faux']);
  });

  it('combine et / ou / non', async () => {
    expect(await out('Algorithme X\nDébut\n    Ecrire(vrai et faux)\nFin')).toEqual(['faux']);
    expect(await out('Algorithme X\nDébut\n    Ecrire(vrai ou faux)\nFin')).toEqual(['vrai']);
    expect(await out('Algorithme X\nDébut\n    Ecrire(non vrai)\nFin')).toEqual(['faux']);
  });
});

// --- Si / TantQue / Pour ---------------------------------------------------

describe('interpreter — Si', () => {
  it('prend la branche Alors', async () => {
    const r = await out(`Algorithme X
Variables
    a : entier
Début
    a ← 5
    Si a > 3 Alors
        Ecrire("grand")
    Sinon
        Ecrire("petit")
    FinSi
Fin`);
    expect(r).toEqual(['grand']);
  });

  it('prend la branche Sinon', async () => {
    const r = await out(`Algorithme X
Variables
    a : entier
Début
    a ← 2
    Si a > 3 Alors
        Ecrire("grand")
    Sinon
        Ecrire("petit")
    FinSi
Fin`);
    expect(r).toEqual(['petit']);
  });

  it('gère un Si sans Sinon', async () => {
    const r = await out(`Algorithme X
Variables
    a : entier
Début
    a ← 1
    Si a > 3 Alors
        Ecrire("grand")
    FinSi
    Ecrire("fin")
Fin`);
    expect(r).toEqual(['fin']);
  });
});

describe('interpreter — TantQue', () => {
  it('boucle jusqu’à condition fausse', async () => {
    const r = await out(`Algorithme X
Variables
    i, somme : entier
Début
    i ← 0
    somme ← 0
    TantQue i < 5 Faire
        somme ← somme + i
        i ← i + 1
    FinTantQue
    Ecrire(somme)
Fin`);
    // 0+1+2+3+4 = 10
    expect(r).toEqual(['10']);
  });
});

describe('interpreter — Pour', () => {
  it('itère de 1 à 5', async () => {
    const r = await out(`Algorithme X
Variables
    somme : entier
Début
    somme ← 0
    Pour i de 1 à 5 Faire
        somme ← somme + i
    FinPour
    Ecrire(somme)
Fin`);
    expect(r).toEqual(['15']);
  });

  it('ne fait rien si borne basse > borne haute', async () => {
    const r = await out(`Algorithme X
Début
    Pour i de 5 à 1 Faire
        Ecrire(i)
    FinPour
    Ecrire("fini")
Fin`);
    expect(r).toEqual(['fini']);
  });
});

// --- Lire ------------------------------------------------------------------

describe('interpreter — Lire', () => {
  it('lit un entier', async () => {
    const inputs = ['42'];
    const r = await exec(
      `Algorithme X
Variables
    x : entier
Début
    Lire(x)
    Ecrire("x=", x)
Fin`,
      { onInput: async () => inputs.shift() }
    );
    expect(r.output).toEqual(['x=42']);
    expect(r.variables.find((v) => v.name === 'x').value).toBe(42);
  });

  it('lit plusieurs variables', async () => {
    const inputs = ['3', '4'];
    const r = await exec(
      `Algorithme X
Variables
    a, b : entier
Début
    Lire(a, b)
    Ecrire(a + b)
Fin`,
      { onInput: async () => inputs.shift() }
    );
    expect(r.output).toEqual(['7']);
  });

  it('accepte virgule pour un réel', async () => {
    const r = await exec(
      `Algorithme X
Variables
    x : réel
Début
    Lire(x)
    Ecrire(x)
Fin`,
      { onInput: async () => '3,14' }
    );
    expect(r.output).toEqual(['3,14']);
  });

  it('refuse une saisie invalide', async () => {
    const r = await exec(
      `Algorithme X
Variables
    x : entier
Début
    Lire(x)
Fin`,
      { onInput: async () => 'bonjour' }
    );
    expect(r.success).toBe(false);
    expect(r.errors[0].message).toMatch(/entier/);
  });
});

// --- Programme complet -----------------------------------------------------

describe('interpreter — programme complet', () => {
  it('exécute Maximum', async () => {
    const inputs = ['3', '8'];
    const r = await exec(
      `Algorithme Maximum
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
Fin`,
      { onInput: async () => inputs.shift() }
    );
    expect(r.success).toBe(true);
    expect(r.output).toEqual(['Entrez deux nombres', 'Le maximum est 8']);
    expect(r.variables.find((v) => v.name === 'max').value).toBe(8);
  });
});

// --- Sécurité --------------------------------------------------------------

describe('interpreter — limites', () => {
  it('coupe une boucle infinie (maxInstructions)', async () => {
    const r = await exec(
      `Algorithme X
Début
    TantQue vrai Faire
        Ecrire("spam")
    FinTantQue
Fin`,
      { maxInstructions: 1000 }
    );
    expect(r.success).toBe(false);
    expect(r.errors[0].message).toMatch(/infinie/i);
  });
});

// --- Pipeline : erreurs en amont ------------------------------------------

describe('interpreter — pipeline', () => {
  it('retourne les erreurs lexicales sans exécuter', async () => {
    const r = await exec('Algorithme X\nDébut\n    @\nFin');
    expect(r.success).toBe(false);
    expect(r.errors[0].type).toBe('lexical');
    expect(r.output).toEqual([]);
  });

  it('retourne les erreurs syntaxiques sans exécuter', async () => {
    const r = await exec('Algorithme X\nDébut\n    Si vrai Alors\nFin');
    expect(r.success).toBe(false);
    expect(r.errors[0].type).toBe('syntax');
  });

  it('retourne les erreurs sémantiques sans exécuter', async () => {
    const r = await exec(`Algorithme X
Variables
    max : entier
Début
    maxx ← 5
Fin`);
    expect(r.success).toBe(false);
    expect(r.errors[0].type).toBe('semantic');
    expect(r.errors[0].hint).toMatch(/max/);
  });
});