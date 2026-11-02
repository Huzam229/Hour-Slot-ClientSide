'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { apiFetch, openAuthedFile } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { formatMoney } from '@/lib/money';
import styles from './business-detail.module.css';

interface Owner {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

interface Branch {
  id: number;
  name: string;
  address: string;
  phoneNumber?: string;
}

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  currency?: string;
}

interface Staff {
  id: number;
  name: string;
  designation?: string;
  rating: number;
}

interface Business {
  id: number;
  name: string;
  description?: string;
  category?: string;
  status: string;
  verified: boolean;
  publishStatus?: string;
  listingMode?: string;
  commissionRate: number;
  rating: number;
  logoUrl?: string;
  rejectionReason?: string;
  createdAt: string;
  owner: Owner;
  currency?: string;
  countryCode?: string;
}

interface BusinessDetailResponse {
  business: Business;
  branches: Branch[];
  services: Service[];
  staff: Staff[];
  verificationDocuments?: {
    id: number;
    documentType: string;
    label: string;
    hint?: string;
    tier?: number;
    status: string;
    originalFilename?: string;
    url?: string;
    reviewNotes?: string;
  }[];
  verificationReadiness?: {
    readyForListing?: boolean;
    readyForVerifiedBadge: boolean;
    approvedCount: number;
    requiredCount: number;
    tier1ApprovedCount?: number;
    tier1RequiredCount?: number;
    tier2ApprovedCount?: number;
    tier2RequiredCount?: number;
    tier1Types?: { code: string; label: string; hint?: string }[];
    tier2Types?: { code: string; label: string; hint?: string }[];
  };
}

