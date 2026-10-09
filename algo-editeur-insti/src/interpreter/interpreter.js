// Interpréteur tree-walking sur l'AST. Async (à cause de Lire).
// Supporte fonctions, procédures, récursivité (profondeur max 1000).

import { RuntimeError } from './errors.js';
import { Environment } from './environment.js';
import { callBuiltin } from './builtins.js';

const DEFAULT_MAX_INSTRUCTIONS = 10_000_000;
const DEFAULT_MAX_EFFECTIVE_MS = 5_000;
const MAX_RECURSION_DEPTH = 1000;

class ReturnSignal {
  constructor(value) { this.value = value; }
}

export async function execute(ast, opts = {}) {
  const start = Date.now();

  const env = new Environment();
  for (const decl of ast.declarations) {
    const t = decl.array
      ? { kind: 'array', from: decl.array.from, to: decl.array.to, elementType: decl.array.elementType }
      : decl.varType;
    for (const name of decl.names) env.declare(name, t);
  }

  const functions = new Map();
  for (const fn of ast.functions ?? []) functions.set(fn.name, fn);

  const output = [];
  const ctx = {
    instructions: 0,
    maxInstructions: opts.maxInstructions ?? DEFAULT_MAX_INSTRUCTIONS,
    effectiveMs: 0,
    maxEffectiveMs: opts.maxEffectiveMs ?? DEFAULT_MAX_EFFECTIVE_MS,
    lastResume: Date.now(),
    onInput: opts.onInput ?? null,
    functions,
    callDepth: 0,
    emitOutput(line) { output.push(line); if (opts.onOutput) opts.onOutput(line); },
    evalExpr,
    resumeAfterWait() { ctx.lastResume = Date.now(); },
    async requestInput(name, type) {
      if (!ctx.onInput) {
        throw new RuntimeError(
          `Saisie demandée pour « ${name} » mais aucune entrée n'est disponible.`
        );
      }
      return await ctx.onInput(name, type);
    },
  };

  let success = true;
  const errors = [];

  try {
    for (const stmt of ast.body) await execNode(stmt, env, ctx);
  } catch (e) {
    success = false;
    errors.push({
      type: e.type ?? 'runtime',
      line: e.line ?? 0,
      column: e.column ?? 0,
      message: e.message ?? String(e),
      hint: e.hint ?? null,
    });
  }

  return {
    success,
    output,
    variables: env.entries(),
    errors,
    instructionsExecuted: ctx.instructions,
    durationMs: Date.now() - start,
  };
}

function checkLimits(ctx) {
  const now = Date.now();
  ctx.effectiveMs += now - ctx.lastResume;
  ctx.lastResume = now;

  if (ctx.instructions > ctx.maxInstructions) {
    throw new RuntimeError(
      `Boucle probablement infinie (limite d'instructions atteinte : ${ctx.maxInstructions}).`
    );
  }
  if (ctx.effectiveMs > ctx.maxEffectiveMs) {
    throw new RuntimeError(
      `Exécution trop longue (timeout ${ctx.maxEffectiveMs} ms de temps effectif).`
    );
  }
}

async function execBlock(stmts, env, ctx) {
  for (const s of stmts) await execNode(s, env, ctx);
}

