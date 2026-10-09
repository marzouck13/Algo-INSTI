import { useCallback, useEffect, useRef, useState } from 'react';
import TabBar from './components/TabBar.jsx';
import EditorPage from './components/EditorPage.jsx';
import ResultsPage from './components/ResultsPage.jsx';
import ErrorsPage from './components/ErrorsPage.jsx';
import FilesPage from './components/FilesPage.jsx';
import AboutModal from './components/AboutModal.jsx';
import UpdateBanner from './components/UpdateBanner.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import {
  IconPlay, IconTrash, IconSpinner, IconInfoCircle, IconSun, IconMoon,
} from './components/Icons.jsx';
import { useInterpreter } from './hooks/useInterpreter.js';
import { useFiles } from './hooks/useFiles.js';
import { useAutoSave } from './hooks/useAutoSave.js';
import { useTheme } from './hooks/useTheme.js';

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();

  const {
    loading,
    files,
    currentId,
    currentCode: code,
    currentMeta: meta,
    setCurrentCode: setCode,
    openFile,
    newFile,
    saveCurrent,
    rename,
    duplicate,
    remove,
    importFromText,
    exportCurrent,
  } = useFiles();

  const [tab, setTab] = useState('editor');
  const [aboutOpen, setAboutOpen] = useState(false);

  // --- Auto-save ----------------------------------------------------------
  const autoSaveEnabled = !loading && currentId != null;
  const { flush } = useAutoSave(code, meta, {
    enabled: autoSaveEnabled,
    onSave: async ({ code, meta }) => {
      await saveCurrent({ code, meta });
    },
  });

  // --- Interpréteur -------------------------------------------------------
  const codeRef = useRef(code);
  useEffect(() => { codeRef.current = code; }, [code]);
  const getCode = useCallback(() => codeRef.current, []);

  const {
    status,
    output,
    errors,
    variables,
    pendingInput,
    durationMs,
    execute,
    submitInput,
    clear,
  } = useInterpreter(getCode);

  const [focusTarget, setFocusTarget] = useState({ line: 0, nonce: 0 });

  const handleRun = useCallback(async () => {
    await flush();
    setTab('results');
    const result = await execute();
    if (result && !result.success && result.errors.length > 0) {
      setTab('errors');
    } else {
      setTab('results');
    }
  }, [execute, flush]);

  const handleClear = useCallback(() => {
    clear();
    setTab('editor');
  }, [clear]);

  const handleSelectLine = useCallback((line) => {
    setFocusTarget((t) => ({ line, nonce: t.nonce + 1 }));
    setTab('editor');
  }, []);

  // --- Fichiers ----------------------------------------------------------
  const handleOpenFile = useCallback(async (id) => {
    await flush();
    if (id === currentId) {
      setTab('editor');
      return;
    }
    clear();
    openFile(id);
    setTab('editor');
  }, [flush, currentId, clear, openFile]);

  const handleNewFile = useCallback(async () => {
    await flush();
    clear();
    await newFile();
    setTab('editor');
  }, [flush, clear, newFile]);

  const handleDuplicate = useCallback(async (id) => {
    await flush();
    await duplicate(id);
  }, [flush, duplicate]);

  const handleDelete = useCallback(async (id) => {
    await remove(id);
  }, [remove]);

  const handleImport = useCallback(async (text, name) => {
    await flush();
    clear();
    await importFromText(text, name);
    setTab('editor');
  }, [flush, clear, importFromText]);

  const handleExport = useCallback(async () => {
    await flush();
    const data = await exportCurrent();
    if (!data) return;
    const blob = new Blob([data.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name}.pseudo`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [flush, exportCurrent]);

  // --- Rendu --------------------------------------------------------------
  if (loading) {
    return (
      <div className="app app-loading">
        <span>Chargement…</span>
      </div>
    );
  }

  const running = status === 'running';

  return (
    <div className="app">
      <InstallPrompt />
      <UpdateBanner />
      <header className="app-header">
        <div className="app-header-brand">
          <img
            src="/icons/insti-logo.png"
            alt="INSTI"
            className="app-header-logo"
          />
          <img
            src="/icons/diic-logo.png"
            alt="DIIC"
            className="app-header-logo"
          />
          <span className="app-title">Algo Éditeur INSTI</span>
        </div>
        <div className="app-header-actions">
          {status === 'done' && <span className="status-pill">{durationMs} ms</span>}
          <button
            type="button"
            className="btn btn-icon"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Passer en thème sombre' : 'Passer en thème clair'}
            title={theme === 'light' ? 'Thème sombre' : 'Thème clair'}
          >
            {theme === 'light' ? <IconMoon size={16} /> : <IconSun size={16} />}
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => setAboutOpen(true)}
            aria-label="À propos"
            title="À propos"
          >
            <IconInfoCircle size={16} />
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleClear}
            disabled={running}
          >
            <IconTrash size={15} />
            <span>Vider</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRun}
            disabled={running || currentId == null}
          >
            {running ? <IconSpinner size={15} /> : <IconPlay size={15} />}
            <span>{running ? 'Exécution…' : 'Exécuter'}</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="page-slot" hidden={tab !== 'files'}>
          <FilesPage
            files={files}
            currentId={currentId}
            onOpen={handleOpenFile}
            onNew={handleNewFile}
            onRename={rename}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onImport={handleImport}
            onExport={handleExport}
          />
        </div>
        <div className="page-slot" hidden={tab !== 'editor'}>
          <EditorPage
            code={code}
            onChange={setCode}
            focusTarget={focusTarget}
            theme={theme}
          />
        </div>
        <div className="page-slot" hidden={tab !== 'results'}>
          <ResultsPage
            lines={output}
            pendingInput={pendingInput}
            onSubmitInput={submitInput}
            variables={variables}
          />
        </div>
        <div className="page-slot" hidden={tab !== 'errors'}>
          <ErrorsPage errors={errors} onSelectLine={handleSelectLine} />
        </div>
      </main>

      <TabBar
        active={tab}
        onChange={setTab}
        errorCount={errors.length}
        inputPending={!!pendingInput}
      />

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}