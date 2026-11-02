'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import UploadZone from '@/components/UploadZone';
import CustomSelect from '@/components/CustomSelect';
import styles from './verification.module.css';

type DocType = { code: string; label: string; hint?: string; tier?: number };
type Doc = {
  id: number;
  documentType: string;
  label: string;
  hint?: string;
  tier?: number;
  status: string;
  originalFilename?: string;
  url?: string;
  reviewNotes?: string;
};

type Payload = {
  documents: Doc[];
  readiness: {
    readyForListing?: boolean;
    readyForVerifiedBadge: boolean;
    approvedCount: number;
    requiredCount: number;
    tier1ApprovedCount?: number;
    tier1RequiredCount?: number;
    tier2ApprovedCount?: number;
    tier2RequiredCount?: number;
  };
  requiredTypes: DocType[];
  tier1Types?: DocType[];
  tier2Types?: DocType[];
};

export default function VerificationPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState('OWNER_GOVERNMENT_ID');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [listingStatus, setListingStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);

  const tier1Types = data?.tier1Types?.length
    ? data.tier1Types
    : (data?.requiredTypes || []).filter((t) => t.tier === 1);
  const tier2Types = data?.tier2Types?.length
    ? data.tier2Types
    : (data?.requiredTypes || []).filter((t) => t.tier === 2);

  const allTypes = useMemo(() => {
    if (data?.requiredTypes?.length) return data.requiredTypes;
    return [...(tier1Types || []), ...(tier2Types || [])];
  }, [data, tier1Types, tier2Types]);

  const selectedHint = allTypes.find((t) => t.code === documentType)?.hint;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [payload, profile] = await Promise.all([
        apiFetch<Payload>('/api/business/verification-documents'),
        apiFetch<{ status?: string; rejectionReason?: string }>('/api/business/profile').catch(() => null),
      ]);
      setData(payload);
      setListingStatus(profile?.status || null);
      setRejectionReason(profile?.rejectionReason || null);
      const types = payload.requiredTypes?.length
        ? payload.requiredTypes
        : [...(payload.tier1Types || []), ...(payload.tier2Types || [])];
      if (types.length && !types.find((t) => t.code === documentType)) {
        setDocumentType(types[0].code);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Could not load verification documents.');
    } finally {
      setLoading(false);
    }
  };

  const resubmitListing = async () => {
    setResubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch('/api/business/resubmit', { method: 'POST' });
      setMessage('Listing submitted for review again.');
      await load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Could not resubmit. Re-upload rejected documents first.');
    } finally {
      setResubmitting(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('documentType', documentType);
      body.append('file', file);
      const res = await fetch('/api/business/verification-documents', {
        method: 'POST',
        body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || 'Upload failed.');
      }
      setMessage(json.message || 'Document uploaded.');
      setFile(null);
      await load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const docsForTier = (tier: number) =>
    (data?.documents || []).filter((d) => (d.tier ?? 0) === tier || allTypes.find((t) => t.code === d.documentType)?.tier === tier);

  if (loading && !data) {
    return (
      <div className={styles.page}>
        <Skeleton variant="title" />
        <Skeleton variant="card" count={2} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Verification"
        subtitle="Tier 1 gets you listed on Explore and maps. Tier 2 unlocks the Verified badge for extra credibility."
      />

      {message && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" /> {message}
        </div>
      )}
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {listingStatus === 'REJECTED' && (
        <div className="error-alert" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <strong>Listing rejected</strong>
            <div>{rejectionReason || 'Update the rejected documents, then resubmit for review.'}</div>
          </div>
          <button type="button" className="btn btn-primary btn-sm" disabled={resubmitting} onClick={() => void resubmitListing()}>
            {resubmitting ? 'Submitting…' : 'Resubmit for review'}
          </button>
        </div>
      )}

      <div className={styles.tierRow}>
        <div className={`surface ${styles.readiness}`}>
          <div>
            <strong>Get listed (Tier 1)</strong>
            <p>
              {data?.readiness?.tier1ApprovedCount ?? 0}/{data?.readiness?.tier1RequiredCount ?? 3} approved — Owner ID,
              trade license, and address proof (utility bill/lease or shop photos).
            </p>
            <p>
              {data?.readiness?.readyForListing
                ? 'Ready for Super Admin to approve your listing.'
                : 'Upload and wait for admin approval of all Tier 1 files.'}
            </p>
          </div>
          <StatusBadge status={data?.readiness?.readyForListing ? 'APPROVED' : 'PENDING'} />
        </div>
        <div className={`surface ${styles.readiness}`}>
          <div>
            <strong>Verified badge (Tier 2)</strong>
            <p>
              {data?.readiness?.tier2ApprovedCount ?? 0}/{data?.readiness?.tier2RequiredCount ?? 2} approved — Tax ID and
              bank statement (you may redact amounts).
            </p>
            <p>
              {data?.readiness?.readyForVerifiedBadge
                ? 'Ready for Super Admin to grant the Verified badge.'
                : 'Optional after listing — builds customer trust.'}
            </p>
          </div>
          <StatusBadge status={data?.readiness?.readyForVerifiedBadge ? 'APPROVED' : 'PENDING'} />
        </div>
      </div>

      <div className={styles.grid}>
        <form className={`surface ${styles.uploadCard}`} onSubmit={handleUpload}>
          <h3>Upload a document</h3>
          <div className="form-group">
            <label className="form-label" htmlFor="docType">
              Document type
            </label>
            <CustomSelect
              id="docType"
              options={allTypes.map((t) => ({
                value: t.code,
                label: `Tier ${t.tier ?? '?'}: ${t.label}`,
              }))}
              value={documentType}
              onChange={setDocumentType}
              placeholder="Select document type"
              searchable={false}
            />
            {selectedHint && <p className={styles.hint}>{selectedHint}</p>}
          </div>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" htmlFor="docFile">
              File (PDF, Word, or image, max 15MB)
            </label>
            <UploadZone
              id="docFile"
              accept=".pdf,.doc,.docx,image/*"
              selectedFile={file}
              onFileChange={setFile}
              maxSizeMB={15}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Submit for review'}
          </button>
        </form>

        <div className={`surface ${styles.listCard}`}>
          <h3>Submitted files</h3>
          {(data?.documents || []).length === 0 ? (
            <p className={styles.empty}>No documents uploaded yet.</p>
          ) : (
            <>
              <h4 className={styles.tierHeading}>Tier 1 — Get listed</h4>
              <DocList docs={docsForTier(1)} fallbackTypes={tier1Types} />
              <h4 className={styles.tierHeading}>Tier 2 — Verified badge</h4>
              <DocList docs={docsForTier(2)} fallbackTypes={tier2Types} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DocList({ docs, fallbackTypes }: { docs: Doc[]; fallbackTypes: DocType[] }) {
  if (docs.length === 0) {
    return (
      <ul className={styles.docList}>
        {fallbackTypes.map((t) => (
          <li key={t.code}>
            <div>
              <strong>{t.label}</strong>
              <div className={styles.meta}>Not uploaded yet</div>
              {t.hint && <div className={styles.meta}>{t.hint}</div>}
            </div>
            <StatusBadge status="PENDING" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={styles.docList}>
      {docs.map((doc) => (
        <li key={doc.id}>
          <div>
            <strong>{doc.label}</strong>
            <div className={styles.meta}>{doc.originalFilename || 'Document'}</div>
            {doc.reviewNotes && <div className={styles.notes}>{doc.reviewNotes}</div>}
          </div>
          <div className={styles.docActions}>
            <StatusBadge status={doc.status} />
            {doc.url && (
              <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                View
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
