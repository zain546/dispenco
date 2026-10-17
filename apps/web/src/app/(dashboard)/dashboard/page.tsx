import React from 'react';
import { DashboardHeader } from '@/features/dashboard/components/dashboard-header';
import { DashboardMetrics } from '@/features/dashboard/components/dashboard-metrics';
import { QuickActionsHub } from '@/features/dashboard/components/quick-actions-hub';
import { RecentSalesWidget } from '@/features/dashboard/components/recent-sales-widget';
import { UrgentAttentionPanel } from '@/features/dashboard/components/urgent-attention-panel';
import { CatalogCompletionWidget } from '@/features/dashboard/components/catalog-completion-widget';
import { DashboardEmptyState } from '@/features/dashboard/components/dashboard-empty-state';

export const metadata = {
  title: 'Dashboard - Dispenco',
  description: 'Pharmacy overview, daily metrics, real-time sales stream, and quick operations',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Overview Header & Quick Actions */}
      <DashboardHeader />

      {/* KPI Stat Cards */}
      <DashboardMetrics />

      {/* Quick Operations Launchpad */}
      <QuickActionsHub />

      {/* Primary Analytics & Attention Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 cols on large screen): Live Transaction Stream */}
        <div className="lg:col-span-2 space-y-6">
          <RecentSalesWidget />
        </div>

        {/* Right Column (1 col on large screen): Urgent Attention & Catalog Readiness */}
        <div className="space-y-6">
          <UrgentAttentionPanel />
          <CatalogCompletionWidget />
        </div>
      </div>

      {/* Empty State Banner (appears only if catalog has 0 items) */}
      <DashboardEmptyState />
    </div>
  );
}
