'use client';

import PageHeader from '@/components/PageHeader';
import SoloServicesEditor from '@/components/provider/SoloServicesEditor';

export default function SoloServicesPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader
        title="Services"
        subtitle="What you offer as an individual professional — no staff rates or packages."
      />
      <SoloServicesEditor />
    </div>
  );
}
