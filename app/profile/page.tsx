'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import AppAccessCard from '@/components/AppAccessCard';
import PageHeader from '@/components/PageHeader';
import FormField from '@/components/FormField';
import Skeleton from '@/components/Skeleton';
import styles from './profile.module.css';

interface ProfileData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
}

interface NotificationPrefs {
  emailBooking: boolean;
  smsReminder: boolean;
  emailMarketing: boolean;
}

export default function ProfilePage() {
  const { user, logout, updateSession } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'notifications'>('personal');

  const [emailNotify, setEmailNotify] = useState(true);
  const [smsNotify, setSmsNotify] = useState(true);
  const [marketingNotify, setMarketingNotify] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);

  useEffect(() => {
    apiFetch<ProfileData>('/api/users/me')
      .then((data) => {
        setProfile(data);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setPhoneNumber(data.phoneNumber || '');
      })
      .catch(() => {
        if (user) {
          setProfile({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          });
          setFirstName(user.firstName || '');
          setLastName(user.lastName || '');
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (activeTab !== 'notifications') return;
    setPrefsLoading(true);
    apiFetch<NotificationPrefs>('/api/users/me/notification-preferences')
      .then((prefs) => {
        setEmailNotify(prefs.emailBooking);
        setSmsNotify(prefs.smsReminder);
        setMarketingNotify(prefs.emailMarketing);
      })
      .catch(() => {
        setError('Could not load notification preferences.');
      })
      .finally(() => setPrefsLoading(false));
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    router.push('/profile/explore');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      setSaving(false);
      return;
    }

    try {
      await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName,
          lastName,
          phoneNumber,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      setMessage('Profile details updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      updateSession({ firstName, lastName });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/api/users/me/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify({
          emailBooking: emailNotify,
          smsReminder: smsNotify,
          emailMarketing: marketingNotify,
        }),
      });
      setMessage('Notification preferences saved successfully!');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Could not save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className={styles.profileContainer}>
        <PageHeader title="My Account" subtitle="Manage your personal details and login credentials." />
        <div className={styles.skeletonWrap}>
          <Skeleton variant="title" />
          <Skeleton variant="card" height={160} />
          <Skeleton variant="card" height={280} />
        </div>
      </div>
    );
  }

  const initials = `${firstName?.charAt(0) || 'U'}${lastName?.charAt(0) || ''}`;

  const fields = [firstName.trim(), lastName.trim(), phoneNumber.trim(), profile.email];
  const filledCount = fields.filter(Boolean).length;
  const completionPercent = Math.round((filledCount / fields.length) * 100);

  const isLengthValid = newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatchValid = newPassword === confirmPassword && newPassword !== '';

  return (
    <div className={styles.profileContainer}>
      <PageHeader
        title="My Account"
        subtitle="Manage your personal details and login credentials."
      />

      {message && (
        <div className="success-alert" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-circle-check" /> {message}
        </div>
      )}
      {error && (
        <div className="error-alert" style={{ marginBottom: 16 }}>
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      <AppAccessCard />

      <div className={styles.quickLinks}>
        <Link href="/profile/bookings" className={styles.quickLink}>
          <i className="fa-solid fa-calendar-check" />
          <span>My Bookings</span>
        </Link>
        <Link href="/profile/favorites" className={styles.quickLink}>
          <i className="fa-solid fa-heart" />
          <span>Favorites</span>
        </Link>
        <Link href="/profile/packages" className={styles.quickLink}>
          <i className="fa-solid fa-box-open" />
          <span>Packages</span>
        </Link>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <i className="fa-solid fa-user-shield" />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{completionPercent}%</div>
            <div className={styles.statLabel}>Profile Strength</div>
            <div className={styles.progressBarOuter}>
              <div className={styles.progressBarInner} style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <i className="fa-solid fa-shield-halved" style={{ color: newPassword ? '#d97706' : '#059669' }} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{newPassword ? 'Updating' : 'Secure'}</div>
            <div className={styles.statLabel}>Credentials Status</div>
          </div>
        </div>
      </div>

      <div className={styles.profileGrid}>
        <div className={styles.profileCard}>
          <div className={styles.avatarCircle}>{initials}</div>
          <h4>
            {firstName} {lastName}
          </h4>
          <span className={styles.roleBadge}>{(profile.role || 'UNKNOWN').replaceAll('_', ' ')}</span>

          <div className={styles.metaSection}>
            <div className={styles.metaItem}>
              <i className="fa-regular fa-envelope" />
              <span>{profile.email}</span>
            </div>
            <div className={styles.metaItem}>
              <i className="fa-solid fa-id-badge" />
              <span>User ID: #{profile.id}</span>
            </div>
            <div className={styles.metaItem}>
              <i className="fa-solid fa-circle-check" style={{ color: '#059669' }} />
              <span>Account Status: Active</span>
            </div>
          </div>

          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 6 }} /> Sign out
          </button>
        </div>

        <div className={styles.tabsCard}>
          <div className={styles.tabsHeader}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'personal' ? styles.tabBtnActive : ''}`}
              onClick={() => {
                setActiveTab('personal');
                setMessage(null);
                setError(null);
              }}
            >
              Personal details
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'security' ? styles.tabBtnActive : ''}`}
              onClick={() => {
                setActiveTab('security');
                setMessage(null);
                setError(null);
              }}
            >
              Password & security
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'notifications' ? styles.tabBtnActive : ''}`}
              onClick={() => {
                setActiveTab('notifications');
                setMessage(null);
                setError(null);
              }}
            >
              Notifications
            </button>
          </div>

          {activeTab === 'personal' && (
            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.detailsCard}>
                <h3>Personal information</h3>
                <div className={styles.detailsGrid}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="firstNameInput">
                      First name:
                    </label>
                    <input
                      id="firstNameInput"
                      type="text"
                      className="input-field"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="lastNameInput">
                      Last name:
                    </label>
                    <input
                      id="lastNameInput"
                      type="text"
                      className="input-field"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="emailInput">
                      Email address:
                    </label>
                    <input
                      id="emailInput"
                      type="email"
                      className="input-field"
                      value={profile.email}
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="phoneInput">
                      Phone:
                    </label>
                    <input
                      id="phoneInput"
                      type="tel"
                      className="input-field"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving changes…' : 'Save changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.detailsCard}>
                <h3>Password configuration</h3>
                <div className={styles.detailsGrid}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="currentPassInput">
                      Current password:
                    </label>
                    <input
                      id="currentPassInput"
                      type="password"
                      className="input-field"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div className={styles.twoCol} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="newPassInput">
                          New password:
                        </label>
                        <input
                          id="newPassInput"
                          type="password"
                          className="input-field"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="confirmPassInput">
                          Confirm new password:
                        </label>
                        <input
                          id="confirmPassInput"
                          type="password"
                          className="input-field"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {newPassword && (
                  <div className={styles.securityHints}>
                    <span className={styles.securityTitle}>Password requirements checklist:</span>
                    <div className={styles.securityHint}>
                      <i className={`fa-solid ${isLengthValid ? 'fa-circle-check ' + styles.securityHintCheck : 'fa-circle-xmark ' + styles.securityHintCross}`} />
                      <span>At least 8 characters long</span>
                    </div>
                    <div className={styles.securityHint}>
                      <i className={`fa-solid ${hasNumber ? 'fa-circle-check ' + styles.securityHintCheck : 'fa-circle-xmark ' + styles.securityHintCross}`} />
                      <span>Contains a number or symbol</span>
                    </div>
                    <div className={styles.securityHint}>
                      <i className={`fa-solid ${isMatchValid ? 'fa-circle-check ' + styles.securityHintCheck : 'fa-circle-xmark ' + styles.securityHintCross}`} />
                      <span>Passwords match correctly</span>
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.formActions}>
                <button type="submit" className="btn btn-primary" disabled={saving || (newPassword !== '' && (!isLengthValid || !hasNumber || !isMatchValid))}>
                  {saving ? 'Updating security…' : 'Update password'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <form onSubmit={handleSavePreferences} className={styles.form}>
              <div className={styles.detailsCard}>
                <h3>Communication preferences</h3>
                {prefsLoading ? (
                  <p>Loading preferences…</p>
                ) : (
                  <div className={styles.checkboxList}>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={emailNotify}
                        onChange={(e) => setEmailNotify(e.target.checked)}
                      />
                      <div className={styles.checkboxLabelInfo}>
                        <span className={styles.checkboxLabelText}>Email booking confirmations</span>
                        <span className={styles.checkboxLabelDesc}>Receive confirmations and rescheduling notices by email when SMTP is configured.</span>
                      </div>
                    </label>

                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={smsNotify}
                        onChange={(e) => setSmsNotify(e.target.checked)}
                      />
                      <div className={styles.checkboxLabelInfo}>
                        <span className={styles.checkboxLabelText}>SMS appointment reminders</span>
                        <span className={styles.checkboxLabelDesc}>Saved for when SMS is enabled on your plan. Not sent yet.</span>
                      </div>
                    </label>

                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={marketingNotify}
                        onChange={(e) => setMarketingNotify(e.target.checked)}
                      />
                      <div className={styles.checkboxLabelInfo}>
                        <span className={styles.checkboxLabelText}>Marketing &amp; special offers</span>
                        <span className={styles.checkboxLabelDesc}>Opt in to hear about promotions and package deals.</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
              <div className={styles.formActions}>
                <button type="submit" className="btn btn-primary" disabled={saving || prefsLoading}>
                  {saving ? 'Saving preferences…' : 'Save preferences'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
