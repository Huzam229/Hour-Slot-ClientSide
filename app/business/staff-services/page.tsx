'use client';

import { useState, useEffect, FormEvent, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import CustomSelect from '@/components/CustomSelect';
import { formatMoney } from '@/lib/money';
import styles from './staff-services.module.css';

interface Staff {
  id: number;
  name?: string;
  displayName?: string;
  specialty?: string;
  designation?: string;
  branch?: { id: number; name?: string };
}

interface Service {
  id: number;
  name: string;
  price: number;
  currency?: string;
}

interface StaffServiceAssignment {
  id: number;
  staff: Staff;
  service: Service;
  priceOverride?: number | null;
}

function staffLabel(staff?: Staff | null) {
  return staff?.name || staff?.displayName || 'Unknown staff';
}

export default function StaffServicesPage() {
  const [assignments, setAssignments] = useState<StaffServiceAssignment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<StaffServiceAssignment | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    staffId: '',
    serviceId: '',
    priceOverride: '',
    useDefaultPrice: true,
  });

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assigns, staff, svcs] = await Promise.all([
        apiFetch<StaffServiceAssignment[]>('/api/business/staff-services'),
        apiFetch<Staff[]>('/api/business/staff'),
        apiFetch<Service[]>('/api/business/services'),
      ]);
      setAssignments(Array.isArray(assigns) ? assigns : []);
      setStaffList(Array.isArray(staff) ? staff : []);
      setServices(Array.isArray(svcs) ? svcs : []);
    } catch (err: any) {
      setError(err?.message || 'Could not load staff-services mappings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const resolveStaff = (assign: StaffServiceAssignment) => {
    const nested = assign.staff;
    if (nested?.name || nested?.displayName) {
      return nested;
    }
    return staffList.find((s) => s.id === nested?.id) || nested;
  };

  const resolveService = (assign: StaffServiceAssignment) => {
    const nested = assign.service;
    if (nested?.name) {
      return nested;
    }
    return services.find((s) => s.id === nested?.id) || nested;
  };

  const assignedPair = (staffId: number, serviceId: number) =>
    assignments.some((a) => a.staff?.id === staffId && a.service?.id === serviceId);

  const serviceGroups = useMemo(() => {
    const map = new Map<number, { service: Service; rows: StaffServiceAssignment[] }>();
    for (const assign of assignments) {
      const service = resolveService(assign);
      if (!service?.id) continue;
      const current = map.get(service.id) || { service, rows: [] };
      current.rows.push(assign);
      map.set(service.id, current);
    }
    return Array.from(map.values()).sort((a, b) => a.service.name.localeCompare(b.service.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, staffList, services]);

  const unassignedStaff = useMemo(() => {
    const assignedIds = new Set(assignments.map((a) => a.staff?.id).filter(Boolean));
    return staffList.filter((s) => !assignedIds.has(s.id));
  }, [assignments, staffList]);

  const availableStaffForForm = useMemo(() => {
    if (editingAssignment) return staffList;
    const serviceId = Number(formData.serviceId);
    if (!serviceId) return staffList;
    return staffList.filter((s) => !assignedPair(s.id, serviceId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffList, formData.serviceId, assignments, editingAssignment]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const staffAlreadyOnService = (staffId: string, serviceId: string) =>
    assignments.some((a) => String(a.staff?.id) === staffId && String(a.service?.id) === serviceId);

  const firstFreeStaffForService = (serviceId: string, preferredStaffId?: string) => {
    if (preferredStaffId && !staffAlreadyOnService(preferredStaffId, serviceId)) {
      return preferredStaffId;
    }
    const taken = new Set(
      assignments.filter((a) => String(a.service?.id) === serviceId).map((a) => String(a.staff?.id))
    );
    const firstFree = staffList.find((s) => !taken.has(String(s.id)));
    return firstFree ? String(firstFree.id) : '';
  };

  const openAssign = (preset?: { staffId?: string; serviceId?: string }) => {
    setEditingAssignment(null);
    let serviceId = preset?.serviceId || (services[0] ? String(services[0].id) : '');
    if (preset?.staffId && !preset?.serviceId) {
      const already = new Set(
        assignments.filter((a) => String(a.staff?.id) === preset.staffId).map((a) => String(a.service?.id))
      );
      const nextService = services.find((s) => !already.has(String(s.id)));
      if (nextService) serviceId = String(nextService.id);
    }
    setFormData({
      staffId: firstFreeStaffForService(serviceId, preset?.staffId),
      serviceId,
      priceOverride: '',
      useDefaultPrice: true,
    });
    setShowModal(true);
  };

  const handleAddClick = () => openAssign();

  const handleEditClick = (assign: StaffServiceAssignment) => {
    const staff = resolveStaff(assign);
    const service = resolveService(assign);
    setEditingAssignment(assign);
    setFormData({
      staffId: staff?.id?.toString() || '',
      serviceId: service?.id?.toString() || '',
      priceOverride: assign.priceOverride != null ? String(assign.priceOverride) : '',
      useDefaultPrice: assign.priceOverride === null || assign.priceOverride === undefined,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.staffId || !formData.serviceId) {
      setError('Please select a staff member and service.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const payload = {
      staffId: parseInt(formData.staffId, 10),
      serviceId: parseInt(formData.serviceId, 10),
      priceOverride: formData.useDefaultPrice ? null : parseFloat(formData.priceOverride),
    };

    try {
      if (editingAssignment) {
        await apiFetch(`/api/business/staff-services/${editingAssignment.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setMessage('Assignment price updated successfully!');
      } else {
        await apiFetch('/api/business/staff-services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage('Service assigned to staff member!');
      }
      setShowModal(false);
      await loadInitialData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save mapping.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/business/staff-services/${deleteId}`, { method: 'DELETE' });
      setMessage('Assignment removed successfully.');
      setDeleteId(null);
      await loadInitialData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete assignment.');
    } finally {
      setDeleting(false);
    }
  };

  const money = (amount: number | null | undefined, code?: string) => formatMoney(amount, code);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Staff services"
        subtitle="Assign the same service to as many specialists as you need. Customers will see who is free at each time."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddClick}
            disabled={staffList.length === 0 || services.length === 0}
          >
            <i className="fa-solid fa-plus" /> Assign service
          </button>
        }
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

      {loading ? (
        <Skeleton variant="row" count={4} />
      ) : staffList.length === 0 || services.length === 0 ? (
        <EmptyState
          icon="fa-handshake"
          title="Requirements missing"
          description="You need at least one staff member and one service to configure assignments."
        />
      ) : (
        <>
          <section className={styles.teamSection}>
            <h3>Team at this business ({staffList.length})</h3>
            <div className={styles.teamGrid}>
              {staffList.map((member) => {
                const offered = assignments.filter((a) => a.staff?.id === member.id);
                return (
                  <div key={member.id} className={styles.teamCard}>
                    <strong>{staffLabel(member)}</strong>
                    <span>
                      {member.specialty || member.designation || 'Team member'}
                      {member.branch?.name ? ` · ${member.branch.name}` : ''}
                    </span>
                    {offered.length === 0 ? (
                      <em className={styles.unassigned}>No services assigned yet</em>
                    ) : (
                      <div className={styles.chipRow}>
                        {offered.map((a) => (
                          <em key={a.id} className={styles.chip}>
                            {resolveService(a)?.name || 'Service'}
                          </em>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => openAssign({ staffId: String(member.id) })}
                    >
                      Assign a service
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {serviceGroups.length === 0 ? (
            <EmptyState
              icon="fa-list"
              title="No assignments created"
              description="Assign a service to each consultant. Several people can offer the same service."
              actionLabel="Assign service"
              onAction={handleAddClick}
            />
          ) : (
            <div className={styles.serviceGroups}>
              {serviceGroups.map((group) => (
                <section key={group.service.id} className={styles.serviceCard}>
                  <header className={styles.serviceHead}>
                    <div>
                      <h3>{group.service.name}</h3>
                      <p>
                        {group.rows.length} {group.rows.length === 1 ? 'specialist' : 'specialists'} · default{' '}
                        {money(group.service.price, group.service.currency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => openAssign({ serviceId: String(group.service.id) })}
                    >
                      Add another specialist
                    </button>
                  </header>
                  <ul className={styles.specialistList}>
                    {group.rows.map((row) => {
                      const staff = resolveStaff(row);
                      const service = resolveService(row);
                      return (
                        <li key={row.id} className={styles.specialistRow}>
                          <div>
                            <strong>{staffLabel(staff)}</strong>
                            <span>
                              {staff?.specialty || staff?.designation || 'Team member'}
                              {staff?.branch?.name ? ` · ${staff.branch.name}` : ''}
                            </span>
                          </div>
                          <div className={styles.rate}>
                            {row.priceOverride != null
                              ? `${money(row.priceOverride, service?.currency)} override`
                              : `Default (${money(service?.price, service?.currency)})`}
                          </div>
                          <div className={styles.actions}>
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => handleEditClick(row)}>
                              Change rate
                            </button>
                            <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(row.id)}>
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {unassignedStaff.length > 0 && serviceGroups.length > 0 && (
            <p className={styles.unassignedNote}>
              {unassignedStaff.map((s) => staffLabel(s)).join(', ')}{' '}
              {unassignedStaff.length === 1 ? 'has' : 'have'} no services yet — assign them so they appear in booking.
            </p>
          )}
        </>
      )}

      <Modal
        open={showModal}
        title={editingAssignment ? 'Update specialty rate' : 'Assign service'}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              form="assign-form"
              className="btn btn-primary"
              disabled={submitting || (!editingAssignment && !formData.staffId)}
            >
              {submitting ? 'Saving...' : editingAssignment ? 'Save changes' : 'Confirm assignment'}
            </button>
          </>
        }
      >
        <form id="assign-form" onSubmit={handleSubmit} className={styles.form}>
          <p className={styles.formHint}>
            The same service can be assigned to multiple consultants. Each person gets their own row and schedule.
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="serviceSelect">
              Service
            </label>
            <CustomSelect
              id="serviceSelect"
              options={services.map((svc) => ({
                value: String(svc.id),
                label: svc.name,
                sublabel: money(svc.price, svc.currency),
              }))}
              value={String(formData.serviceId || '')}
              onChange={(value) => {
                setFormData((prev) => ({
                  ...prev,
                  serviceId: value,
                  staffId: editingAssignment ? prev.staffId : firstFreeStaffForService(value, prev.staffId),
                }));
              }}
              placeholder="Select service"
              disabled={!!editingAssignment}
              searchable={services.length > 6}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staffSelect">
              Staff member
            </label>
            <CustomSelect
              id="staffSelect"
              options={
                availableStaffForForm.length === 0
                  ? [{ value: '', label: 'All specialists already offer this service' }]
                  : availableStaffForForm.map((s) => ({
                      value: String(s.id),
                      label: staffLabel(s),
                      sublabel: [
                        s.specialty || s.designation || 'Generalist',
                        s.branch?.name,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    }))
              }
              value={String(formData.staffId || '')}
              onChange={(value) => handleInputChange('staffId', value)}
              placeholder="Select staff member"
              disabled={!!editingAssignment || availableStaffForForm.length === 0}
              searchable={availableStaffForForm.length > 6}
            />
          </div>
          <div className={styles.checkRow}>
            <input
              id="useDefaultPrice"
              type="checkbox"
              checked={formData.useDefaultPrice}
              onChange={(e) => handleInputChange('useDefaultPrice', e.target.checked)}
            />
            <label htmlFor="useDefaultPrice" className="form-label">
              Use service default price
            </label>
          </div>
          {!formData.useDefaultPrice && (
            <div className="form-group">
              <label className="form-label" htmlFor="priceOverrideInput">
                Custom specialist rate
              </label>
              <input
                id="priceOverrideInput"
                type="number"
                step="0.01"
                className="input-field"
                value={formData.priceOverride}
                onChange={(e) => handleInputChange('priceOverride', e.target.value)}
              />
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Remove assignment"
        message="Remove this service assignment?"
        confirmLabel="Remove"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
