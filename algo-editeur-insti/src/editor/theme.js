// Thèmes CodeMirror pour l'éditeur.
// Deux palettes : claire (GitHub Light) et sombre (VS Code Dark+).

import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { builtinTag, booleanTag } from './pseudo-language.js';

// --- Palettes --------------------------------------------------------------

const LIGHT = {
  bg: '#ffffff',
  fg: '#1f2328',
  gutterFg: '#8a8f98',
  gutterBg: '#f7f7f9',
  activeLine: '#f1f3f5',
  selection: '#cce4ff',
  cursor: '#1f2328',
  border: '#e3e5e8',
  searchMatch: '#ffe066',
  searchMatchSelected: '#ffd43b',
  selectionMatch: '#b8e0ff',
  tooltipBg: '#ffffff',
  autocompleteSelected: '#cce4ff',
  foldText: '#888',
};

const DARK = {
  bg: '#1e1e1e',
  fg: '#d4d4d4',
  gutterFg: '#858585',
  gutterBg: '#1e1e1e',
  activeLine: '#2a2a2a',
  selection: '#264f78',
  cursor: '#aeafad',
  border: '#3c3c3c',
  searchMatch: '#515c6a',
  searchMatchSelected: '#6199ff2f',
  selectionMatch: '#3a3d41',
  tooltipBg: '#252526',
  autocompleteSelected: '#04395e',
  foldText: '#ddd',
};

function buildTheme(p) {
  return EditorView.theme(
    {
      '&': {
        color: p.fg,
        backgroundColor: p.bg,
        fontSize: '15px',
        height: '100%',
      },
      '.cm-content': {
        caretColor: p.cursor,
        padding: '12px 0',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
      },
      '.cm-scroller': { lineHeight: '1.55' },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: p.cursor,
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: p.selection,
      },
      '.cm-panels': { backgroundColor: p.bg, color: p.fg },
      '.cm-panels.cm-panels-top': { borderBottom: `1px solid ${p.border}` },
      '.cm-panels.cm-panels-bottom': { borderTop: `1px solid ${p.border}` },
      '.cm-searchMatch': {
        backgroundColor: p.searchMatch,
        outline: `1px solid ${p.border}`,
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: p.searchMatchSelected,
      },
      '.cm-activeLine': { backgroundColor: p.activeLine },
      '.cm-selectionMatch': { backgroundColor: p.selectionMatch },
      '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
        backgroundColor: p.selectionMatch,
        outline: '1px solid #888',
      },
      '.cm-gutters': {
        backgroundColor: p.gutterBg,
        color: p.gutterFg,
        border: 'none',
        borderRight: `1px solid ${p.border}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: p.activeLine,
        color: p.fg,
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'transparent',
        border: 'none',
        color: p.foldText,
      },
      '.cm-tooltip': {
        border: `1px solid ${p.border}`,
        backgroundColor: p.tooltipBg,
        color: p.fg,
      },
      '.cm-tooltip .cm-tooltip-arrow:before': {
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
      },
      '.cm-tooltip .cm-tooltip-arrow:after': {
        borderTopColor: p.tooltipBg,
        borderBottomColor: p.tooltipBg,
      },
      '.cm-tooltip-autocomplete': {
        '& > ul > li[aria-selected]': {
          backgroundColor: p.autocompleteSelected,
          color: p.fg,
        },
      },
    },
    { dark: p === DARK }
  );
}

// --- Styles de coloration --------------------------------------------------

export const lightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword,        color: '#cf222e' },  // Algorithme, Début, Fonction, Variables
  { tag: t.controlKeyword, color: '#8250df' },  // Si, FinSi, Retourner, Jusqu'à
  { tag: t.typeName,       color: '#1f883d' },  // entier, chaine
  { tag: t.number,         color: '#0550ae' },  // 42, 3.14
  { tag: t.string,         color: '#0a3069' },  // "bonjour"
  { tag: t.comment,        color: '#6e7781', fontStyle: 'italic' },
  { tag: t.operator,       color: '#cf222e' },  // + - * / ←
  { tag: t.variableName,   color: '#1f2328' },  // x, maximum
  { tag: t.atom,           color: '#0550ae' },
  { tag: t.punctuation,    color: '#24292f' },
  { tag: t.bracket,        color: '#24292f' },
  { tag: builtinTag,       color: '#953800' },  // Ecrire, Lire
  { tag: booleanTag,       color: '#0550ae' },  // vrai, faux
]);

export const darkHighlightStyle = HighlightStyle.define([
  { tag: t.keyword,        color: '#569cd6' },
  { tag: t.controlKeyword, color: '#c586c0' },
  { tag: t.typeName,       color: '#4ec9b0' },
  { tag: t.number,         color: '#b5cea8' },
  { tag: t.string,         color: '#ce9178' },
  { tag: t.comment,        color: '#6a9955', fontStyle: 'italic' },
  { tag: t.operator,       color: '#d4d4d4' },
  { tag: t.variableName,   color: '#9cdcfe' },
  { tag: t.atom,           color: '#569cd6' },
  { tag: t.punctuation,    color: '#d4d4d4' },
  { tag: t.bracket,        color: '#d4d4d4' },
  { tag: builtinTag,       color: '#dcdcaa' },
  { tag: booleanTag,       color: '#569cd6' },
]);

// --- Extensions prêtes à l'emploi ------------------------------------------

export const lightEditorTheme = buildTheme(LIGHT);
export const darkEditorTheme = buildTheme(DARK);

export const lightEditorExtensions = [
  lightEditorTheme,
  syntaxHighlighting(lightHighlightStyle),
];

export const darkEditorExtensions = [
  darkEditorTheme,
  syntaxHighlighting(darkHighlightStyle),
];