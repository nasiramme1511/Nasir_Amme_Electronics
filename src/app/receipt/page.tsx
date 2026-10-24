'use client';

import React from 'react';
import ThermalReceipt, { SAMPLE_RECEIPT } from '@/components/pos/ThermalReceipt';

export default function ReceiptPreviewPage() {
  return (
    <div className="w-full">
      <ThermalReceipt data={SAMPLE_RECEIPT} showToolbar={true} />
    </div>
  );
}
