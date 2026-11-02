'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import BookingTools from '@/components/provider/BookingTools';
import PromoCodesPanel from '@/components/provider/PromoCodesPanel';

export default function ProviderBookingToolsPage() {
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ slug?: string }>('/api/provider/workspace')
      .then((ws) => {
        if (ws?.slug) setBookingUrl(`${window.location.origin}/b/${encodeURIComponent(ws.slug)}`);
      })
      .catch(() => setBookingUrl(null));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader
        title="Booking tools"
        subtitle="Your booking link, cancellation rules, fees owed, calendar sync and promo codes."
      />
      <BookingTools bookingUrl={bookingUrl} />
      <PromoCodesPanel />
    </div>
  );
}
