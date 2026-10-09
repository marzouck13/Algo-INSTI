// Point d'entrée unique pour exécuter du pseudo-code.
// L'UI n'appelle QUE cette fonction : elle ignore lexer / parser / checker / interpreter.

import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { check } from './checker.js';
import { execute } from './interpreter.js';
import { AlgoError } from './errors.js';

/**
 * Lance le pipeline complet : lex → parse → check → execute.
 *
 * @param {string} source
 * @param {object} [opts]
 * @param {(prompt:string, type:string)=>Promise<string>} [opts.onInput]
 * @param {(line:string)=>void} [opts.onOutput]
 * @param {number} [opts.maxInstructions]
 * @param {number} [opts.maxEffectiveMs]
 * @returns {Promise<{
 *   success: boolean,
 *   output: string[],
 *   variables: Array<{name:string, type:string, value:any}>,
 *   errors: Array<object>,
 *   instructionsExecuted: number,
 *   durationMs: number,
 * }>}
 */
export async function run(source, opts = {}) {
  const start = Date.now();

  // 1. Lexical
  let tokens;
  try {
    tokens = tokenize(source);
  } catch (e) {
    return failure(e, start);
  }

  // 2. Syntaxique
  let ast;
  try {
    ast = parse(tokens);
  } catch (e) {
    return failure(e, start);
  }

  // 3. Sémantique
  const semErrors = check(ast);
  if (semErrors.length > 0) {
    return {
      success: false,
      output: [],
      variables: [],
      errors: semErrors,
      instructionsExecuted: 0,
      durationMs: Date.now() - start,
    };
  }

  // 4. Exécution
  return await execute(ast, opts);
}

function failure(e, start) {
  const err = e instanceof AlgoError
    ? e.toJSON()
    : { type: 'unknown', line: 0, column: 0, message: String(e), hint: null };
  return {
    success: false,
    output: [],
    variables: [],
    errors: [err],
    instructionsExecuted: 0,
    durationMs: Date.now() - start,
  };
}