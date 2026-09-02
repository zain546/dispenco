import React from 'react';
import { POSTerminal } from '@/features/pos/components/pos-terminal';

export const metadata = {
  title: 'POS Billing Counter - Dispenco',
  description: 'Fast counter checkout with barcode scanning & automatic stock deduction',
};

export default function POSPage() {
  return <POSTerminal />;
}
