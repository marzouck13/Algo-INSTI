import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { IconCheck, IconX } from './Icons.jsx';

export default function UpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updating, setUpdating] = useState(false);
  const updateSWRef = useRef(null);

  useEffect(() => {
    const fn = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
        setTimeout(() => setOfflineReady(false), 4000);
      },
      onRegisteredSW(_url, registration) {
        if (registration) {
          setInterval(() => registration.update(), 60 * 60 * 1000);
        }
      },
    });
    updateSWRef.current = fn;
  }, []);

  if (!needRefresh && !offlineReady) return null;

  async function handleUpdate() {
    setUpdating(true);
    try {
      if (updateSWRef.current) await updateSWRef.current(true);
    } catch {
      setUpdating(false);
    }
  }

  function dismiss() {
    setNeedRefresh(false);
    setOfflineReady(false);
  }

  return (
    <div
      className={`update-banner ${offlineReady ? 'update-banner-ok' : ''}`}
      role="status"
    >
      {offlineReady ? (
        <>
          <IconCheck size={16} />
          <span className="update-banner-text">
            Application prête hors ligne.
          </span>
          <button
            type="button"
            className="update-banner-action"
            onClick={dismiss}
            aria-label="Fermer"
          >
            <IconX size={14} />
          </button>
        </>
      ) : (
        <>
          <span className="update-banner-text">
            Une nouvelle version est disponible.
          </span>
          <button
            type="button"
            className="update-banner-action update-banner-update"
            onClick={handleUpdate}
            disabled={updating}
          >
            {updating ? 'Mise à jour…' : 'Mettre à jour'}
          </button>
          <button
            type="button"
            className="update-banner-action"
            onClick={dismiss}
            aria-label="Plus tard"
          >
            <IconX size={14} />
          </button>
        </>
      )}
    </div>
  );
}