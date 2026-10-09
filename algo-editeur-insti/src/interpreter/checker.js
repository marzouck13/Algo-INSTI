// Vérification sémantique : s'exécute APRÈS le parsing et AVANT l'interprétation.
// Supporte fonctions et procédures.

import { SemanticError } from './errors.js';
import {
  canAssign, resultType, typeLabel, isNumeric, isArrayType,
} from './types.js';
import { suggest } from '../utils/levenshtein.js';

export function check(ast) {
  const ctx = {
    errors: [],
    scopes: [new Map()],
    functions: new Map(),
    currentFunction: null,
  };

  // 1. Collecter les signatures de tous les sous-programmes
  for (const fn of ast.functions ?? []) {
    if (ctx.functions.has(fn.name)) {
      ctx.errors.push(new SemanticError(
        `Sous-programme « ${fn.name} » déclaré deux fois.`,
        fn.line, fn.column
      ));
      continue;
    }
    ctx.functions.set(fn.name, {
      params: fn.params,
      returnType: fn.returnType,
      isProcedure: fn.isProcedure,
    });
  }

  // 2. Déclarations du programme principal
  for (const decl of ast.declarations) {
    declareNames(decl, ctx, ctx.scopes[0]);
  }

  // 3. Corps du programme principal
  for (const stmt of ast.body) checkStmt(stmt, ctx);

  // 4. Chaque sous-programme en isolation
  for (const fn of ast.functions ?? []) {
    checkFunctionBody(fn, ctx);
  }

  return ctx.errors;
}

// --- Portées ---------------------------------------------------------------

function pushScope(ctx) { ctx.scopes.push(new Map()); }
function popScope(ctx) { ctx.scopes.pop(); }

function lookupType(ctx, name) {
  for (let i = ctx.scopes.length - 1; i >= 0; i--) {
    if (ctx.scopes[i].has(name)) return ctx.scopes[i].get(name);
  }
  return null;
}

function allDeclaredNames(ctx) {
  const names = new Set();
  for (const scope of ctx.scopes) for (const n of scope.keys()) names.add(n);
  return names;
}

function declareNames(decl, ctx, scope) {
  const t = decl.array
    ? { kind: 'array', from: decl.array.from, to: decl.array.to, elementType: decl.array.elementType }
    : decl.varType;
  for (const name of decl.names) {
    if (scope.has(name)) {
      ctx.errors.push(new SemanticError(
        `Variable « ${name} » déclarée deux fois.`,
        decl.line, decl.column
      ));
    } else {
      scope.set(name, t);
    }
  }
}

// --- Sous-programmes -------------------------------------------------------

function checkFunctionBody(fn, ctx) {
  const savedScopes = ctx.scopes;
  const savedCurrent = ctx.currentFunction;

  ctx.scopes = [new Map()];
  ctx.currentFunction = {
    name: fn.name,
    returnType: fn.returnType,
    isProcedure: fn.isProcedure,
  };

  for (const p of fn.params) {
    if (ctx.scopes[0].has(p.name)) {
      ctx.errors.push(new SemanticError(
        `Paramètre « ${p.name} » déclaré deux fois dans « ${fn.name} ».`,
        p.line, p.column
      ));
    } else {
      ctx.scopes[0].set(p.name, p.paramType);
    }
  }

  for (const decl of fn.declarations) {
    declareNames(decl, ctx, ctx.scopes[0]);
  }

  for (const stmt of fn.body) checkStmt(stmt, ctx);

  ctx.scopes = savedScopes;
  ctx.currentFunction = savedCurrent;
}

// --- Instructions ----------------------------------------------------------

function checkStmt(node, ctx) {
  switch (node.type) {
    case 'Assign': return checkAssign(node, ctx);
    case 'If':     return checkIf(node, ctx);
    case 'While':  return checkWhile(node, ctx);
    case 'For':    return checkFor(node, ctx);
    case 'Repeat': return checkRepeat(node, ctx);
    case 'Return': return checkReturn(node, ctx);
    case 'Call':   return checkCallStatement(node, ctx);
    default:
      ctx.errors.push(new SemanticError(
        `Instruction inconnue : « ${node.type} ».`,
        node.line ?? 0, node.column ?? 0
      ));
  }
}