async function execNode(node, env, ctx) {
  ctx.instructions++;
  checkLimits(ctx);

  switch (node.type) {
    case 'Assign': {
      const value = await evalExpr(node.expr, env, ctx);
      const target = node.target;
      if (typeof target === 'string') {
        const targetType = env.getType(target);
        if (targetType === 'caractère' && typeof value === 'string' && value.length > 1) {
          throw new RuntimeError(
            `Impossible d'affecter « ${value} » (${value.length} caractères) à « ${target} » (caractère).`,
            node.line, node.column
          );
        }
        env.set(target, value);
      } else {
        await assignToArray(target, value, env, ctx);
      }
      return;
    }

    case 'If': {
      const cond = await evalExpr(node.condition, env, ctx);
      if (cond) await execBlock(node.then, env, ctx);
      else await execBlock(node.else, env, ctx);
      return;
    }

    case 'While': {
      while (await evalExpr(node.condition, env, ctx)) {
        await execBlock(node.body, env, ctx);
        checkLimits(ctx);
      }
      return;
    }

    case 'Repeat': {
      do {
        await execBlock(node.body, env, ctx);
        checkLimits(ctx);
      } while (!(await evalExpr(node.until, env, ctx)));
      return;
    }

    case 'For': {
      const from = await evalExpr(node.from, env, ctx);
      const to = await evalExpr(node.to, env, ctx);
      if (typeof from !== 'number' || typeof to !== 'number') {
        throw new RuntimeError(
          `Les bornes du « Pour » doivent être numériques.`,
          node.line, node.column
        );
      }
      if (!env.has(node.var)) env.declare(node.var, 'entier');
      for (let i = from; i <= to; i++) {
        env.set(node.var, i);
        await execBlock(node.body, env, ctx);
        checkLimits(ctx);
      }
      return;
    }

    case 'Return': {
      const value = node.expr ? await evalExpr(node.expr, env, ctx) : null;
      throw new ReturnSignal(value);
    }

    case 'Call':
      await execCallStatement(node, env, ctx);
      return;

    default:
      throw new RuntimeError(
        `Instruction inconnue à l'exécution : « ${node.type} ».`,
        node.line ?? 0, node.column ?? 0
      );
  }
}

async function execCallStatement(node, env, ctx) {
  if (node.name === 'Ecrire' || node.name === 'Lire') {
    await callBuiltin(node.name, node.args, env, ctx);
    return;
  }
  await invokeUserFunction(node.name, node.args, env, ctx);
}

async function invokeUserFunction(name, argNodes, env, ctx) {
  const fn = ctx.functions.get(name);
  if (!fn) {
    throw new RuntimeError(`Sous-programme inconnu : « ${name} ».`);
  }

  if (ctx.callDepth >= MAX_RECURSION_DEPTH) {
    throw new RuntimeError(
      `Profondeur de récursion maximale atteinte (${MAX_RECURSION_DEPTH}).`,
      fn.line, fn.column
    );
  }

  const argValues = [];
  for (const arg of argNodes) {
    argValues.push(await evalExpr(arg, env, ctx));
  }

  const fnEnv = new Environment(null);

  for (let i = 0; i < fn.params.length; i++) {
    const p = fn.params[i];
    fnEnv.declare(p.name, p.paramType);
    fnEnv.set(p.name, argValues[i]);
  }

  for (const decl of fn.declarations) {
    const t = decl.array
      ? { kind: 'array', from: decl.array.from, to: decl.array.to, elementType: decl.array.elementType }
      : decl.varType;
    for (const n of decl.names) fnEnv.declare(n, t);
  }

  ctx.callDepth++;
  try {
    try {
      for (const stmt of fn.body) await execNode(stmt, fnEnv, ctx);
    } catch (e) {
      if (e instanceof ReturnSignal) {
        return e.value;
      }
      throw e;
    }
    if (!fn.isProcedure) {
      throw new RuntimeError(
        `La fonction « ${name} » n'a pas retourné de valeur.`,
        fn.line, fn.column
      );
    }
    return null;
  } finally {
    ctx.callDepth--;
  }
}

async function assignToArray(target, value, env, ctx) {
  const { name, index } = target;
  const array = env.get(name);
  if (!array || !array.__array) {
    throw new RuntimeError(
      `« ${name} » n'est pas un tableau.`,
      target.line ?? 0, target.column ?? 0
    );
  }
  const i = await evalExpr(index, env, ctx);
  if (typeof i !== 'number' || !Number.isInteger(i)) {
    throw new RuntimeError(
      `L'indice d'un tableau doit être entier.`,
      index.line ?? 0, index.column ?? 0
    );
  }
  if (i < array.from || i > array.to) {
    throw new RuntimeError(
      `Indice ${i} hors limites (tableau ${name}[${array.from}..${array.to}]).`,
      index.line ?? 0, index.column ?? 0
    );
  }
  if (array.elementType === 'caractère' && typeof value === 'string' && value.length > 1) {
    throw new RuntimeError(
      `Impossible d'affecter « ${value} » (${value.length} caractères) à ${name}[…] (caractère).`,
      target.line ?? 0, target.column ?? 0
    );
  }
  array.data[i - array.from] = value;
}

