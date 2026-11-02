'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { OwnerPlan } from '@/lib/plan';

type OwnerPlanContextValue = {
  plan: OwnerPlan | null;
  loaded: boolean;
  refresh: () => Promise<void>;
};

const OwnerPlanContext = createContext<OwnerPlanContextValue>({
  plan: null,
  loaded: false,
  refresh: async () => undefined,
});

export function OwnerPlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<OwnerPlan | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (user?.role !== 'BUSINESS_OWNER') {
      setPlan(null);
      setLoaded(true);
      return;
    }
    const endpoint = user?.listingMode === 'INDIVIDUAL' ? '/api/provider/plan' : '/api/business/plan';
    try {
      const data = await apiFetch<OwnerPlan>(endpoint);
      setPlan(data);
    } catch {
      setPlan(null);
    } finally {
      setLoaded(true);
    }
  }, [user?.role, user?.listingMode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ plan, loaded, refresh }), [plan, loaded, refresh]);

  return (
    <OwnerPlanContext.Provider value={value}>
      {children}
    </OwnerPlanContext.Provider>
  );
}

export function useOwnerPlan() {
  return useContext(OwnerPlanContext);
}
