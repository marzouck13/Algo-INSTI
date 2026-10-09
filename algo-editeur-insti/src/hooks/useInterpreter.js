import { useCallback, useRef, useState } from 'react';
import { run } from '../interpreter/pipeline.js';

const INITIAL = {
  status: 'idle',
  output: [],
  errors: [],
  variables: [],
  pendingInput: null,
  durationMs: 0,
};

export function useInterpreter(getCode) {
  const [state, setState] = useState(INITIAL);
  const pendingRef = useRef(null);

  const execute = useCallback(async () => {
    pendingRef.current = null;
    setState({ ...INITIAL, status: 'running' });

    const source = getCode();

    const result = await run(source, {
      onOutput: (line) => {
        setState((s) => ({ ...s, output: [...s.output, line] }));
      },
      onInput: (name, type) =>
        new Promise((resolve) => {
          pendingRef.current = { resolve };
          setState((s) => ({ ...s, pendingInput: { name, type } }));
        }),
    });

    pendingRef.current = null;
    setState((s) => ({
      ...s,
      status: 'done',
      errors: result.errors,
      variables: result.variables,
      pendingInput: null,
      durationMs: result.durationMs,
    }));

    return result;
  }, [getCode]);

  const submitInput = useCallback((value) => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    setState((s) => ({ ...s, pendingInput: null }));
    p.resolve(value);
  }, []);

  const clear = useCallback(() => {
    setState(INITIAL);
  }, []);

  return { ...state, execute, submitInput, clear };
}