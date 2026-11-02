'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/push';

/** Registers the service worker once per page load (needed for install + push). */
export default function PwaRegister() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
