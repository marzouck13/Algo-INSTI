import { IconX } from './Icons.jsx';

const APP_VERSION = '1.0.0';
const GRAMMAR_VERSION = '1.0';

export default function AboutModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog about-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="about-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          <IconX size={18} />
        </button>

        <div className="about-insti">
          <img
            src="/icons/insti-logo.png"
            alt="Logo INSTI"
            className="about-insti-logo"
          />
        </div>

        <h2 className="about-title">Algo Éditeur INSTI</h2>
        <p className="about-version">Version {APP_VERSION} · Grammaire {GRAMMAR_VERSION}</p>

        <p className="about-description">
          Éditeur de pseudo-code algorithmique pour l'apprentissage.
          Fonctionne entièrement hors ligne, sans compte ni connexion réseau.
        </p>

        <div className="about-separator" />

        <div className="about-diic">
          <img
            src="/icons/diic-logo.png"
            alt="Logo DIIC"
            className="about-diic-logo"
          />
          <div className="about-diic-text">
            <div className="about-diic-name">DIIC</div>
            <div className="about-diic-role">Conception et développement</div>
          </div>
        </div>

        <p className="about-footer">
          © 2026 INSTI · Tous droits réservés
        </p>
      </div>
    </div>
  );
}