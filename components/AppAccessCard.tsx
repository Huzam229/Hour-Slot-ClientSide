'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { disablePush, enablePush, getPushState, isIos, isStandalone, type PushState } from '@/lib/push';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const STATE_TEXT: Record<PushState, string> = {
  unsupported: "This browser can't show notifications. Try Chrome, Edge, Firefox or Safari.",
  'needs-install': 'On iPhone, first add Duemet to your Home Screen (below), then open it from there to turn on notifications.',
  'disabled-on-server': 'Notifications are not set up on this server yet.',
  denied: 'Notifications are blocked for this site. Allow them in your browser settings, then reload.',
  off: 'Get booking updates, job changes and waitlist alerts on this device.',
  on: 'Notifications are on for this device.',
};

/** "Install the app" + "Turn on notifications" card for dashboards and the profile page. */
export default function AppAccessCard() {
  const [push, setPush] = useState<PushState | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void getPushState().then(setPush);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalled(isStandalone());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setNote(null);
    try {
      await fn();
    } catch (e: unknown) {
      setNote((e as { message?: string })?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (push === null) return null;

  return (
    <section className="card" style={{ padding: 18, display: 'grid', gap: 10, marginBottom: 18 }}>
      <strong>
        <i className="fa-solid fa-mobile-screen-button" /> Duemet on your phone
      </strong>

      {!installed && (
        <div style={{ display: 'grid', gap: 6 }}>
          {installEvent ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ justifySelf: 'start' }}
              onClick={() =>
                void run(async () => {
                  await installEvent.prompt();
                  const choice = await installEvent.userChoice;
                  if (choice.outcome === 'accepted') setInstalled(true);
                  setInstallEvent(null);
                })
              }
            >
              <i className="fa-solid fa-download" /> Install app
            </button>
          ) : isIos() ? (
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              To install: tap <i className="fa-solid fa-arrow-up-from-bracket" /> <strong>Share</strong>, then{' '}
              <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              To install: open your browser menu and choose <strong>Install app</strong> or{' '}
              <strong>Add to Home screen</strong>.
            </p>
          )}
        </div>
      )}

      <p style={{ margin: 0, color: 'var(--text-muted)' }}>{STATE_TEXT[push]}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {push === 'off' && (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy}
            onClick={() => void run(async () => setPush(await enablePush()))}>
            <i className="fa-solid fa-bell" /> Turn on notifications
          </button>
        )}
        {push === 'on' && (
          <>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy}
              onClick={() => void run(async () => {
                await apiFetch('/api/push/test', { method: 'POST' });
                setNote('Test sent — it should appear in a few seconds.');
              })}>
              Send test
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
              onClick={() => void run(async () => {
                await disablePush();
                setPush('off');
              })}>
              Turn off
            </button>
          </>
        )}
      </div>
      {note && <p style={{ margin: 0 }}>{note}</p>}
    </section>
  );
}
