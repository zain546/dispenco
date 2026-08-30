import React from 'react';
import { DashboardHeader } from '@/features/dashboard/components/dashboard-header';
import { DashboardMetrics } from '@/features/dashboard/components/dashboard-metrics';
import { DashboardEmptyState } from '@/features/dashboard/components/dashboard-empty-state';

export const metadata = {
  title: 'Dashboard - Dispenco',
  description: 'Pharmacy overview, daily metrics, and quick store actions',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader />
      <DashboardMetrics />
      <DashboardEmptyState />
    </div>
  );
}
