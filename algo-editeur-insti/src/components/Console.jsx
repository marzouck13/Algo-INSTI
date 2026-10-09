import { useEffect, useRef, useState } from 'react';
import { IconCheck } from './Icons.jsx';

export default function Console({ lines, pendingInput, onSubmitInput }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (pendingInput && inputRef.current) {
      inputRef.current.focus();
      setValue('');
    }
  }, [pendingInput]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length, pendingInput]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!pendingInput) return;
    onSubmitInput(value);
    setValue('');
  }

  return (
    <section className="panel">
      <header className="panel-header">Console</header>
      <div className="panel-body console-body" ref={scrollRef}>
        {lines.length === 0 && !pendingInput && (
          <div className="placeholder">
            Cliquez sur le bouton <strong>Exécuter</strong> pour lancer le programme.
          </div>
        )}

        {lines.map((line, i) => (
          <div key={i} className="console-line">{line}</div>
        ))}

        {pendingInput && (
          <form className="console-input-row" onSubmit={handleSubmit}>
            <label className="console-prompt">
              {pendingInput.name} ({pendingInput.type}) :
            </label>
            <input
              ref={inputRef}
              type="text"
              className="console-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn-small" aria-label="Valider la saisie">
              <IconCheck size={14} />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}