async function evalExpr(node, env, ctx) {
  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Var': {
      if (!env.has(node.name)) {
        throw new RuntimeError(
          `« ${node.name} » n'est pas déclarée.`,
          node.line, node.column
        );
      }
      return env.get(node.name);
    }

    case 'ArrayAccess': {
      if (!env.has(node.name)) {
        throw new RuntimeError(
          `« ${node.name} » n'est pas déclarée.`,
          node.line, node.column
        );
      }
      const array = env.get(node.name);
      if (!array || !array.__array) {
        throw new RuntimeError(
          `« ${node.name} » n'est pas un tableau.`,
          node.line, node.column
        );
      }
      const i = await evalExpr(node.index, env, ctx);
      if (typeof i !== 'number' || !Number.isInteger(i)) {
        throw new RuntimeError(
          `L'indice d'un tableau doit être entier.`,
          node.index.line ?? node.line,
          node.index.column ?? node.column
        );
      }
      if (i < array.from || i > array.to) {
        throw new RuntimeError(
          `Indice ${i} hors limites (tableau ${node.name}[${array.from}..${array.to}]).`,
          node.index.line ?? node.line,
          node.index.column ?? node.column
        );
      }
      return array.data[i - array.from];
    }

    case 'CallExpr': {
      return await invokeUserFunction(node.name, node.args, env, ctx);
    }

    case 'Binary': {
      const l = await evalExpr(node.left, env, ctx);
      const r = await evalExpr(node.right, env, ctx);
      return applyBinary(node.op, l, r, node);
    }

    case 'Unary': {
      const v = await evalExpr(node.operand, env, ctx);
      if (node.op === '-') return -v;
      if (node.op === 'non') return !v;
      throw new RuntimeError(
        `Opérateur unaire inconnu : « ${node.op} ».`,
        node.line, node.column
      );
    }

    default:
      throw new RuntimeError(
        `Expression inconnue : « ${node.type} ».`,
        node.line ?? 0, node.column ?? 0
      );
  }
}

function applyBinary(op, l, r, node) {
  switch (op) {
    case '+': {
      const lIsStr = typeof l === 'string';
      const rIsStr = typeof r === 'string';
      if (lIsStr !== rIsStr) {
        throw new RuntimeError(
          `L'opérateur « + » exige deux nombres ou deux chaînes.`,
          node.left.line ?? 0, node.left.column ?? 0
        );
      }
      return l + r;
    }
    case '-': return l - r;
    case '*': return l * r;
    case '/':
      if (r === 0) throw new RuntimeError(`Division par zéro.`, node.left.line ?? 0, node.left.column ?? 0);
      return l / r;
    case 'div':
      if (r === 0) throw new RuntimeError(`Division par zéro.`, node.left.line ?? 0, node.left.column ?? 0);
      return Math.trunc(l / r);
    case 'mod':
      if (r === 0) throw new RuntimeError(`Division par zéro.`, node.left.line ?? 0, node.left.column ?? 0);
      return l % r;

    case '=':  return l === r;
    case '≠':
    case '!=': return l !== r;
    case '<':  return l < r;
    case '>':  return l > r;
    case '≤':
    case '<=': return l <= r;
    case '≥':
    case '>=': return l >= r;

    case 'et': return Boolean(l) && Boolean(r);
    case 'ou': return Boolean(l) || Boolean(r);

    default:
      throw new RuntimeError(
        `Opérateur binaire inconnu : « ${op} ».`,
        node.left.line ?? 0, node.left.column ?? 0
      );
  }
}