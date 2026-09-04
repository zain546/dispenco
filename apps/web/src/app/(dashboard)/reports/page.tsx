import React from 'react';
import { ReportsView } from '@/features/reports/components/reports-view';

export const metadata = {
  title: 'Sales & Analytics Reports - Dispenco',
  description: 'Pharmacy sales performance, revenue analytics, and top-selling products',
};

export default function ReportsPage() {
  return <ReportsView />;
}
