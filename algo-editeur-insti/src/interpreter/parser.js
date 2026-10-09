// Parser — version CallExpr — 2026-10-09
import { SyntaxError_ } from './errors.js';
import { TT } from './lexer.js';

const ASSIGN_OPS = new Set(['←', '<-', ':=']);
const CMP_OPS = new Set(['=', '≠', '!=', '<', '>', '≤', '<=', '≥', '>=']);
const ADD_OPS = new Set(['+', '-']);
const MUL_OPS = new Set(['*', '/']);
const MUL_KEYWORDS = new Set(['div', 'mod']);

const BLOCK_ENDERS = new Set([
  'Fin', 'FinSi', 'FinTantQue', 'FinPour', 'Sinon', "Jusqu'à",
]);

const SCALAR_TYPES = new Set([
  'entier', 'réel', 'booléen', 'caractère', 'chaine',
]);

export function parse(tokens) {
  const parser = new Parser(tokens);
  return parser.parseProgram();
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek(offset = 0) {
    const i = this.pos + offset;
    return i < this.tokens.length
      ? this.tokens[i]
      : this.tokens[this.tokens.length - 1];
  }

  atEnd() { return this.peek().type === TT.EOF; }

  check(type, value) {
    const t = this.peek();
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  advance() {
    const t = this.peek();
    if (t.type !== TT.EOF) this.pos++;
    return t;
  }

  match(type, value) {
    if (this.check(type, value)) return this.advance();
    return null;
  }

  expect(type, value, msg) {
    if (this.check(type, value)) return this.advance();
    const t = this.peek();
    throw new SyntaxError_(msg, t.line, t.column);
  }

  error(msg, token = this.peek()) {
    return new SyntaxError_(msg, token.line, token.column);
  }

  parseProgram() {
    const kw = this.peek();
    if (!(kw.type === TT.KEYWORD && kw.value === 'Algorithme')) {
      throw this.error(`Le programme doit commencer par « Algorithme ».`, kw);
    }
    this.advance();

    const nameTok = this.expect(TT.IDENT, undefined,
      `Nom d'algorithme attendu après « Algorithme ».`);
    const name = nameTok.value;

    const declarations = [];
    if (this.check(TT.KEYWORD, 'Variables')) {
      this.advance();
      while (!this.atEnd() && !this.check(TT.KEYWORD, 'Début')) {
        declarations.push(this.parseDeclaration());
      }
    }

    this.expect(TT.KEYWORD, 'Début',
      `« Début » attendu avant les instructions de l'algorithme.`);

    const body = this.parseBlock();

    this.expect(TT.KEYWORD, 'Fin',
      `« Fin » attendu pour clore l'algorithme « ${name} ».`);

    const functions = [];
    while (
      this.check(TT.KEYWORD, 'Fonction') ||
      this.check(TT.KEYWORD, 'Procédure')
    ) {
      functions.push(this.parseSubprogram());
    }

    if (!this.atEnd()) {
      const t = this.peek();
      throw this.error(`Contenu inattendu après la fin des sous-programmes.`, t);
    }

    return { type: 'Program', name, declarations, body, functions };
  }

  parseSubprogram() {
    const openTok = this.advance();
    const isProcedure = openTok.value === 'Procédure';

    const nameTok = this.expect(TT.IDENT, undefined,
      `Nom ${isProcedure ? 'de la procédure' : 'de la fonction'} attendu après « ${openTok.value} ».`);
    const name = nameTok.value;

    this.expect(TT.PUNCT, '(', `« ( » attendu après « ${name} ».`);

    const params = [];
    if (!this.check(TT.PUNCT, ')')) {
      params.push(this.parseParam());
      while (this.match(TT.PUNCT, ',')) {
        params.push(this.parseParam());
      }
    }

    this.expect(TT.PUNCT, ')',
      `« ) » attendu pour fermer la liste des paramètres de « ${name} ».`);

    let returnType = null;
    if (!isProcedure) {
      this.expect(TT.PUNCT, ':',
        `« : » attendu après la liste des paramètres (type de retour).`);
      const retTok = this.peek();
      if (retTok.type !== TT.TYPE || !SCALAR_TYPES.has(retTok.value)) {
        throw this.error(
          `Type de retour attendu après « : ». Types valides : entier, réel, booléen, caractère, chaine.`,
          retTok
        );
      }
      this.advance();
      returnType = retTok.value;
    }

    const declarations = [];
    if (this.check(TT.KEYWORD, 'Variables')) {
      this.advance();
      while (!this.atEnd() && !this.check(TT.KEYWORD, 'Début')) {
        declarations.push(this.parseDeclaration());
      }
    }

    this.expect(TT.KEYWORD, 'Début',
      `« Début » attendu dans ${isProcedure ? 'la procédure' : 'la fonction'} « ${name} ».`);

    const body = this.parseBlock();

    this.expect(TT.KEYWORD, 'Fin',
      `« Fin » attendu pour clore « ${name} » (ouvert ligne ${openTok.line}).`);

    return {
      type: 'FunctionDecl',
      name, params, returnType, isProcedure, declarations, body,
      line: openTok.line, column: openTok.column,
    };
  }

  parseParam() {
    const nameTok = this.expect(TT.IDENT, undefined,
      `Nom de paramètre attendu.`);
    this.expect(TT.PUNCT, ':',
      `« : » attendu après « ${nameTok.value} » (type du paramètre).`);
    const typeTok = this.peek();
    if (typeTok.type !== TT.TYPE || !SCALAR_TYPES.has(typeTok.value)) {
      throw this.error(
        `Type attendu après « : » pour le paramètre « ${nameTok.value} ».`,
        typeTok
      );
    }
    this.advance();
    return {
      name: nameTok.value,
      paramType: typeTok.value,
      line: nameTok.line, column: nameTok.column,
    };
  }

  parseDeclaration() {
    const first = this.expect(TT.IDENT, undefined,
      `Nom de variable attendu dans les déclarations.`);
    const names = [first.value];

    while (this.match(TT.PUNCT, ',')) {
      const t = this.expect(TT.IDENT, undefined,
        `Nom de variable attendu après « , ».`);
      names.push(t.value);
    }

    this.expect(TT.PUNCT, ':',
      `« : » attendu après « ${names.join(', ')} ».`);

    const typeTok = this.peek();
    if (typeTok.type !== TT.TYPE) {
      throw this.error(
        `Type attendu après « : ». Types valides : entier, réel, booléen, caractère, chaine, tableau.`,
        typeTok
      );
    }
    this.advance();

    if (typeTok.value === 'tableau') {
      if (names.length > 1) {
        throw this.error(
          `Un tableau ne peut être déclaré qu'avec une seule variable à la fois.`,
          first
        );
      }
      const array = this.parseArrayShape(typeTok);
      return {
        type: 'Decl', names, varType: 'tableau', array,
        line: first.line, column: first.column,
      };
    }

    if (!SCALAR_TYPES.has(typeTok.value)) {
      throw this.error(`Type scalaire inconnu : « ${typeTok.value} ».`, typeTok);
    }

    return {
      type: 'Decl', names, varType: typeTok.value,
      line: first.line, column: first.column,
    };
  }

  parseIntLiteral(context) {
    let sign = 1;
    let signTok = null;
    if (this.check(TT.OP, '-')) {
      signTok = this.advance();
      sign = -1;
    }
    const tok = this.peek();
    if (tok.type !== TT.NUMBER) {
      throw this.error(
        `${context} : entier attendu${signTok ? ' après « - »' : ''}.`, tok);
    }
    if (tok.value.isReal) {
      throw this.error(`${context} : entier attendu, réel trouvé.`, tok);
    }
    this.advance();
    return { value: sign * tok.value.value, token: signTok ?? tok };
  }

  parseArrayShape(tableauTok) {
    this.expect(TT.PUNCT, '[',
      `« [ » attendu après « tableau » (ligne ${tableauTok.line}).`);
    const fromLit = this.parseIntLiteral('Borne inférieure du tableau');
    const from = fromLit.value;
    this.expect(TT.OP, '..',
      `« .. » attendu entre les deux bornes du tableau.`);
    const toLit = this.parseIntLiteral('Borne supérieure du tableau');
    const to = toLit.value;
    this.expect(TT.PUNCT, ']',
      `« ] » attendu pour fermer la forme du tableau.`);
    this.expect(TT.KEYWORD, 'de',
      `« de » attendu après « [${from}..${to}] ».`);

    const elemTok = this.peek();
    if (elemTok.type !== TT.TYPE || !SCALAR_TYPES.has(elemTok.value)) {
      throw this.error(
        `Type d'élément attendu après « de ». Types valides : entier, réel, booléen, caractère, chaine.`,
        elemTok
      );
    }
    this.advance();

    if (to < from) {
      throw this.error(
        `La borne supérieure (${to}) doit être ≥ à la borne inférieure (${from}).`,
        toLit.token
      );
    }

    return { from, to, elementType: elemTok.value };
  }

  parseBlock() {
    const stmts = [];
    while (!this.atEnd()) {
      const t = this.peek();
      if (t.type === TT.KEYWORD && BLOCK_ENDERS.has(t.value)) break;
      stmts.push(this.parseStatement());
    }
    return stmts;
  }

  parseStatement() {
    const t = this.peek();

    if (t.type === TT.KEYWORD) {
      switch (t.value) {
        case 'Si':       return this.parseIf();
        case 'TantQue':  return this.parseWhile();
        case 'Pour':     return this.parseFor();
        case 'Répéter':  return this.parseRepeat();
        case 'Retourner': return this.parseReturn();
        default:
          throw this.error(`Instruction inattendue : « ${t.value} ».`, t);
      }
    }

    if (t.type === TT.IDENT || t.type === TT.BUILTIN) {
      return this.parseAssignOrCall();
    }

    throw this.error(`Instruction inattendue : « ${t.value ?? t.type} ».`, t);
  }

  parseReturn() {
    const t = this.advance();
    if (this.isBlockBoundary()) {
      return { type: 'Return', expr: null, line: t.line, column: t.column };
    }
    const expr = this.parseExpression();
    return { type: 'Return', expr, line: t.line, column: t.column };
  }

  isBlockBoundary() {
    const t = this.peek();
    if (t.type === TT.EOF) return true;
    if (t.type === TT.KEYWORD && BLOCK_ENDERS.has(t.value)) return true;
    return false;
  }

  parseIf() {
    const openTok = this.advance();
    const condition = this.parseExpression();
    this.expect(TT.KEYWORD, 'Alors',
      `« Alors » attendu après la condition du « Si » (ligne ${openTok.line}).`);
    const then_ = this.parseBlock();
    let else_ = [];
    if (this.match(TT.KEYWORD, 'Sinon')) else_ = this.parseBlock();
    this.expect(TT.KEYWORD, 'FinSi',
      `« FinSi » attendu pour fermer le « Si » ouvert à la ligne ${openTok.line}.`);
    return {
      type: 'If', condition, then: then_, else: else_,
      line: openTok.line, column: openTok.column,
    };
  }

  parseWhile() {
    const openTok = this.advance();
    const condition = this.parseExpression();
    this.expect(TT.KEYWORD, 'Faire',
      `« Faire » attendu après la condition du « TantQue » (ligne ${openTok.line}).`);
    const body = this.parseBlock();
    this.expect(TT.KEYWORD, 'FinTantQue',
      `« FinTantQue » attendu pour fermer le « TantQue » ouvert à la ligne ${openTok.line}.`);
    return {
      type: 'While', condition, body,
      line: openTok.line, column: openTok.column,
    };
  }

  parseFor() {
    const openTok = this.advance();
    const varTok = this.expect(TT.IDENT, undefined,
      `Nom de variable attendu après « Pour ».`);
    this.expect(TT.KEYWORD, 'de',
      `« de » attendu après « Pour ${varTok.value} ».`);
    const from = this.parseExpression();
    this.expect(TT.KEYWORD, 'à',
      `« à » attendu après la borne inférieure.`);
    const to = this.parseExpression();
    this.expect(TT.KEYWORD, 'Faire',
      `« Faire » attendu après « Pour ${varTok.value} de … à … ».`);
    const body = this.parseBlock();
    this.expect(TT.KEYWORD, 'FinPour',
      `« FinPour » attendu pour fermer le « Pour » ouvert à la ligne ${openTok.line}.`);
    return {
      type: 'For', var: varTok.value, from, to, body,
      line: openTok.line, column: openTok.column,
    };
  }

  parseRepeat() {
    const openTok = this.advance();
    const body = this.parseBlock();
    this.expect(TT.KEYWORD, "Jusqu'à",
      `« Jusqu'à » attendu pour fermer le « Répéter » ouvert à la ligne ${openTok.line}.`);
    const until = this.parseExpression();
    return {
      type: 'Repeat', body, until,
      line: openTok.line, column: openTok.column,
    };
  }

  parseAssignOrCall() {
    const startTok = this.advance();
    const name = startTok.value;

    let target = name;
    if (this.check(TT.PUNCT, '[')) {
      this.advance();
      const index = this.parseExpression();
      this.expect(TT.PUNCT, ']',
        `« ] » attendu pour fermer l'accès à « ${name} ».`);
      target = { name, index };
    }

    if (this.check(TT.OP) && ASSIGN_OPS.has(this.peek().value)) {
      if (startTok.type === TT.BUILTIN) {
        throw this.error(
          `Impossible d'affecter à « ${name} » : c'est une primitive du langage.`,
          startTok
        );
      }
      this.advance();
      const expr = this.parseExpression();
      return {
        type: 'Assign', target, expr,
        line: startTok.line, column: startTok.column,
      };
    }

    if (target === name && this.check(TT.PUNCT, '(')) {
      this.advance();
      const args = [];
      if (!this.check(TT.PUNCT, ')')) {
        args.push(this.parseExpression());
        while (this.match(TT.PUNCT, ',')) {
          args.push(this.parseExpression());
        }
      }
      this.expect(TT.PUNCT, ')',
        `« ) » attendu pour fermer l'appel à « ${name} ».`);
      return {
        type: 'Call', name, args,
        line: startTok.line, column: startTok.column,
      };
    }

    throw this.error(
      `Après « ${name} », une affectation (←, <-, :=) ou un appel ( … ) est attendu.`,
      startTok
    );
  }

  parseExpression() { return this.parseOr(); }

  parseOr() {
    let left = this.parseAnd();
    while (this.check(TT.KEYWORD, 'ou')) {
      const op = this.advance().value;
      const right = this.parseAnd();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    while (this.check(TT.KEYWORD, 'et')) {
      const op = this.advance().value;
      const right = this.parseNot();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  parseNot() {
    const t = this.peek();
    if (t.type === TT.KEYWORD && t.value === 'non') {
      this.advance();
      const operand = this.parseNot();
      return {
        type: 'Unary', op: 'non', operand,
        line: t.line, column: t.column,
      };
    }
    return this.parseComparison();
  }

  parseComparison() {
    const left = this.parseArithmetic();
    if (this.check(TT.OP) && CMP_OPS.has(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseArithmetic();
      return { type: 'Binary', op, left, right };
    }
    return left;
  }

  parseArithmetic() {
    let left = this.parseTerm();
    while (this.check(TT.OP) && ADD_OPS.has(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseTerm();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  parseTerm() {
    let left = this.parseFactor();
    while (
      (this.check(TT.OP) && MUL_OPS.has(this.peek().value)) ||
      (this.check(TT.KEYWORD) && MUL_KEYWORDS.has(this.peek().value))
    ) {
      const op = this.advance().value;
      const right = this.parseFactor();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  parseFactor() {
    const t = this.peek();

    if (t.type === TT.PUNCT && t.value === '(') {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TT.PUNCT, ')',
        `« ) » attendu pour fermer la parenthèse ouverte ligne ${t.line}.`);
      return expr;
    }

    if (t.type === TT.OP && t.value === '-') {
      this.advance();
      const operand = this.parseFactor();
      return {
        type: 'Unary', op: '-', operand,
        line: t.line, column: t.column,
      };
    }

    if (t.type === TT.NUMBER) {
      this.advance();
      return {
        type: 'Literal',
        value: t.value.value,
        literalType: t.value.isReal ? 'réel' : 'entier',
        line: t.line, column: t.column,
      };
    }

    if (t.type === TT.STRING) {
      this.advance();
      return {
        type: 'Literal',
        value: t.value,
        literalType: 'chaine',
        line: t.line, column: t.column,
      };
    }

    if (t.type === TT.BOOL) {
      this.advance();
      return {
        type: 'Literal',
        value: t.value === 'vrai',
        literalType: 'booléen',
        line: t.line, column: t.column,
      };
    }

    if (t.type === TT.IDENT) {
      this.advance();
      // Appel de fonction en expression
      if (this.check(TT.PUNCT, '(')) {
        this.advance();
        const args = [];
        if (!this.check(TT.PUNCT, ')')) {
          args.push(this.parseExpression());
          while (this.match(TT.PUNCT, ',')) {
            args.push(this.parseExpression());
          }
        }
        this.expect(TT.PUNCT, ')',
          `« ) » attendu pour fermer l'appel à « ${t.value} ».`);
        return {
          type: 'CallExpr', name: t.value, args,
          line: t.line, column: t.column,
        };
      }
      if (this.check(TT.PUNCT, '[')) {
        this.advance();
        const index = this.parseExpression();
        this.expect(TT.PUNCT, ']',
          `« ] » attendu pour fermer l'accès à « ${t.value} ».`);
        return {
          type: 'ArrayAccess', name: t.value, index,
          line: t.line, column: t.column,
        };
      }
      return {
        type: 'Var', name: t.value,
        line: t.line, column: t.column,
      };
    }

    throw this.error(
      `Expression attendue, mais « ${t.value ?? t.type} » a été trouvé.`,
      t
    );
  }
}