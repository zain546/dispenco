import React from 'react';
import { ReturnsManager } from '@/features/sales/components/returns-manager';

export const metadata = {
  title: 'Returns & Customer Refunds - Dispenco',
  description: 'Process medicine returns, restore batch inventory, and manage credit adjustments.',
};

export default function ReturnsPage() {
  return <ReturnsManager />;
}
