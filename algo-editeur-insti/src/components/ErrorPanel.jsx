import { IconInfo } from './Icons.jsx';

const TYPE_LABEL = {
  lexical: 'Erreur lexicale',
  syntax: 'Erreur de syntaxe',
  semantic: 'Erreur sémantique',
  runtime: "Erreur à l'exécution",
  unknown: 'Erreur',
};

export default function ErrorPanel({ errors, onSelectLine }) {
  return (
    <section className="panel">
      <header className="panel-header">
        Erreurs {errors.length > 0 && <span className="badge">{errors.length}</span>}
      </header>
      <div className="panel-body error-body">
        {errors.length === 0 && (
          <div className="placeholder">Aucune erreur.</div>
        )}
        <ul className="error-list">
          {errors.map((err, i) => {
            const clickable = err.line > 0;
            return (
              <li
                key={i}
                className={`error-item error-${err.type}`}
                onClick={() => clickable && onSelectLine(err.line)}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSelectLine(err.line);
                  }
                }}
              >
                <div className="error-head">
                  {clickable && <span className="error-line">Ligne {err.line}</span>}
                  <span className="error-kind">{TYPE_LABEL[err.type] ?? 'Erreur'}</span>
                </div>
                <div className="error-msg">{err.message}</div>
                {err.hint && (
                  <div className="error-hint">
                    <IconInfo size={13} />
                    <span>{err.hint}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}