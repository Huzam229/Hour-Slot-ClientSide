'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, openAuthedFile } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';

type DocType = { code: string; label?: string; name?: string };
type Doc = {
  id: number;
  documentType: string;
  status: string;
  url?: string;
  rejectionReason?: string;
  reviewNotes?: string;
};
type Payload = {
  documents?: Doc[];
  requiredTypes?: DocType[];
  tier1Types?: DocType[];
  readiness?: Record<string, unknown>;
};

export default function SoloVerificationPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listingStatus, setListingStatus] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, workspace] = await Promise.all([
        apiFetch<Payload>('/api/provider/verification-documents'),
        apiFetch<{ status?: string }>('/api/provider/workspace').catch(() => null),
      ]);
      setPayload(data);
      setListingStatus(workspace?.status || null);
      const first = data.tier1Types?.[0]?.code || data.requiredTypes?.[0]?.code || '';
      setDocType(first);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Failed to load verification.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async () => {
    if (!file || !docType) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const body = new FormData();
      body.append('documentType', docType);
      body.append('file', file);
      await apiFetch('/api/provider/verification-documents', { method: 'POST', body });
      setMessage('Document uploaded for review.');
      setFile(null);
      await load();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const resubmit = async () => {
    setResubmitting(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/api/provider/resubmit', { method: 'POST' });
      setMessage('Listing submitted for review again.');
      await load();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not resubmit. Re-upload rejected documents first.');
    } finally {
      setResubmitting(false);
    }
  };

  if (loading) return <Skeleton variant="card" height={240} />;

  const types = payload?.tier1Types?.length ? payload.tier1Types : payload?.requiredTypes || [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader
        title="Verification"
        subtitle="Upload identity documents for your solo listing. Tier 1 gets you approved; Tier 2 unlocks the Verified badge."
      />
      {message && <div className="success-alert" style={{ marginBottom: 14 }}>{message}</div>}
      {error && <div className="error-alert" style={{ marginBottom: 14 }}>{error}</div>}

      {listingStatus === 'REJECTED' && (
        <div className="error-alert" style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <strong>Listing rejected</strong>
            <div>Re-upload rejected documents, then resubmit for review.</div>
          </div>
          <button type="button" className="btn btn-primary btn-sm" disabled={resubmitting} onClick={() => void resubmit()}>
            {resubmitting ? 'Submitting…' : 'Resubmit for review'}
          </button>
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 16, display: 'grid', gap: 10 }}>
        <strong>Upload document</strong>
        <select className="form-input" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {types.map((t) => (
            <option key={t.code} value={t.code}>
              {t.label || t.name || t.code}
            </option>
          ))}
        </select>
        <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="button" className="btn btn-primary" disabled={busy || !file} onClick={() => void upload()}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {(payload?.documents || []).map((d) => (
          <article key={d.id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <strong>{d.documentType}</strong>
              {(d.reviewNotes || d.rejectionReason) && (
                <div style={{ marginTop: 4, opacity: 0.85, fontSize: 13 }}>
                  Note: {d.reviewNotes || d.rejectionReason}
                </div>
              )}
              {d.url && (
                <div style={{ marginTop: 6 }}>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => openAuthedFile(d.url!).catch(() => {})}>
                    View file
                  </button>
                </div>
              )}
            </div>
            <StatusBadge status={d.status} />
          </article>
        ))}
        {(payload?.documents || []).length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>No documents uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
