'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Hour = {
  id?: number;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  closed?: boolean;
  slotStepMinutes?: number;
};

type Row = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  closed: boolean;
};

export default function SoloAvailabilityPage() {
  const [rows, setRows] = useState<Row[]>(
    DAYS.map((_, i) => ({
      dayOfWeek: i,
      startTime: '09:00',
      endTime: '17:00',
      closed: i === 0,
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ workingHours?: Hour[] }>('/api/provider/availability');
      if (data.workingHours && data.workingHours.length > 0) {
        const map = new Map(data.workingHours.map((h) => [h.dayOfWeek, h]));
        setRows(
          DAYS.map((_, i) => {
            const existing = map.get(i);
            return {
              dayOfWeek: i,
              startTime: (existing?.startTime || '09:00').slice(0, 5),
              endTime: (existing?.endTime || '17:00').slice(0, 5),
              closed: existing?.closed ?? i === 0,
            };
          })
        );
      }
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Failed to load availability.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/api/provider/availability', {
        method: 'PUT',
        body: JSON.stringify(rows.map((r) => ({ ...r, slotStepMinutes: 30 }))),
      });
      setMessage('Availability saved.');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not save availability.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton variant="card" height={280} />;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader
        title="Availability"
        subtitle="Your weekly hours for the solo listing — no branch or staff calendars."
      />
      {message && <div className="success-alert" style={{ marginBottom: 14 }}>{message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        {rows.map((row, idx) => (
          <div key={row.dayOfWeek} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr auto', gap: 10, alignItems: 'center' }}>
            <strong>{DAYS[row.dayOfWeek]}</strong>
            <input
              type="time"
              className="form-input"
              value={row.startTime}
              disabled={row.closed}
              onChange={(e) =>
                setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, startTime: e.target.value } : r)))
              }
            />
            <input
              type="time"
              className="form-input"
              value={row.endTime}
              disabled={row.closed}
              onChange={(e) =>
                setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, endTime: e.target.value } : r)))
              }
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={row.closed}
                onChange={(e) =>
                  setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, closed: e.target.checked } : r)))
                }
              />
              Closed
            </label>
          </div>
        ))}
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save hours'}
        </button>
      </div>
    </div>
  );
}
