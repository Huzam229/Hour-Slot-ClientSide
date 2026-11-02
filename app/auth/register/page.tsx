'use client';

import { useState, FormEvent, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Category } from '@/lib/types';
import GeoFields, { type GeoSelection } from '@/components/GeoFields';
import CustomSelect from '@/components/CustomSelect';
import AuthProgress from '../AuthProgress';
import { AuthFlipLink } from '../AuthFlip';
import styles from './register.module.css';

const FALLBACK_CATEGORY_ICONS: Record<string, string> = {
  salon: 'fa-scissors',
  clinic: 'fa-house-medical',
  spa: 'fa-spa',
  dental: 'fa-tooth',
  fitness: 'fa-dumbbell',
  auto: 'fa-car',
  education: 'fa-graduation-cap',
  legal: 'fa-scale-balanced',
};

const ROLE_OPTIONS = [
  {
    value: 'CUSTOMER',
    icon: 'fa-user',
    title: 'Customer',
    desc: 'Book appointments at places you love',
  },
  {
    value: 'INDIVIDUAL',
    icon: 'fa-screwdriver-wrench',
    title: 'Individual',
    desc: 'Offer services without a business team',
  },
  {
    value: 'BUSINESS_OWNER',
    icon: 'fa-store',
    title: 'Business',
    desc: 'List a venue with staff and branches',
  },
] as const;

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function getPasswordStrength(password: string): { level: number; text: string; color: string } {
  if (!password) return { level: 0, text: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { level: 1, text: 'Weak', color: 'weak' };
  if (score <= 3) return { level: 2, text: 'Medium', color: 'medium' };
  return { level: 3, text: 'Strong', color: 'strong' };
}

function roleFromQuery(raw: string | null): 'CUSTOMER' | 'BUSINESS_OWNER' | 'INDIVIDUAL' {
  if (!raw) return 'CUSTOMER';
  const v = raw.toLowerCase();
  if (v === 'business' || v === 'business_owner' || v === 'owner') return 'BUSINESS_OWNER';
  if (v === 'individual' || v === 'provider') return 'INDIVIDUAL';
  return 'CUSTOMER';
}

function FileChip({
  id,
  label,
  hint,
  file,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={`${styles.fileCard} ${file ? styles.fileCardHas : ''}`}>
      <div className={styles.fileHead}>
        <i className={`fa-solid ${file ? 'fa-circle-check' : 'fa-file-arrow-up'}`} />
        {label}
      </div>
      <p className={styles.fileMeta}>
        {file ? file.name : hint}
      </p>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*,.pdf"
        className={styles.fileInput}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <button type="button" className={styles.fileBtn} onClick={() => inputRef.current?.click()}>
        {file ? 'Replace file' : 'Choose file'}
      </button>
    </div>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const isBookingReturn = Boolean(returnUrl?.includes('/profile/book/'));
  const loginHrefPath = returnUrl
    ? `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/auth/login';

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'CUSTOMER' as string,
    password: '',
    confirmPassword: '',
    businessName: '',
    businessCategory: '',
    businessDescription: '',
    registrationNumber: '',
    branchName: 'Main location',
    address: '',
    displayName: '',
    slug: '',
    bio: '',
    serviceMode: 'CUSTOMER_LOCATION',
    yearsExperience: '',
    primaryCategoryId: '',
  });
  const [geo, setGeo] = useState<GeoSelection>({
    countryCode: 'PK',
    region: 'Punjab',
    city: 'Lahore',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
  });
  const [latitude, setLatitude] = useState(31.5204);
  const [longitude, setLongitude] = useState(74.3587);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: number; slug: string; icon: string; label: string }[]>([]);

  const roleQuery = searchParams.get('role');
  useEffect(() => {
    const fromQuery = roleFromQuery(roleQuery);
    setFormData((prev) => (prev.role === fromQuery ? prev : { ...prev, role: fromQuery }));
  }, [roleQuery]);

  const isBusiness = formData.role === 'BUSINESS_OWNER';
  const isIndividual = formData.role === 'INDIVIDUAL';
  const isProvider = isBusiness || isIndividual;
  const isCustomer = formData.role === 'CUSTOMER';

  useEffect(() => {
    apiFetch<Category[]>('/api/public/categories', { skipAuth: true })
      .then((data) => {
        const flat: { id: number; slug: string; icon: string; label: string }[] = [];
        const walk = (nodes: Category[]) => {
          nodes.forEach((n) => {
            flat.push({
              id: n.id,
              slug: n.slug || n.name,
              icon: FALLBACK_CATEGORY_ICONS[(n.slug || '').toLowerCase()] || 'fa-building',
              label: n.name,
            });
            if (n.subcategories?.length) walk(n.subcategories);
          });
        };
        walk(data || []);
        setCategories(flat);
      })
      .catch(() => setCategories([]));
  }, []);

  const errors: Record<string, string | null> = {};
  if (touched.firstName && !formData.firstName) errors.firstName = 'Required.';
  if (touched.lastName && !formData.lastName) errors.lastName = 'Required.';
  if (touched.email) {
    if (!formData.email) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email address.';
  }
  if (touched.phoneNumber) {
    if (!formData.phoneNumber) errors.phoneNumber = 'Phone number is required.';
    else if (!/^[0-9+ ]{10,15}$/.test(formData.phoneNumber)) errors.phoneNumber = 'Invalid format (10-15 chars).';
  }
  if (touched.password) {
    if (!formData.password) errors.password = 'Password is required.';
    else if (formData.password.length < 6) errors.password = 'At least 6 characters.';
  }
  if (touched.confirmPassword) {
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm.';
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords don't match.";
  }
  if (isBusiness && touched.businessName && !formData.businessName) errors.businessName = 'Business name is required.';

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const canProceedAccount = () =>
    Boolean(
      formData.role &&
        formData.firstName &&
        formData.lastName &&
        formData.email &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
        formData.phoneNumber &&
        /^[0-9+ ]{10,15}$/.test(formData.phoneNumber) &&
        formData.password &&
        formData.password.length >= 6 &&
        formData.password === formData.confirmPassword
    );

  const canProceedListing = () => {
    if (isIndividual) {
      return Boolean(
        (formData.displayName || `${formData.firstName} ${formData.lastName}`.trim()) &&
          formData.primaryCategoryId &&
          formData.serviceMode &&
          geo.countryCode &&
          geo.region &&
          geo.city
      );
    }
    if (isBusiness) {
      return Boolean(formData.businessName.trim() && formData.address.trim() && geo.countryCode && geo.city);
    }
    return true;
  };

  /** Clamp step when switching roles so progress always matches the selected path. */
  useEffect(() => {
    if (!isProvider && step > 1) setStep(1);
    else if (isProvider && step > 3) setStep(3);
  }, [formData.role, isProvider, step]);

  const handleRoleChange = (role: string) => {
    handleChange('role', role);
    setErrorMessage(null);
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (step === 1) {
      setTouched((prev) => ({
        ...prev,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        password: true,
        confirmPassword: true,
      }));
      if (!canProceedAccount()) return;
      if (isProvider) {
        if (isIndividual && !formData.displayName) {
          handleChange('displayName', `${formData.firstName} ${formData.lastName}`.trim());
        }
        setStep(2);
      } else {
        void handleSubmit();
      }
      return;
    }
    if (step === 2 && isProvider) {
      if (!canProceedListing()) {
        setErrorMessage(
          isIndividual
            ? 'Display name, category, service mode, and location are required.'
            : 'Business name, address, and location are required.'
        );
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    if (isProvider && step < 3) {
      handleNext();
      return;
    }

    if (!canProceedAccount()) {
      setTouched((prev) => ({
        ...prev,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        password: true,
        confirmPassword: true,
      }));
      setStep(1);
      return;
    }

    if (isProvider && !govIdFile) {
      setErrorMessage('Upload your government ID to continue.');
      return;
    }
    if (isBusiness && !tradeLicenseFile) {
      setErrorMessage('Upload your trade / business license to continue.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const payload: Record<string, string | number | null> = {
      email: formData.email,
      password: formData.password,
      role: isIndividual ? 'CUSTOMER' : formData.role,
      accountType: isIndividual ? 'INDIVIDUAL' : isBusiness ? 'BUSINESS' : 'CUSTOMER',
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber,
    };

    if (isIndividual) {
      const displayName = formData.displayName.trim() || `${formData.firstName} ${formData.lastName}`.trim();
      payload.displayName = displayName;
      payload.slug = slugify(formData.slug || displayName);
      payload.bio = formData.bio.trim() || null;
      payload.serviceMode = formData.serviceMode;
      payload.yearsExperience = formData.yearsExperience ? Number(formData.yearsExperience) : null;
      payload.primaryCategoryId = formData.primaryCategoryId ? Number(formData.primaryCategoryId) : null;
      payload.countryCode = geo.countryCode;
      payload.region = geo.region;
      payload.city = geo.city;
      payload.timezone = geo.timezone || null;
      payload.currency = geo.currency || null;
    }

    if (isBusiness) {
      payload.businessName = formData.businessName.trim();
      payload.businessCategory = formData.businessCategory || null;
      payload.businessDescription = formData.businessDescription.trim() || null;
      payload.registrationNumber = formData.registrationNumber.trim() || null;
      payload.primaryCategoryId = formData.primaryCategoryId ? Number(formData.primaryCategoryId) : null;
      payload.branchName = formData.branchName.trim() || 'Main location';
      payload.address = formData.address.trim();
      payload.latitude = latitude;
      payload.longitude = longitude;
      payload.countryCode = geo.countryCode;
      payload.region = geo.region;
      payload.city = geo.city;
      payload.timezone = geo.timezone || null;
      payload.currency = geo.currency || null;
    }

    try {
      await register(payload, {
        governmentId: isProvider ? govIdFile : null,
        tradeLicense: isBusiness ? tradeLicenseFile : null,
      });
      const params = new URLSearchParams({ registered: '1', email: formData.email });
      if (returnUrl) params.set('returnUrl', returnUrl);
      router.push(`/auth/login?${params.toString()}`);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string };
      setLoading(false);
      setErrorMessage(e?.error?.message || e?.message || 'Registration failed. Please try again.');
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const stepperSteps = (() => {
    if (isIndividual) {
      return [
        { id: 'account', label: 'Account' },
        { id: 'profile', label: 'Profile' },
        { id: 'id', label: 'ID' },
      ];
    }
    if (isBusiness) {
      return [
        { id: 'account', label: 'Account' },
        { id: 'business', label: 'Business' },
        { id: 'docs', label: 'Docs' },
      ];
    }
    return [{ id: 'account', label: 'Account' }];
  })();

  const primaryLabel =
    step === 1
      ? isProvider
        ? 'Continue'
        : loading
          ? 'Creating…'
          : 'Create account'
      : step === 2
        ? 'Continue'
        : loading
          ? 'Creating…'
          : 'Create account';

  const onPrimary = () => {
    if ((step === 1 && !isProvider) || step === 3) {
      void handleSubmit();
      return;
    }
    handleNext();
  };

  const primaryDisabled =
    loading ||
    (step === 1 && !canProceedAccount()) ||
    (step === 3 && isProvider && (!govIdFile || (isBusiness && !tradeLicenseFile)));

  const roleTabs = (
    <div className={styles.roleSticky}>
      <div className={styles.roleSeg} role="radiogroup" aria-label="Account type">
        {ROLE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`${styles.rolePill} ${formData.role === opt.value ? styles.rolePillOn : ''}`}
          >
            <input
              type="radio"
              name="role"
              value={opt.value}
              className={styles.hiddenRadio}
              checked={formData.role === opt.value}
              onChange={() => handleRoleChange(opt.value)}
            />
            <span className={styles.rolePillIcon}>
              <i className={`fa-solid ${opt.icon}`} />
            </span>
            <span className={styles.rolePillCopy}>
              <span className={styles.rolePillTitle}>{opt.title}</span>
            </span>
          </label>
        ))}
      </div>
      <p className={styles.roleHint}>
        {ROLE_OPTIONS.find((o) => o.value === formData.role)?.desc}
      </p>
    </div>
  );

  return (
    <div className={styles.frame}>
      <header className={styles.head}>
        <div className={styles.headCopy}>
          <p className={styles.eyebrow}>Join Duemet</p>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>
            {isCustomer
              ? 'Enter your details to start booking.'
              : isIndividual
                ? 'Set up your professional profile after your account basics.'
                : 'List your business after confirming your account details.'}
          </p>
        </div>
        <div className={styles.stepperWrap}>
          <AuthProgress steps={stepperSteps} current={step - 1} />
        </div>
      </header>

      <div className={styles.body}>
        {isBookingReturn && (
          <div className={`${styles.banner} ${styles.bannerInfo}`}>
            <i className="fa-solid fa-circle-info" />
            Create an account to confirm your booking — your selections are saved.
          </div>
        )}
        {errorMessage && (
          <div className={`${styles.banner} ${styles.bannerError}`}>
            <i className="fa-solid fa-triangle-exclamation" />
            {errorMessage}
          </div>
        )}

        {roleTabs}

        {step === 1 && (
          <div className={styles.stepPane}>
            <p className={styles.stepLabel}>Account details</p>
            <div className={styles.fields}>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label htmlFor="reg-firstName">First name</label>
                  <input
                    id="reg-firstName"
                    type="text"
                    className={`${styles.input}${errors.firstName ? ` ${styles.inputError}` : ''}`}
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                  />
                  {errors.firstName && <span className={styles.fieldError}>{errors.firstName}</span>}
                </div>
                <div className={styles.field}>
                  <label htmlFor="reg-lastName">Last name</label>
                  <input
                    id="reg-lastName"
                    type="text"
                    className={`${styles.input}${errors.lastName ? ` ${styles.inputError}` : ''}`}
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                  />
                  {errors.lastName && <span className={styles.fieldError}>{errors.lastName}</span>}
                </div>
              </div>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label htmlFor="reg-email">Email</label>
                  <input
                    id="reg-email"
                    type="email"
                    className={`${styles.input}${errors.email ? ` ${styles.inputError}` : ''}`}
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    autoComplete="email"
                  />
                  {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
                </div>
                <div className={styles.field}>
                  <label htmlFor="reg-phone">Phone</label>
                  <input
                    id="reg-phone"
                    type="text"
                    className={`${styles.input}${errors.phoneNumber ? ` ${styles.inputError}` : ''}`}
                    placeholder="+92 300 1234567"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    onBlur={() => handleBlur('phoneNumber')}
                  />
                  {errors.phoneNumber && <span className={styles.fieldError}>{errors.phoneNumber}</span>}
                </div>
              </div>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label htmlFor="reg-password">Password</label>
                  <div className={styles.passwordWrap}>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      className={`${styles.input}${errors.password ? ` ${styles.inputError}` : ''}`}
                      placeholder="Min 6 characters"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                  </div>
                  {formData.password && (
                    <div className={styles.passwordStrength}>
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`${styles.strengthBar} ${i <= passwordStrength.level ? styles[passwordStrength.color] : ''}`}
                        />
                      ))}
                    </div>
                  )}
                  {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
                </div>
                <div className={styles.field}>
                  <label htmlFor="reg-confirmPassword">Confirm password</label>
                  <input
                    id="reg-confirmPassword"
                    type="password"
                    className={`${styles.input}${errors.confirmPassword ? ` ${styles.inputError}` : ''}`}
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    autoComplete="new-password"
                  />
                  {errors.confirmPassword && (
                    <span className={styles.fieldError}>{errors.confirmPassword}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && isIndividual && (
          <div className={styles.stepPane}>
            <p className={styles.stepLabel}>Professional listing</p>
            <div className={styles.fields}>
              <div className={styles.grid3}>
                <div className={styles.field}>
                  <label htmlFor="reg-displayName">Display name</label>
                  <input
                    id="reg-displayName"
                    type="text"
                    className={styles.input}
                    value={formData.displayName}
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    placeholder="Ayesha Khan"
                  />
                </div>
                <div className={styles.field}>
                  <label>Category</label>
                  <CustomSelect
                    value={formData.primaryCategoryId}
                    onChange={(v) => handleChange('primaryCategoryId', v)}
                    options={categories.map((c) => ({ value: String(c.id), label: c.label }))}
                    placeholder="Select"
                  />
                </div>
                <div className={styles.field}>
                  <label>How you work</label>
                  <CustomSelect
                    value={formData.serviceMode}
                    onChange={(v) => handleChange('serviceMode', v)}
                    options={[
                      { value: 'CUSTOMER_LOCATION', label: 'I visit clients' },
                      { value: 'AT_PROVIDER', label: 'Clients visit me' },
                      { value: 'HYBRID', label: 'Both' },
                    ]}
                  />
                </div>
              </div>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label htmlFor="reg-slug">Public slug</label>
                  <input
                    id="reg-slug"
                    type="text"
                    className={styles.input}
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    placeholder={slugify(formData.displayName || 'your-name')}
                  />
                  <span className={styles.hint}>
                    /b/{slugify(formData.slug || formData.displayName || 'your-name')}
                  </span>
                </div>
                <div className={styles.field}>
                  <label htmlFor="reg-years">Years of experience</label>
                  <input
                    id="reg-years"
                    type="number"
                    min={0}
                    className={styles.input}
                    value={formData.yearsExperience}
                    onChange={(e) => handleChange('yearsExperience', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className={styles.geoBlock}>
                <GeoFields
                  compact
                  value={geo}
                  onChange={setGeo}
                  geocodeOnCity
                  onGeocoded={(c) => {
                    setLatitude(c.lat);
                    setLongitude(c.lon);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && isBusiness && (
          <div className={styles.stepPane}>
            <p className={styles.stepLabel}>Business details</p>
            <div className={styles.fields}>
              <div className={styles.grid3}>
                <div className={styles.field}>
                  <label htmlFor="reg-bizName">Business name</label>
                  <input
                    id="reg-bizName"
                    type="text"
                    className={`${styles.input}${errors.businessName ? ` ${styles.inputError}` : ''}`}
                    placeholder="Elite Salon & Spa"
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    onBlur={() => handleBlur('businessName')}
                  />
                  {errors.businessName && (
                    <span className={styles.fieldError}>{errors.businessName}</span>
                  )}
                </div>
                <div className={styles.field}>
                  <label>Primary category</label>
                  <CustomSelect
                    value={formData.primaryCategoryId}
                    onChange={(v) => {
                      handleChange('primaryCategoryId', v);
                      const cat = categories.find((c) => String(c.id) === v);
                      if (cat) handleChange('businessCategory', cat.slug);
                    }}
                    options={categories.map((c) => ({ value: String(c.id), label: c.label }))}
                    placeholder="Select category"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="reg-regNo">Registration no.</label>
                  <input
                    id="reg-regNo"
                    type="text"
                    className={styles.input}
                    value={formData.registrationNumber}
                    onChange={(e) => handleChange('registrationNumber', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="reg-address">Main location address</label>
                <input
                  id="reg-address"
                  type="text"
                  className={styles.input}
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div className={styles.geoBlock}>
                <GeoFields
                  compact
                  value={geo}
                  onChange={setGeo}
                  geocodeOnCity
                  onGeocoded={(c) => {
                    setLatitude(c.lat);
                    setLongitude(c.lon);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && isProvider && (
          <div className={styles.stepPane}>
            <p className={styles.stepLabel}>
              {isIndividual ? 'Identity verification' : 'Business documents'}
            </p>
            <p className={styles.hint} style={{ marginBottom: 10 }}>
              {isIndividual
                ? 'Upload a government ID for listing review. Extra documents can be added after login.'
                : 'Owner ID and trade license for review. Tax/bank docs can wait until after approval.'}
            </p>
            <div className={`${styles.fileRow} ${isIndividual ? styles.fileRowSingle : ''}`}>
              <FileChip
                id="reg-gov-id"
                label="Government ID *"
                hint="National ID, passport, or driver’s license"
                file={govIdFile}
                onChange={setGovIdFile}
              />
              {isBusiness && (
                <FileChip
                  id="reg-trade"
                  label="Trade / business license *"
                  hint="Registration or shop permit matching your business name"
                  file={tradeLicenseFile}
                  onChange={setTradeLicenseFile}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <footer className={styles.foot}>
        <p className={styles.footLink}>
          Already have an account?{' '}
          <AuthFlipLink href={loginHrefPath} direction={-1}>
            Sign in
          </AuthFlipLink>
        </p>
        <div className={styles.actions}>
          {step > 1 && (
            <button type="button" className={styles.btnGhost} onClick={handleBack} disabled={loading}>
              Back
            </button>
          )}
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={onPrimary}
            disabled={primaryDisabled}
          >
            {loading && ((step === 1 && !isProvider) || step === 3) ? (
              <>
                <span className="spinner" /> Creating…
              </>
            ) : (
              primaryLabel
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.frame} style={{ alignItems: 'center', justifyContent: 'center' }}>
          Loading…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
