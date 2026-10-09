// Distance d'édition (Levenshtein), utilisée pour les suggestions
// du type « Vouliez-vous dire "max" ? ».

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // suppression
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Cherche dans `candidates` les mots proches de `word`.
 * @param {string} word
 * @param {Iterable<string>} candidates
 * @param {{ maxDistance?: number }} [opts]
 * @returns {string|null} le meilleur candidat, ou null
 */
export function suggest(word, candidates, { maxDistance = 2 } = {}) {
  let best = null;
  let bestDist = Infinity;

  for (const c of candidates) {
    const d = levenshtein(word, c);
    if (d < bestDist && d <= maxDistance) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}