import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { SettingsHub } from '@/features/settings/components/settings-hub';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Settings & Subscription - Dispenco',
  description: 'Manage pharmacy team members, custom roles, subscription billing, and public API integrations',
};

export default function SettingsPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-12">
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        }
      >
        <SettingsHub />
      </Suspense>
    </div>
  );
}