function checkReturn(node, ctx) {
  const fn = ctx.currentFunction;
  if (!fn) {
    ctx.errors.push(new SemanticError(
      `« Retourner » n'est autorisé que dans une fonction ou une procédure.`,
      node.line, node.column
    ));
    return;
  }
  if (fn.isProcedure) {
    if (node.expr !== null) {
      ctx.errors.push(new SemanticError(
        `Une procédure ne peut pas retourner de valeur.`,
        node.line, node.column
      ));
      if (node.expr) infer(node.expr, ctx);
    }
    return;
  }
  if (node.expr === null) {
    ctx.errors.push(new SemanticError(
      `« Retourner » dans la fonction « ${fn.name} » doit être suivi d'une expression.`,
      node.line, node.column
    ));
    return;
  }
  const t = infer(node.expr, ctx);
  if (t === null) return;
  if (!canAssign(fn.returnType, t)) {
    ctx.errors.push(new SemanticError(
      `Impossible de retourner une valeur de type ${typeLabel(t)} : la fonction « ${fn.name} » retourne ${typeLabel(fn.returnType)}.`,
      node.line, node.column
    ));
  }
}

function checkAssign(node, ctx) {
  const valueType = infer(node.expr, ctx);
  if (valueType === null) return;

  if (typeof node.target === 'object' && node.target !== null) {
    checkArrayWrite(node.target, valueType, ctx, node);
    return;
  }

  const targetType = lookupType(ctx, node.target);
  if (targetType === null) {
    ctx.errors.push(new SemanticError(
      `« ${node.target} » n'est pas déclarée.`,
      node.line, node.column,
      buildSuggestion(node.target, ctx)
    ));
    return;
  }
  if (isArrayType(targetType)) {
    ctx.errors.push(new SemanticError(
      `« ${node.target} » est un tableau : précisez un indice (ex. ${node.target}[1] ← …).`,
      node.line, node.column
    ));
    return;
  }
  if (!canAssign(targetType, valueType)) {
    ctx.errors.push(new SemanticError(
      `Impossible d'affecter une valeur de type ${typeLabel(valueType)} à « ${node.target} » (${typeLabel(targetType)}).`,
      node.line, node.column
    ));
  }
}

function checkArrayWrite(target, valueType, ctx, node) {
  const { name, index } = target;
  const t = lookupType(ctx, name);
  if (t === null) {
    ctx.errors.push(new SemanticError(
      `« ${name} » n'est pas déclarée.`,
      node.line, node.column,
      buildSuggestion(name, ctx)
    ));
    return;
  }
  if (!isArrayType(t)) {
    ctx.errors.push(new SemanticError(
      `« ${name} » n'est pas un tableau : impossible d'écrire ${name}[…].`,
      node.line, node.column
    ));
    return;
  }
  const idxType = infer(index, ctx);
  if (idxType === null) return;
  if (idxType !== 'entier') {
    ctx.errors.push(new SemanticError(
      `L'indice d'un tableau doit être entier (type trouvé : ${typeLabel(idxType)}).`,
      index.line ?? node.line, index.column ?? node.column
    ));
    return;
  }
  if (index.type === 'Literal' && typeof index.value === 'number') {
    const i = index.value;
    if (i < t.from || i > t.to) {
      ctx.errors.push(new SemanticError(
        `Indice ${i} hors limites (tableau ${name}[${t.from}..${t.to}]).`,
        index.line ?? node.line, index.column ?? node.column
      ));
      return;
    }
  }
  if (!canAssign(t.elementType, valueType)) {
    ctx.errors.push(new SemanticError(
      `Impossible d'affecter une valeur de type ${typeLabel(valueType)} à ${name}[…] (${typeLabel(t.elementType)}).`,
      node.line, node.column
    ));
  }
}

function checkIf(node, ctx) {
  const condType = infer(node.condition, ctx);
  if (condType !== null && condType !== 'booléen') {
    ctx.errors.push(new SemanticError(
      `La condition du « Si » doit être booléenne (type trouvé : ${typeLabel(condType)}).`,
      node.condition.line ?? node.line,
      node.condition.column ?? node.column
    ));
  }
  for (const s of node.then) checkStmt(s, ctx);
  for (const s of node.else) checkStmt(s, ctx);
}

