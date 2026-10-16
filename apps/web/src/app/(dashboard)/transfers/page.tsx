import React from 'react';
import { TransfersManager } from '@/features/transfers/components/transfers-manager';

export const metadata = {
  title: 'Stock Transfers - Dispenco',
  description: 'Manage inter-branch inventory requisitions, dispatches, and intake across pharmacy stores',
};

export default function TransfersPage() {
  return <TransfersManager />;
}
