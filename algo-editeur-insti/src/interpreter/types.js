// Gestion des types de valeurs du pseudo-code.
// Types scalaires : entier | réel | booléen | caractère | chaine
// Type tableau : { kind: 'array', from, to, elementType }

export function isArrayType(t) {
  return typeof t === 'object' && t !== null && t.kind === 'array';
}

export function defaultFor(varType) {
  if (isArrayType(varType)) {
    const size = varType.to - varType.from + 1;
    const defaultElem = defaultFor(varType.elementType);
    return {
      __array: true,
      from: varType.from,
      to: varType.to,
      elementType: varType.elementType,
      data: new Array(size).fill(defaultElem),
    };
  }
  switch (varType) {
    case 'entier':    return 0;
    case 'réel':      return 0;
    case 'booléen':   return false;
    case 'caractère': return '';
    case 'chaine':    return '';
    default:          return null;
  }
}

export function isNumeric(t) {
  return t === 'entier' || t === 'réel';
}

export function isText(t) {
  return t === 'chaine' || t === 'caractère';
}

/**
 * Compatibilité d'affectation.
 *   - même type
 *   - entier → réel (élargissement)
 *   - chaine → caractère (restreint, longueur vérifiée à l'exécution)
 *   - caractère → chaine (élargissement)
 *   - jamais pour un tableau
 */
export function canAssign(targetType, valueType) {
  if (isArrayType(targetType) || isArrayType(valueType)) return false;
  if (targetType === valueType) return true;
  if (targetType === 'réel' && valueType === 'entier') return true;
  if (targetType === 'caractère' && valueType === 'chaine') return true;
  if (targetType === 'chaine' && valueType === 'caractère') return true;
  return false;
}

export function resultType(op, leftType, rightType) {
  if (isArrayType(leftType) || isArrayType(rightType)) return null;

  // Arithmétique
  if (op === '+' || op === '-' || op === '*' || op === '/') {
    // Concaténation de textes : chaine + chaine, caractère + chaine, etc.
    if (op === '+') {
      if (isText(leftType) && isText(rightType)) return 'chaine';
    }
    if (!isNumeric(leftType) || !isNumeric(rightType)) return null;
    if (op === '/') return 'réel';
    return leftType === 'réel' || rightType === 'réel' ? 'réel' : 'entier';
  }
  if (op === 'div' || op === 'mod') {
    if (leftType !== 'entier' || rightType !== 'entier') return null;
    return 'entier';
  }
  if (['=', '≠', '!=', '<', '>', '≤', '<=', '≥', '>='].includes(op)) {
    if (isNumeric(leftType) && isNumeric(rightType)) return 'booléen';
    if (isText(leftType) && isText(rightType)) return 'booléen';
    if (leftType === 'booléen' && rightType === 'booléen') return 'booléen';
    return null;
  }
  if (op === 'et' || op === 'ou') {
    if (leftType === 'booléen' && rightType === 'booléen') return 'booléen';
    return null;
  }
  return null;
}

export function typeLabel(t) {
  if (isArrayType(t)) {
    return `tableau [${t.from}..${t.to}] de ${typeLabel(t.elementType)}`;
  }
  switch (t) {
    case 'entier':    return 'entier';
    case 'réel':      return 'réel';
    case 'booléen':   return 'booléen';
    case 'caractère': return 'caractère';
    case 'chaine':    return 'chaîne';
    default:          return String(t);
  }
}

export function typeOfValue(v) {
  if (typeof v === 'boolean') return 'booléen';
  if (typeof v === 'string') return v.length <= 1 ? 'caractère' : 'chaine';
  if (typeof v === 'number') return Number.isInteger(v) ? 'entier' : 'réel';
  if (v && typeof v === 'object' && v.__array) return 'tableau';
  return 'inconnu';
}