function checkWhile(node, ctx) {
  const condType = infer(node.condition, ctx);
  if (condType !== null && condType !== 'booléen') {
    ctx.errors.push(new SemanticError(
      `La condition du « TantQue » doit être booléenne (type trouvé : ${typeLabel(condType)}).`,
      node.condition.line ?? node.line,
      node.condition.column ?? node.column
    ));
  }
  for (const s of node.body) checkStmt(s, ctx);
}

function checkFor(node, ctx) {
  const fromType = infer(node.from, ctx);
  const toType = infer(node.to, ctx);
  if (fromType !== null && fromType !== 'entier') {
    ctx.errors.push(new SemanticError(
      `La borne inférieure du « Pour » doit être entière (type trouvé : ${typeLabel(fromType)}).`,
      node.from.line ?? node.line, node.from.column ?? node.column
    ));
  }
  if (toType !== null && toType !== 'entier') {
    ctx.errors.push(new SemanticError(
      `La borne supérieure du « Pour » doit être entière (type trouvé : ${typeLabel(toType)}).`,
      node.to.line ?? node.line, node.to.column ?? node.column
    ));
  }
  pushScope(ctx);
  ctx.scopes[ctx.scopes.length - 1].set(node.var, 'entier');
  for (const s of node.body) checkStmt(s, ctx);
  popScope(ctx);
}

function checkRepeat(node, ctx) {
  for (const s of node.body) checkStmt(s, ctx);
  const condType = infer(node.until, ctx);
  if (condType !== null && condType !== 'booléen') {
    ctx.errors.push(new SemanticError(
      `La condition du « Répéter … Jusqu'à » doit être booléenne (type trouvé : ${typeLabel(condType)}).`,
      node.until.line ?? node.line, node.until.column ?? node.column
    ));
  }
}

function checkCallStatement(node, ctx) {
  // --- Builtins ---
  if (node.name === 'Ecrire') {
    for (const arg of node.args) {
      if (arg.type === 'Var') {
        const t = lookupType(ctx, arg.name);
        if (t === null) {
          ctx.errors.push(new SemanticError(
            `« ${arg.name} » n'est pas déclarée.`,
            arg.line ?? node.line, arg.column ?? node.column,
            buildSuggestion(arg.name, ctx)
          ));
        }
        continue;
      }
      infer(arg, ctx);
    }
    return;
  }
  if (node.name === 'Lire') {
    for (const arg of node.args) {
      if (arg.type === 'Var') {
        const t = lookupType(ctx, arg.name);
        if (t === null) {
          ctx.errors.push(new SemanticError(
            `« ${arg.name} » n'est pas déclarée.`,
            arg.line ?? node.line, arg.column ?? node.column,
            buildSuggestion(arg.name, ctx)
          ));
        } else if (isArrayType(t)) {
          ctx.errors.push(new SemanticError(
            `« ${arg.name} » est un tableau : précisez un indice (ex. Lire(${arg.name}[1])).`,
            arg.line ?? node.line, arg.column ?? node.column
          ));
        }
      } else if (arg.type === 'ArrayAccess') {
        infer(arg, ctx);
      } else {
        ctx.errors.push(new SemanticError(
          `L'argument de « Lire » doit être une variable ou un élément de tableau.`,
          arg.line ?? node.line, arg.column ?? node.column
        ));
      }
    }
    return;
  }

  // --- Sous-programme utilisateur (fonction OU procédure) ---
  const sig = ctx.functions.get(node.name);
  if (!sig) {
    ctx.errors.push(new SemanticError(
      `Sous-programme inconnu : « ${node.name} ».`,
      node.line, node.column,
      buildSuggestion(node.name, ctx)
    ));
    for (const a of node.args) infer(a, ctx);
    return;
  }
  validateCallArgs(node, sig, ctx);
}

function validateCallArgs(node, sig, ctx) {
  if (node.args.length !== sig.params.length) {
    ctx.errors.push(new SemanticError(
      `« ${node.name} » attend ${sig.params.length} argument(s), ${node.args.length} fourni(s).`,
      node.line, node.column
    ));
    return;
  }
  for (let i = 0; i < node.args.length; i++) {
    const arg = node.args[i];
    const p = sig.params[i];
    const t = infer(arg, ctx);
    if (t === null) continue;
    if (!canAssign(p.paramType, t)) {
      ctx.errors.push(new SemanticError(
        `Argument ${i + 1} de « ${node.name} » : ${typeLabel(t)} fourni, ${typeLabel(p.paramType)} attendu.`,
        arg.line ?? node.line, arg.column ?? node.column
      ));
    }
  }
}

