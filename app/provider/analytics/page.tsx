'use client';

import PageHeader from '@/components/PageHeader';
import InsightsReport from '@/components/provider/InsightsReport';

export default function SoloAnalyticsPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader title="Reports" subtitle="How your business is doing: earnings, bookings, customers and busy times." />
      <InsightsReport />
    </div>
  );
}
