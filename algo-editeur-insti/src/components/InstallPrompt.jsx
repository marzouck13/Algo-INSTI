import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconX } from './Icons.jsx';

const STORAGE_KEY = 'algo-editeur-insti:install-dismissed';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function wasDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * État initial calculé une seule fois, avant le premier rendu.
 * - Déjà installé en standalone → masqué
 * - Utilisateur a déjà fermé la bannière → masqué
 * - iOS → hint "Partager → Sur l'écran d'accueil"
 * - Chrome/Edge desktop → masqué jusqu'au déclenchement de beforeinstallprompt
 */
function computeInitial() {
  if (isStandalone()) return { isIosHint: false, visible: false };
  if (wasDismissed()) return { isIosHint: false, visible: false };
  if (isIos()) return { isIosHint: true, visible: true };
  return { isIosHint: false, visible: false };
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(() => computeInitial().visible);
  const [isIosHint] = useState(() => computeInitial().isIosHint);
  const [installed, setInstalled] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    function onBeforeInstall(e) {
      e.preventDefault();
      if (!mountedRef.current) return;
      setDeferredPrompt(e);
      if (!isIos()) setVisible(true);
    }

    function onAppInstalled() {
      if (!mountedRef.current) return;
      setInstalled(true);
      setDeferredPrompt(null);
      setVisible(false);
      setTimeout(() => {
        if (mountedRef.current) setInstalled(false);
      }, 4000);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setInstalled(true);
        setTimeout(() => {
          if (mountedRef.current) setInstalled(false);
        }, 4000);
      }
    } catch { /* ignore */ }
    setDeferredPrompt(null);
    setVisible(false);
  }

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* ignore */ }
  }

  if (!visible && !installed) return null;

  if (installed) {
    return (
      <div className="install-banner install-banner-ok" role="status">
        <IconCheck size={16} />
        <span className="install-banner-text">
          Application installée. Retrouvez-la dans vos applications.
        </span>
      </div>
    );
  }

  if (isIosHint) {
    return (
      <div className="install-banner" role="status">
        <span className="install-banner-text">
          Pour installer : Partager → Sur l&apos;écran d&apos;accueil
        </span>
        <button
          type="button"
          className="install-banner-action"
          onClick={dismiss}
          aria-label="Fermer"
        >
          <IconX size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="install-banner" role="status">
      <span className="install-banner-text">
        Installer Algo Éditeur INSTI sur cet appareil ?
      </span>
      <button
        type="button"
        className="install-banner-action install-banner-primary"
        onClick={handleInstall}
      >
        Installer
      </button>
      <button
        type="button"
        className="install-banner-action"
        onClick={dismiss}
        aria-label="Plus tard"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}