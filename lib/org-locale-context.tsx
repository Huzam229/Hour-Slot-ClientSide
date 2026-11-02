'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatMoney as formatMoneyUtil } from '@/lib/money';

export type OrgLocale = {
  id?: number;
  defaultCurrency: string;
  countryCode?: string;
  region?: string;
  city?: string;
  timezone?: string;
};

type OrgLocaleContextValue = {
  locale: OrgLocale;
  currency: string;
  loaded: boolean;
  refresh: () => Promise<void>;
  format: (amount: number | string | null | undefined) => string;
};

const DEFAULT_LOCALE: OrgLocale = { defaultCurrency: 'USD' };

const OrgLocaleContext = createContext<OrgLocaleContextValue>({
  locale: DEFAULT_LOCALE,
  currency: 'USD',
  loaded: false,
  refresh: async () => undefined,
  format: (amount) => formatMoneyUtil(amount, 'USD'),
});

export function OrgLocaleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [locale, setLocale] = useState<OrgLocale>(DEFAULT_LOCALE);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (user?.role !== 'BUSINESS_OWNER' && user?.role !== 'BUSINESS_STAFF') {
      setLocale(DEFAULT_LOCALE);
      setLoaded(true);
      return;
    }
    try {
      if (user?.listingMode === 'INDIVIDUAL') {
        const data = await apiFetch<{
          defaultCurrency?: string;
          countryCode?: string;
          region?: string;
          city?: string;
          timezone?: string;
          organizationId?: number;
        }>('/api/provider/workspace');
        setLocale({
          id: data.organizationId,
          defaultCurrency: data.defaultCurrency || 'PKR',
          countryCode: data.countryCode,
          region: data.region,
          city: data.city,
          timezone: data.timezone,
        });
      } else {
        const data = await apiFetch<OrgLocale>('/api/business/organization');
        setLocale({
          id: data.id,
          defaultCurrency: data.defaultCurrency || 'USD',
          countryCode: data.countryCode,
          region: data.region,
          city: data.city,
          timezone: data.timezone,
        });
      }
    } catch {
      setLocale(DEFAULT_LOCALE);
    } finally {
      setLoaded(true);
    }
  }, [user?.role, user?.listingMode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currency = locale.defaultCurrency || 'USD';
  const value = useMemo(
    () => ({
      locale,
      currency,
      loaded,
      refresh,
      format: (amount: number | string | null | undefined) => formatMoneyUtil(amount, currency),
    }),
    [locale, currency, loaded, refresh]
  );

  return <OrgLocaleContext.Provider value={value}>{children}</OrgLocaleContext.Provider>;
}

export function useOrgLocale() {
  return useContext(OrgLocaleContext);
}
