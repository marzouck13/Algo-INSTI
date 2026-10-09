// Environnement d'exécution : variables + portées.
// Supporte les scalaires et les tableaux (valeur { __array: true, ... }).

import { defaultFor, isArrayType } from './types.js';

export class Environment {
  constructor(parent = null) {
    this.vars = new Map();   // name -> value
    this.types = new Map();  // name -> declared type (string | arrayType)
    this.parent = parent;
  }

  /** Déclare une variable (idempotent : n'écrase pas si déjà là). */
  declare(name, varType) {
    if (!this.vars.has(name)) {
      this.vars.set(name, defaultFor(varType));
      this.types.set(name, varType);
    }
  }

  has(name) {
    return this.vars.has(name) || (this.parent?.has(name) ?? false);
  }

  getType(name) {
    if (this.types.has(name)) return this.types.get(name);
    return this.parent?.getType(name) ?? null;
  }

  get(name) {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    throw new ReferenceError(`Variable non déclarée : ${name}`);
  }

  set(name, value) {
    if (this.vars.has(name)) {
      this.vars.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.set(name, value);
      return;
    }
    throw new ReferenceError(`Variable non déclarée : ${name}`);
  }

  /** Liste { name, type, value } de toutes les variables accessibles. */
  entries() {
    const result = [];
    if (this.parent) result.push(...this.parent.entries());
    for (const [name, value] of this.vars) {
      const t = this.types.get(name);
      result.push({
        name,
        type: isArrayType(t) ? 'tableau' : t,
        rawType: t, // type complet (objet ou chaîne)
        value,
      });
    }
    return result;
  }
}