'use client';

import PageHeader from '@/components/PageHeader';
import CustomerRecords from '@/components/provider/CustomerRecords';

export default function SoloCustomersPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader title="Customers" subtitle="Everyone who has booked with you — history, spend, notes and tags." />
      <CustomerRecords />
    </div>
  );
}
