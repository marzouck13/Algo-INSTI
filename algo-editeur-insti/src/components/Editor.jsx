import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  keymap,
} from '@codemirror/view';
import {
  history,
  defaultKeymap,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  indentOnInput,
} from '@codemirror/language';
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
} from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';

import {
  pseudoLanguage,
  pseudoIndent,
  pseudoIndentUnit,
  pseudoCompletions,
} from '../editor/pseudo-language.js';
import {
  lightEditorExtensions,
  darkEditorExtensions,
} from '../editor/theme.js';

const themeCompartment = new Compartment();

export default function Editor({ value = '', onChange, focusTarget, theme = 'light' }) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!hostRef.current) return;

    const initialTheme = theme === 'dark' ? darkEditorExtensions : lightEditorExtensions;

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion({ override: [pseudoCompletions] }),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap,
        indentWithTab,
      ]),
      pseudoLanguage,
      pseudoIndentUnit,
      pseudoIndent,
      themeCompartment.of(initialTheme),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChangeRef.current) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
    ];

    const state = EditorState.create({ doc: value, extensions });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconfigure le thème à chaud
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.reconfigure(
        theme === 'dark' ? darkEditorExtensions : lightEditorExtensions
      ),
    });
  }, [theme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    if (!focusTarget || !focusTarget.line) return;
    const view = viewRef.current;
    if (!view) return;
    const totalLines = view.state.doc.lines;
    const target = Math.max(1, Math.min(focusTarget.line, totalLines));
    const line = view.state.doc.line(target);
    view.dispatch({
      selection: { anchor: line.from },
      scrollIntoView: true,
    });
    view.focus();
  }, [focusTarget]);

  return <div ref={hostRef} className="editor-host" />;
}