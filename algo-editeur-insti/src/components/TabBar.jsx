import { IconFolder, IconPencil, IconTerminal, IconAlert } from './Icons.jsx';

const TABS = [
  { id: 'files',   label: 'Fichiers',  Icon: IconFolder },
  { id: 'editor',  label: 'Éditeur',   Icon: IconPencil },
  { id: 'results', label: 'Résultats', Icon: IconTerminal },
  { id: 'errors',  label: 'Erreurs',   Icon: IconAlert },
];

export default function TabBar({ active, onChange, errorCount, inputPending }) {
  return (
    <nav className="tabbar" role="tablist">
      {TABS.map(({ id, label, Icon }) => {
        const badge = id === 'errors' ? errorCount : 0;
        const pulse = id === 'results' && inputPending;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            className={`tab ${active === id ? 'tab-active' : ''}`}
            onClick={() => onChange(id)}
          >
            <span className="tab-icon"><Icon size={20} /></span>
            <span className="tab-label">{label}</span>
            {badge > 0 && <span className="tab-badge">{badge}</span>}
            {pulse && <span className="tab-pulse" aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
}