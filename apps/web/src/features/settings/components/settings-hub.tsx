'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Users, Key, ShieldCheck, Settings, CreditCard } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RolesPermissionsView } from '@/features/roles/components/roles-permissions-view';
import { IntegrationsHub } from '@/features/integrations/components/integrations-hub';
import { BillingView } from './billing-view';

export function SettingsHub() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<string>(
    tabParam === 'integrations'
      ? 'integrations'
      : tabParam === 'billing'
      ? 'billing'
      : 'team'
  );

  useEffect(() => {
    if (tabParam === 'integrations' || tabParam === 'team' || tabParam === 'billing') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', val);
    router.replace(`/settings?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border/80 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Settings className="size-5 sm:size-6 text-primary" />
              Settings &amp; Organization
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
              Manage your pharmacy team members, operational roles, billing plan, and external developer API integrations.
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid w-full sm:w-[440px] grid-cols-3 h-9 p-1 bg-muted/60 rounded-xl border border-border/60">
              <TabsTrigger
                value="team"
                className="gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                <Users className="size-3.5" />
                <span>Team</span>
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                <CreditCard className="size-3.5" />
                <span>Billing</span>
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
                className="gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                <Key className="size-3.5" />
                <span>API</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {activeTab === 'team' ? (
        <RolesPermissionsView />
      ) : activeTab === 'billing' ? (
        <BillingView />
      ) : (
        <IntegrationsHub />
      )}
    </div>
  );
}

