'use client';

import type { Branch, Service, Staff } from '@/lib/types';
import { ANY_STAFF_ID } from '@/lib/booking-flow';
import EmptyState from '@/components/EmptyState';
import CustomSelect from '@/components/CustomSelect';
import styles from './booking.module.css';

interface DetailsStepProps {
  branches: Branch[];
  staff: Staff[];
  services?: Service[];
  selectedBranchId: string;
  selectedStaffId: string;
  selectedServiceId?: string;
  onBranchChange: (branchId: string) => void;
  onStaffChange: (staffId: string) => void;
}

function staffOffersService(member: Staff, serviceId: string | undefined, roster: Staff[]) {
  if (!serviceId) return true;
  const anyoneMapped = roster.some((s) => (s.services || []).length > 0);
  const allocated = member.services || [];
  if (!anyoneMapped) return true;
  return allocated.some((svc) => String(svc.id) === serviceId);
}

export default function DetailsStep({
  branches,
  staff,
  selectedBranchId,
  selectedStaffId,
  selectedServiceId,
  onBranchChange,
  onStaffChange,
}: DetailsStepProps) {
  const branchStaff = staff
    .filter((s) => !selectedBranchId || s.branch?.id?.toString() === selectedBranchId)
    .slice()
    .sort((a, b) => {
      const aFits = staffOffersService(a, selectedServiceId, staff) ? 0 : 1;
      const bFits = staffOffersService(b, selectedServiceId, staff) ? 0 : 1;
      if (aFits !== bFits) return aFits - bFits;
      return (a.name || '').localeCompare(b.name || '');
    });
  const offeringCount = branchStaff.filter((s) => staffOffersService(s, selectedServiceId, staff)).length;

  return (
    <>
      {branches.length > 1 && (
        <div className={styles.fieldBlock}>
          <label htmlFor="bookingBranch">Location</label>
          <CustomSelect
            id="bookingBranch"
            options={branches.map((b) => ({
              value: String(b.id),
              label: b.name,
              sublabel: b.address,
            }))}
            value={String(selectedBranchId || '')}
            onChange={onBranchChange}
            placeholder="Select a location"
            searchable={branches.length > 6}
          />
        </div>
      )}

      {branches.length === 1 && selectedBranchId && (
        <div className={styles.fieldBlock}>
          <label>Location</label>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-location-dot" style={{ color: 'var(--accent-primary)', marginRight: 8 }} />
            {branches[0].name} — {branches[0].address}
          </p>
        </div>
      )}

      <div className={styles.fieldBlock}>
        <label>Specialist</label>
        <p className={styles.staffHint}>
          Choose <strong>Any available</strong> to see every free specialist, or pick one person to see only their times.
          {selectedServiceId && offeringCount > 0
            ? ` ${offeringCount} ${offeringCount === 1 ? 'person offers' : 'people offer'} this service.`
            : ''}
        </p>
        <div className={styles.staffList}>
          <button
            type="button"
            className={`${styles.staffCard} ${selectedStaffId === ANY_STAFF_ID ? styles.staffCardOn : ''}`}
            onClick={() => onStaffChange(ANY_STAFF_ID)}
          >
            <div className={styles.staffAvatar}>
              <i className="fa-solid fa-user-group" />
            </div>
            <div>
              <strong>Any available specialist</strong>
              <span>Show combined open times for everyone who offers this service</span>
            </div>
            {selectedStaffId === ANY_STAFF_ID && (
              <span className={styles.staffCheck} aria-hidden>
                <i className="fa-solid fa-check" />
              </span>
            )}
          </button>
          {branchStaff.length === 0 ? (
            <EmptyState
              icon="fa-user-group"
              title="No specialists listed"
              description="You can still book with any available staff."
            />
          ) : (
            branchStaff.map((s) => {
              const on = selectedStaffId === String(s.id);
              const offers = staffOffersService(s, selectedServiceId, staff);
              const serviceNames = (s.services || []).map((svc) => svc.name).filter(Boolean);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.staffCard} ${on ? styles.staffCardOn : ''} ${offers ? '' : styles.staffCardMuted}`}
                  disabled={!offers}
                  onClick={() => offers && onStaffChange(String(s.id))}
                >
                  <div className={styles.staffAvatar}>{(s.name || '?').charAt(0)}</div>
                  <div>
                    <strong>{s.name || 'Team member'}</strong>
                    <span>{s.specialty || s.designation || 'Team member'}</span>
                    {serviceNames.length > 0 && (
                      <div className={styles.serviceChips}>
                        {serviceNames.map((name) => (
                          <em key={name} className={styles.serviceChip}>
                            {name}
                          </em>
                        ))}
                      </div>
                    )}
                    {!offers && <span className={styles.staffWarn}>Does not offer this service</span>}
                  </div>
                  {on && (
                    <span className={styles.staffCheck} aria-hidden>
                      <i className="fa-solid fa-check" />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
