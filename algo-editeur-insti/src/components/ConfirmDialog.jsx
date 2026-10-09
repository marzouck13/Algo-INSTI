export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onClick={onCancel} role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="dialog-title">{title}</h3>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}