/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { IconPlus, IconTrash, IconCopy, IconEdit } from './Icons.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const pad = (n) => String(n).padStart(2, '0');
  if (sameDay) return `aujourd'hui ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function FilesPage({
  files,
  currentId,
  onOpen,
  onNew,
  onRename,
  onDuplicate,
  onDelete,
  onImport,
  onExport,
}) {
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const fileInputRef = useState({ current: null })[0];

  function startRename(file) {
    setRenameId(file.id);
    setRenameValue(file.name);
  }

  function commitRename() {
    if (renameId != null && renameValue.trim()) {
      onRename(renameId, renameValue.trim());
    }
    setRenameId(null);
  }

  async function handleImportClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pseudo,.txt,text/plain';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const name = file.name.replace(/\.pseudo$/i, '');
      onImport(text, name);
    };
    input.click();
  }

  return (
    <div className="page page-files">
      <header className="panel-header page-files-header">
        <span>Fichiers</span>
        <span className="page-files-actions">
          <button type="button" className="btn btn-small" onClick={handleImportClick}>
            Importer
          </button>
          <button
            type="button"
            className="btn btn-small"
            onClick={onExport}
            disabled={currentId == null}
          >
            Exporter
          </button>
          <button type="button" className="btn btn-primary btn-small" onClick={onNew}>
            <IconPlus size={14} />
            <span>Nouveau</span>
          </button>
        </span>
      </header>

      <div className="panel-body files-body">
        {files.length === 0 && (
          <div className="placeholder">Aucun fichier. Créez-en un.</div>
        )}

        <ul className="file-list">
          {files.map((f) => {
            const active = f.id === currentId;
            const renaming = renameId === f.id;
            return (
              <li
                key={f.id}
                className={`file-item ${active ? 'file-item-active' : ''}`}
              >
                <div className="file-main" onClick={() => !renaming && onOpen(f.id)}>
                  {renaming ? (
                    <input
                      type="text"
                      className="file-rename-input"
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenameId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <div className="file-name">{f.name}</div>
                      <div className="file-date">{formatDate(f.updatedAt)}</div>
                    </>
                  )}
                </div>

                <div className="file-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    title="Renommer"
                    onClick={() => startRename(f)}
                  >
                    <IconEdit size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Dupliquer"
                    onClick={() => onDuplicate(f.id)}
                  >
                    <IconCopy size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    title="Supprimer"
                    onClick={() => setPendingDelete(f)}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Supprimer ce fichier ?"
        message={pendingDelete ? `« ${pendingDelete.name} » sera définitivement effacé.` : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}