// --- Expressions -----------------------------------------------------------

function infer(node, ctx) {
  switch (node.type) {
    case 'Literal':
      return node.literalType;

    case 'Var': {
      const t = lookupType(ctx, node.name);
      if (t === null) {
        ctx.errors.push(new SemanticError(
          `« ${node.name} » n'est pas déclarée.`,
          node.line, node.column,
          buildSuggestion(node.name, ctx)
        ));
        return null;
      }
      if (isArrayType(t)) {
        ctx.errors.push(new SemanticError(
          `« ${node.name} » est un tableau : précisez un indice (ex. ${node.name}[1]).`,
          node.line, node.column
        ));
        return null;
      }
      return t;
    }

    case 'ArrayAccess': {
      const t = lookupType(ctx, node.name);
      if (t === null) {
        ctx.errors.push(new SemanticError(
          `« ${node.name} » n'est pas déclarée.`,
          node.line, node.column,
          buildSuggestion(node.name, ctx)
        ));
        return null;
      }
      if (!isArrayType(t)) {
        ctx.errors.push(new SemanticError(
          `« ${node.name} » n'est pas un tableau : impossible de lire ${node.name}[…].`,
          node.line, node.column
        ));
        return null;
      }
      const idxType = infer(node.index, ctx);
      if (idxType === null) return null;
      if (idxType !== 'entier') {
        ctx.errors.push(new SemanticError(
          `L'indice d'un tableau doit être entier (type trouvé : ${typeLabel(idxType)}).`,
          node.index.line ?? node.line, node.index.column ?? node.column
        ));
        return null;
      }
      if (node.index.type === 'Literal' && typeof node.index.value === 'number') {
        const i = node.index.value;
        if (i < t.from || i > t.to) {
          ctx.errors.push(new SemanticError(
            `Indice ${i} hors limites (tableau ${node.name}[${t.from}..${t.to}]).`,
            node.index.line ?? node.line, node.index.column ?? node.column
          ));
          return null;
        }
      }
      return t.elementType;
    }

    case 'CallExpr': {
      const sig = ctx.functions.get(node.name);
      if (!sig) {
        ctx.errors.push(new SemanticError(
          `Fonction inconnue : « ${node.name} ».`,
          node.line, node.column,
          buildSuggestion(node.name, ctx)
        ));
        for (const a of node.args) infer(a, ctx);
        return null;
      }
      if (sig.isProcedure) {
        ctx.errors.push(new SemanticError(
          `« ${node.name} » est une procédure : elle ne peut pas être utilisée dans une expression.`,
          node.line, node.column
        ));
        for (const a of node.args) infer(a, ctx);
        return null;
      }
      validateCallArgs(node, sig, ctx);
      return sig.returnType;
    }

    case 'Binary': {
      const lt = infer(node.left, ctx);
      const rt = infer(node.right, ctx);
      if (lt === null || rt === null) return null;
      const r = resultType(node.op, lt, rt);
      if (r === null) {
        ctx.errors.push(new SemanticError(
          `Opération « ${node.op} » impossible entre ${typeLabel(lt)} et ${typeLabel(rt)}.`,
          node.left.line ?? 0, node.left.column ?? 0
        ));
        return null;
      }
      return r;
    }

    case 'Unary': {
      const t = infer(node.operand, ctx);
      if (t === null) return null;
      if (node.op === '-') {
        if (!isNumeric(t)) {
          ctx.errors.push(new SemanticError(
            `L'opérateur « - » unaire exige un nombre (type trouvé : ${typeLabel(t)}).`,
            node.line, node.column
          ));
          return null;
        }
        return t;
      }
      if (node.op === 'non') {
        if (t !== 'booléen') {
          ctx.errors.push(new SemanticError(
            `« non » exige une valeur booléenne (type trouvé : ${typeLabel(t)}).`,
            node.line, node.column
          ));
          return null;
        }
        return 'booléen';
      }
      return null;
    }

    default:
      return null;
  }
}

function buildSuggestion(name, ctx) {
  const candidates = allDeclaredNames(ctx);
  for (const fnName of ctx.functions.keys()) candidates.add(fnName);
  const s = suggest(name, candidates, { maxDistance: 2 });
  return s ? `Vouliez-vous dire « ${s} » ?` : null;
}