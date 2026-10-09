// Primitives du langage : Ecrire, Lire. + formatage des valeurs.

import { RuntimeError } from './errors.js';

const MAX_ARRAY_DISPLAY = 20;

export function formatValue(v) {
  if (typeof v === 'boolean') return v ? 'vrai' : 'faux';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    return String(v).replace('.', ',');
  }
  if (v && typeof v === 'object' && v.__array) {
    const items = v.data.slice(0, MAX_ARRAY_DISPLAY).map(formatValue);
    if (v.data.length > MAX_ARRAY_DISPLAY) items.push('…');
    return `[${items.join(', ')}]`;
  }
  return String(v);
}

export function parseInput(raw, varType) {
  const s = String(raw).trim();
  switch (varType) {
    case 'entier': {
      const n = parseInt(s, 10);
      if (Number.isNaN(n)) throw new RuntimeError(`« ${s} » n'est pas un entier valide.`);
      return n;
    }
    case 'réel': {
      const cleaned = s.replace(',', '.');
      const n = parseFloat(cleaned);
      if (Number.isNaN(n)) throw new RuntimeError(`« ${s} » n'est pas un réel valide.`);
      return n;
    }
    case 'booléen': {
      const v = s.toLowerCase();
      if (['vrai', 'true', '1', 'oui'].includes(v)) return true;
      if (['faux', 'false', '0', 'non'].includes(v)) return false;
      throw new RuntimeError(`« ${s} » n'est pas un booléen (vrai / faux).`);
    }
    case 'caractère':
      if (s.length === 0) throw new RuntimeError(`Un caractère est attendu.`);
      return s[0];
    case 'chaine':
      return String(raw);
    default:
      return String(raw);
  }
}

export async function callBuiltin(name, argNodes, env, ctx) {
  if (name === 'Ecrire') {
    const parts = [];
    for (const node of argNodes) {
      // <-- ICI : on passe bien ctx en 3e argument.
      const v = await ctx.evalExpr(node, env, ctx);
      parts.push(formatValue(v));
    }
    ctx.emitOutput(parts.join(''));
    return null;
  }

  if (name === 'Lire') {
    for (const node of argNodes) {
      if (node.type === 'Var') {
        const varName = node.name;
        const varType = env.getType(varName);
        if (varType && typeof varType === 'object' && varType.kind === 'array') {
          throw new RuntimeError(
            `« ${varName} » est un tableau : précisez un indice (ex. Lire(${varName}[1])).`,
            node.line, node.column
          );
        }
        const raw = await ctx.requestInput(varName, varType);
        const parsed = parseInput(raw, varType);
        env.set(varName, parsed);
        ctx.resumeAfterWait();
      } else if (node.type === 'ArrayAccess') {
        const array = env.get(node.name);
        if (!array || !array.__array) {
          throw new RuntimeError(
            `« ${node.name} » n'est pas un tableau.`,
            node.line, node.column
          );
        }
        // <-- ICI aussi : ctx en 3e argument.
        const i = await ctx.evalExpr(node.index, env, ctx);
        if (typeof i !== 'number' || !Number.isInteger(i)) {
          throw new RuntimeError(
            `L'indice d'un tableau doit être entier.`,
            node.index.line ?? node.line, node.index.column ?? node.column
          );
        }
        if (i < array.from || i > array.to) {
          throw new RuntimeError(
            `Indice ${i} hors limites (tableau ${node.name}[${array.from}..${array.to}]).`,
            node.index.line ?? node.line, node.index.column ?? node.column
          );
        }
        const raw = await ctx.requestInput(`${node.name}[${i}]`, array.elementType);
        const parsed = parseInput(raw, array.elementType);
        array.data[i - array.from] = parsed;
        ctx.resumeAfterWait();
      } else {
        throw new RuntimeError(
          `L'argument de « Lire » doit être une variable ou un élément de tableau.`,
          node.line, node.column
        );
      }
    }
    return null;
  }

  throw new RuntimeError(`Fonction inconnue : « ${name} ».`);
}