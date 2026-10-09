import { describe, it, expect } from 'vitest';
import { tokenize, TT } from '../src/interpreter/lexer.js';
import { LexError } from '../src/interpreter/errors.js';

/** Raccourci : tokenize et renvoie le 1er token (hors EOF). */
function first(src) {
  return tokenize(src)[0];
}

describe('lexer — mots-clés', () => {
  it('reconnaît un mot-clé simple', () => {
    const t = first('Si');
    expect(t.type).toBe(TT.KEYWORD);
    expect(t.value).toBe('Si');
  });

  it('accepte toutes les casses', () => {
    for (const s of ['SI', 'si', 'sI', 'Si']) {
      expect(first(s).value).toBe('Si');
    }
  });

  it('accepte accents ou non sur Début', () => {
    for (const s of ['Début', 'Debut', 'DEBUT', 'début']) {
      expect(first(s).value).toBe('Début');
    }
  });

  it('reconnaît un mot-clé opérateur (div, mod)', () => {
    expect(first('div').type).toBe(TT.KEYWORD);
    expect(first('mod').type).toBe(TT.KEYWORD);
  });

  it('reconnaît un builtin (Ecrire, Lire)', () => {
    expect(first('Ecrire').type).toBe(TT.BUILTIN);
    expect(first('Écrire').value).toBe('Ecrire');
    expect(first('Lire').type).toBe(TT.BUILTIN);
  });

  it('reconnaît un type', () => {
    expect(first('entier').type).toBe(TT.TYPE);
    expect(first('réel').type).toBe(TT.TYPE);
    expect(first('Reel').value).toBe('réel');
  });

  it('reconnaît un booléen', () => {
    expect(first('vrai').type).toBe(TT.BOOL);
    expect(first('VRAI').value).toBe('vrai');
    expect(first('Faux').value).toBe('faux');
  });
});

describe('lexer — identifiants', () => {
  it('lit un identifiant simple', () => {
    const t = first('maximum');
    expect(t.type).toBe(TT.IDENT);
    expect(t.value).toBe('maximum');
  });

  it('accepte chiffres et underscore', () => {
    expect(first('x1_2').value).toBe('x1_2');
  });

  it('accepte les lettres accentuées', () => {
    expect(first('élève').value).toBe('élève');
  });

  it('ne confond pas un identifiant « a » avec le mot-clé « à »', () => {
    expect(first('a').type).toBe(TT.IDENT);
    expect(first('a').value).toBe('a');
    expect(first('à').type).toBe(TT.KEYWORD);
    expect(first('à').value).toBe('à');
  });
});

describe('lexer — nombres', () => {
  it('lit un entier', () => {
    const t = first('42');
    expect(t.type).toBe(TT.NUMBER);
    expect(t.value).toEqual({ value: 42, isReal: false });
  });

  it('lit un réel avec point', () => {
    expect(first('3.14').value).toEqual({ value: 3.14, isReal: true });
  });

  it('lit un réel avec virgule', () => {
    expect(first('3,14').value).toEqual({ value: 3.14, isReal: true });
  });

  it('ne confond pas la virgule d’appel avec un décimal', () => {
    const toks = tokenize('a, b');
    expect(toks[0].type).toBe(TT.IDENT);
    expect(toks[1].type).toBe(TT.PUNCT);
    expect(toks[1].value).toBe(',');
    expect(toks[2].type).toBe(TT.IDENT);
  });
});

describe('lexer — chaînes', () => {
  it('lit une chaîne simple', () => {
    const t = first('"bonjour"');
    expect(t.type).toBe(TT.STRING);
    expect(t.value).toBe('bonjour');
  });

  it('gère les échappements', () => {
    expect(first('"a\\nb"').value).toBe('a\nb');
    expect(first('"a\\"b"').value).toBe('a"b');
  });

  it('rejette une chaîne non fermée', () => {
    expect(() => tokenize('"bonjour')).toThrow(LexError);
  });

  it('rejette une chaîne qui traverse un saut de ligne', () => {
    expect(() => tokenize('"a\nb"')).toThrow(LexError);
  });
});

describe('lexer — opérateurs et ponctuation', () => {
  it('reconnaît les trois écritures d’affectation', () => {
    expect(first('←').value).toBe('←');
    expect(first('<-').value).toBe('<-');
    expect(first(':=').value).toBe(':=');
    for (const s of ['←', '<-', ':=']) expect(first(s).type).toBe(TT.OP);
  });

  it('reconnaît toutes les comparaisons', () => {
    for (const s of ['=', '≠', '!=', '<', '>', '≤', '<=', '≥', '>=']) {
      const t = first(s);
      expect(t.type).toBe(TT.OP);
      expect(t.value).toBe(s);
    }
  });

  it('reconnaît la ponctuation', () => {
    for (const s of ['(', ')', '[', ']', ',', ':']) {
      expect(first(s).type).toBe(TT.PUNCT);
    }
  });
});

describe('lexer — commentaires', () => {
  it('ignore un commentaire //', () => {
    const toks = tokenize('x // commentaire\n42');
    expect(toks[0].value).toBe('x');
    expect(toks[1].value).toEqual({ value: 42, isReal: false });
  });

  it('ignore un commentaire { ... } multi-ligne', () => {
    const toks = tokenize('x { bla\nbla } 42');
    expect(toks[0].value).toBe('x');
    expect(toks[1].value).toEqual({ value: 42, isReal: false });
  });

  it('ne confond pas un { dans une chaîne avec un commentaire', () => {
    const t = first('"{"');
    expect(t.type).toBe(TT.STRING);
    expect(t.value).toBe('{');
  });

  it('rejette un commentaire { non fermé', () => {
    expect(() => tokenize('x { bla')).toThrow(LexError);
  });
});

describe('lexer — erreurs', () => {
  it('rejette un caractère inconnu', () => {
    expect(() => tokenize('@')).toThrow(LexError);
  });

  it('reporte la bonne ligne', () => {
    try {
      tokenize('ligne1\nligne2\n@');
      throw new Error('devrait échouer');
    } catch (e) {
      expect(e).toBeInstanceOf(LexError);
      expect(e.line).toBe(3);
    }
  });
});

describe('lexer — programme complet', () => {
  const SAMPLE = `Algorithme Maximum
Variables
    a, b, max : entier
Début
    Ecrire("Entrez deux nombres")
    Lire(a, b)
    Si a > b Alors
        max <- a
    Sinon
        max <- b
    FinSi
    Ecrire("Le maximum est ", max)
Fin
`;

  it('tokenize sans erreur et se termine par EOF', () => {
    const toks = tokenize(SAMPLE);
    expect(toks[toks.length - 1].type).toBe(TT.EOF);
    expect(toks[0]).toMatchObject({ type: TT.KEYWORD, value: 'Algorithme' });
  });

  it('contient les tokens attendus en nombre', () => {
    const toks = tokenize(SAMPLE);
    const count = (type) => toks.filter((t) => t.type === type).length;
    // 2 Ecrire + 1 Lire = 3 builtins
    expect(count(TT.BUILTIN)).toBe(3);
    // Algorithme, Variables, Début, Si, Alors, Sinon, FinSi, Fin = 8
    expect(count(TT.KEYWORD)).toBe(8);
    // "Entrez deux nombres" et "Le maximum est " = 2 chaînes
    expect(count(TT.STRING)).toBe(2);
  });
});