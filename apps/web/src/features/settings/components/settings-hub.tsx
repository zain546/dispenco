'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Users, Key, ShieldCheck, Settings } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RolesPermissionsView } from '@/features/roles/components/roles-permissions-view';
import { IntegrationsHub } from '@/features/integrations/components/integrations-hub';

export function SettingsHub() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<string>(
    tabParam === 'integrations' ? 'integrations' : 'team'
  );

  useEffect(() => {
    if (tabParam === 'integrations' || tabParam === 'team') {
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Settings className="size-6 text-primary" />
              Settings & Organization
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your pharmacy team members, operational roles, and external developer API integrations.
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid w-full sm:w-80 grid-cols-2">
              <TabsTrigger value="team" className="gap-2">
                <Users className="size-4" />
                Team & Access
              </TabsTrigger>
              <TabsTrigger value="integrations" className="gap-2">
                <Key className="size-4" />
                API & Integrations
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {activeTab === 'team' ? (
        <RolesPermissionsView />
      ) : (
        <IntegrationsHub />
      )}
    </div>
  );
}