export default function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: businessId } = use(params);

  const [detail, setDetail] = useState<BusinessDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [docReviewTarget, setDocReviewTarget] = useState<{ id: number; approve: boolean; label: string } | null>(null);
  const [docReviewNotes, setDocReviewNotes] = useState('');

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BusinessDetailResponse>(`/api/admin/businesses/${businessId}`);
      setDetail(data);
    } catch (err: any) {
      setError(err.message || 'Could not load business details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [businessId]);

  const handleApproveListing = async () => {
    if (!detail) return;
    setError(null);
    setMessage(null);
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/approve`, { method: 'PUT' });
      setMessage('Listing approved. Customers can book once setup is complete.');
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to approve listing.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!detail) return;
    setError(null);
    setMessage(null);
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/verify`, { method: 'PUT' });
      setMessage('Verified badge granted.');
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to grant verified badge. Approve Tax ID and Bank statement first.');
    } finally {
      setActionLoading(false);
    }
  };

  const openDocReview = (documentId: number, approve: boolean, label: string) => {
    setDocReviewTarget({ id: documentId, approve, label });
    setDocReviewNotes(approve ? 'Looks valid' : '');
    setError(null);
  };

  const submitDocReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docReviewTarget) return;
    if (!docReviewTarget.approve && !docReviewNotes.trim()) {
      setError('Add a short note so the owner knows what to fix.');
      return;
    }
    setError(null);
    setMessage(null);
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/verification-documents/${docReviewTarget.id}/review`, {
        method: 'PUT',
        body: JSON.stringify({
          approve: docReviewTarget.approve,
          notes: docReviewNotes.trim() || (docReviewTarget.approve ? 'Looks valid' : undefined),
        }),
      });
      setMessage(docReviewTarget.approve ? 'Document approved.' : 'Document rejected.');
      setDocReviewTarget(null);
      setDocReviewNotes('');
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Document review failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('Please specify a rejection reason.');
      return;
    }
    setError(null);
    setMessage(null);
    setActionLoading(true);
    setShowRejectModal(false);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason: rejectionReason }),
      });
      setMessage('Business application rejected and reason logged.');
      setRejectionReason('');
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to reject business.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    setError(null);
    setMessage(null);
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/suspend`, { method: 'PUT' });
      setMessage('Business has been suspended.');
      setShowSuspendConfirm(false);
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to suspend business.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className={styles.detailWrapper}>
        <Skeleton variant="title" />
        <Skeleton variant="card" height={160} />
        <Skeleton variant="card" count={2} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={styles.detailWrapper}>
        <Link href="/admin/businesses" className={styles.backLink}>
          <i className="fa-solid fa-arrow-left" /> Back to businesses
        </Link>
        <div className="error-alert">Business registration details not found.</div>
      </div>
    );
  }

  const { business, branches, services, staff: staffList } = detail;
  const nameInitials = business.name.charAt(0);
  const publicProfilePath = `/profile/business/${business.id}`;
  const bookingPath = `/profile/book/${business.id}?step=service`;
  const publicProfileUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${publicProfilePath}` : publicProfilePath;
  const bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}${bookingPath}` : bookingPath;

  const copyAdminUrl = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(`${label} copied to clipboard.`);
      setError(null);
    } catch {
      setError(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.detailWrapper}>
      <PageHeader
        title={business.name}
        subtitle={`${business.category || 'Service industry'} · Registered ${formatDate(business.createdAt)}`}
        actions={
          <Link href="/admin/businesses" className="btn btn-outline btn-sm">
            <i className="fa-solid fa-arrow-left" /> Back
          </Link>
        }
      />

      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="success-alert">
          <i className="fa-solid fa-circle-check" />
          <span>{message}</span>
        </div>
      )}

      <div className={`surface ${styles.bizHeaderCard}`}>
        <div className={styles.bizHeaderLeft}>
          {business.logoUrl ? (
            <img src={business.logoUrl} alt={business.name} className={styles.largeLogo} />
          ) : (
            <div className={styles.largeInitials}>{nameInitials}</div>
          )}
          <div>
            <h2 className={styles.headerTitle}>{business.name}</h2>
            <div className={styles.headerCategory}>{business.category || 'Service industry'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <StatusBadge status={business.status} />
          <span className={styles.itemSub}>
            Publish: {business.publishStatus || 'DRAFT'}
            {business.verified ? ' · Verified badge' : ''}
          </span>
        </div>
      </div>

      <div className={`surface ${styles.urlCard}`}>
        <h3 className={styles.sectionTitle}>Platform URLs</h3>
        <p className={styles.description}>Super admin only — customer-facing links for this business.</p>
        <div className={styles.urlList}>
          <div className={styles.urlRow}>
            <div>
              <strong>Public profile</strong>
              <code className={styles.urlCode}>{publicProfileUrl}</code>
            </div>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => copyAdminUrl(publicProfileUrl, 'Profile URL')}>
              Copy
            </button>
          </div>
          <div className={styles.urlRow}>
            <div>
              <strong>Booking entry</strong>
              <code className={styles.urlCode}>{bookingUrl}</code>
            </div>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => copyAdminUrl(bookingUrl, 'Booking URL')}>
              Copy
            </button>
          </div>
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.column}>
          <div className="surface">
            <h3 className={styles.sectionTitle}>Application profile</h3>
            <div className={styles.infoGroup}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Registration date</span>
                <span className={styles.infoValue}>{formatDate(business.createdAt)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Category</span>
                <span className={styles.infoValue}>{business.category || '—'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Rating</span>
                <span className={styles.infoValue}>
                  {business.rating > 0 ? business.rating.toFixed(1) : 'New (0.0)'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Listing type</span>
                <span className={styles.infoValue}>
                  {business.listingMode === 'INDIVIDUAL' ? 'Individual professional' : 'Business'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Marketplace</span>
                <span className={styles.infoValue}>
                  {business.status === 'APPROVED' && (business.publishStatus || '').toUpperCase() === 'PUBLISHED'
                    ? 'Live'
                    : business.status === 'APPROVED'
                      ? 'Approved — not published yet'
                      : 'Hidden'}
                </span>
              </div>
            </div>
            <p className={styles.description}>{business.description || 'No description entered.'}</p>
            {business.rejectionReason && (
              <div className={styles.rejectBox}>
                <strong>Prior rejection reason</strong>
                <p>{business.rejectionReason}</p>
              </div>
            )}
          </div>

          <div className="surface">
            <h3 className={styles.sectionTitle}>Owner details</h3>
            <div className={styles.infoGroup}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>
                  {business.owner?.firstName} {business.owner?.lastName}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{business.owner?.email}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Phone</span>
                <span className={styles.infoValue}>{business.owner?.phoneNumber || '—'}</span>
              </div>
            </div>
          </div>

          <div className="surface">
            <h3 className={styles.sectionTitle}>Verification documents</h3>
            <p className={styles.description}>
              Tier 1 (listing): {detail.verificationReadiness?.tier1ApprovedCount ?? 0}/
              {detail.verificationReadiness?.tier1RequiredCount ?? (business.listingMode === 'INDIVIDUAL' ? 1 : 3)} approved
              {detail.verificationReadiness?.readyForListing ? ' — ready to approve listing' : ''}
              .{' '}
              {business.listingMode === 'INDIVIDUAL'
                ? 'Individuals need an approved government ID.'
                : 'Businesses need Owner ID, Trade license, and Address proof.'}
            </p>
            <p className={styles.description}>
              Tier 2 (badge): {detail.verificationReadiness?.tier2ApprovedCount ?? 0}/
              {detail.verificationReadiness?.tier2RequiredCount ?? 2} approved
              {detail.verificationReadiness?.readyForVerifiedBadge ? ' — ready for verified badge' : ''}
              . Tax ID and bank statement (amounts may be redacted).
            </p>
            {(detail.verificationDocuments || []).length === 0 ? (
              <p className={styles.description}>No documents uploaded yet.</p>
            ) : (
              <div className={styles.infoGroup}>
                {detail.verificationDocuments!.map((doc) => (
                  <div key={doc.id} className={styles.infoRow} style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span className={styles.infoLabel}>
                      {doc.tier ? `T${doc.tier}: ` : ''}
                      {doc.label}
                    </span>
                    <StatusBadge status={doc.status} />
                    {doc.url && (
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => openAuthedFile(doc.url!).catch(() => {})}>
                        View
                      </button>
                    )}
                    {doc.status === 'SUBMITTED' && (
                      <>
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => openDocReview(doc.id, true, doc.label)}>
                          Approve doc
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => openDocReview(doc.id, false, doc.label)}>
                          Reject doc
                        </button>
                      </>
                    )}
                    {doc.reviewNotes && (
                      <span className={styles.itemSub} style={{ width: '100%' }}>
                        Note: {doc.reviewNotes}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface">
            <h3 className={styles.sectionTitle}>Listing & verified badge</h3>
            <p className={styles.description}>
              Approval lets the owner publish. The verified badge is a separate trust decision after Tier 2 docs.
            </p>
            <div className={styles.actionBtns}>
              {business.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleApproveListing}
                    disabled={actionLoading || !detail.verificationReadiness?.readyForListing}
                    title={
                      business.listingMode === 'INDIVIDUAL'
                        ? 'Requires an approved government ID'
                        : 'Requires Tier 1 documents approved (Owner ID, Trade license, Address proof)'
                    }
                  >
                    Approve listing
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                  >
                    Reject
                  </button>
                </>
              )}
              {business.status === 'APPROVED' && (
                <>
                  {!business.verified && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleApprove}
                      disabled={actionLoading || !detail.verificationReadiness?.readyForVerifiedBadge}
                      title="Requires Tier 2 documents approved (Tax ID, Bank statement)"
                    >
                      Grant verified badge
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setShowSuspendConfirm(true)}
                    disabled={actionLoading}
                  >
                    Suspend
                  </button>
                </>
              )}
              {(business.status === 'REJECTED' || business.status === 'SUSPENDED') && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApproveListing}
                  disabled={actionLoading || !detail.verificationReadiness?.readyForListing}
                  title="Requires Tier 1 documents approved"
                >
                  Restore listing
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.column}>
          <div className="surface">
            <h3 className={styles.sectionTitle}>Branches ({branches.length})</h3>
            {branches.length === 0 ? (
              <p className={styles.emptyNote}>No branches configured yet.</p>
            ) : (
              <div className={styles.itemList}>
                {branches.map((br) => (
                  <div key={br.id} className={styles.itemRow}>
                    <div className={styles.itemName}>{br.name}</div>
                    <div className={styles.itemSub}>{br.address}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface">
            <h3 className={styles.sectionTitle}>Services ({services.length})</h3>
            {services.length === 0 ? (
              <p className={styles.emptyNote}>No services configured yet.</p>
            ) : (
              <div className={styles.itemList}>
                {services.map((sv) => (
                  <div key={sv.id} className={styles.itemRowBetween}>
                    <div>
                      <div className={styles.itemName}>{sv.name}</div>
                      <div className={styles.itemSub}>{sv.durationMinutes} mins</div>
                    </div>
                    <strong>{formatMoney(sv.price, sv.currency || business.currency)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface">
            <h3 className={styles.sectionTitle}>Staff ({staffList.length})</h3>
            {staffList.length === 0 ? (
              <p className={styles.emptyNote}>No staff members configured.</p>
            ) : (
              <div className={styles.itemList}>
                {staffList.map((st) => (
                  <div key={st.id} className={styles.itemRowBetween}>
                    <div>
                      <div className={styles.itemName}>{st.name}</div>
                      <div className={styles.itemSub}>{st.designation || 'Staff'}</div>
                    </div>
                    {st.rating > 0 && <span className={styles.rating}>{st.rating.toFixed(1)}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showRejectModal}
        title="Reject business application"
        onClose={() => {
          setShowRejectModal(false);
          setRejectionReason('');
        }}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
              }}
            >
              Cancel
            </button>
            <button type="submit" form="reject-form" className="btn btn-danger">
              Confirm rejection
            </button>
          </>
        }
      >
        <form id="reject-form" onSubmit={handleRejectSubmit}>
          <p className={styles.modalHint}>
            Enter a brief explanation. This reason is logged and visible to the business owner.
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="rejectReason">
              Rejection reason
            </label>
            <textarea
              id="rejectReason"
              className={`input-field ${styles.textarea}`}
              placeholder="e.g. Invalid registration documents..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!docReviewTarget}
        title={docReviewTarget?.approve ? 'Approve document' : 'Reject document'}
        onClose={() => {
          setDocReviewTarget(null);
          setDocReviewNotes('');
        }}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setDocReviewTarget(null);
                setDocReviewNotes('');
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="doc-review-form"
              className={`btn ${docReviewTarget?.approve ? 'btn-primary' : 'btn-danger'}`}
              disabled={actionLoading}
            >
              {docReviewTarget?.approve ? 'Approve' : 'Reject'}
            </button>
          </>
        }
      >
        <form id="doc-review-form" onSubmit={submitDocReview}>
          <p className={styles.modalHint}>
            {docReviewTarget?.approve
              ? `Confirm ${docReviewTarget.label} looks valid. Optional note is saved for the audit trail.`
              : `Explain what is wrong with ${docReviewTarget?.label || 'this document'}. The owner sees this note.`}
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="docReviewNotes">
              {docReviewTarget?.approve ? 'Note (optional)' : 'Rejection note'}
            </label>
            <textarea
              id="docReviewNotes"
              className={`input-field ${styles.textarea}`}
              placeholder={
                docReviewTarget?.approve
                  ? 'Looks valid'
                  : 'e.g. Blurry ID photo — please re-upload a clearer scan'
              }
              value={docReviewNotes}
              onChange={(e) => setDocReviewNotes(e.target.value)}
              required={!docReviewTarget?.approve}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={showSuspendConfirm}
        title="Suspend business"
        message={`Suspend "${business.name}"? This hides the listing and stops bookings.`}
        confirmLabel="Suspend"
        danger
        loading={actionLoading}
        onConfirm={handleSuspend}
        onCancel={() => setShowSuspendConfirm(false)}
      />
    </div>
  );
}
