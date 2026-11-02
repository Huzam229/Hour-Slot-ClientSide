'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyIndividualOnboardingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/provider/onboarding');
  }, [router]);
  return null;
}
