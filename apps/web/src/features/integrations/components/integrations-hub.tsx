'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Key,
  Plus,
  RefreshCw,
  Code2,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ApiKeyItem, CreateApiKeyResult } from '@dispenco/types';
import { integrationsApi } from '../services/integrations-api';
import { ApiKeysTable } from './api-keys-table';
import { CreateKeyModal } from './create-key-modal';
import { KeyCreatedDialog } from './key-created-dialog';
import { ApiDocumentationView } from './api-documentation-view';
import { getErrorMessage } from '@/lib/errors';

export function IntegrationsHub() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreateApiKeyResult | null>(null);
  const [activeTab, setActiveTab] = useState<'keys' | 'docs'>('keys');

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await integrationsApi.listKeys();
      setKeys(data);
    } catch (err) {
      toast.error('Failed to load integration keys', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const activeKeysCount = keys.filter((k) => k.isActive).length;
  const totalScopesAssigned = keys.reduce(
    (acc, k) => acc + (k.permissions?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        title="API & Developer Integrations"
        description="Manage API credentials and connect third-party accounting (QuickBooks, Xero), distributor ERPs, and external applications."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchKeys}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-1.5 font-medium shadow-xs"
            >
              <Plus className="size-4" />
              Generate API Key
            </Button>
          </div>
        }
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active API Keys"
          value={activeKeysCount}
          caption={`${keys.length} total generated`}
          icon={Key}
          variant="default"
        />
        <StatCard
          title="Total Scopes Granted"
          value={totalScopesAssigned}
          caption="Across active credentials"
          icon={ShieldCheck}
          variant="success"
        />
        <StatCard
          title="Public REST Endpoints"
          value="7"
          caption="Inventory, Sales, Ledgers, Reports"
          icon={Layers}
          variant="default"
        />
        <StatCard
          title="Gateway Status"
          value="Operational"
          caption="Rate limiting & auth active"
          icon={Activity}
          variant="success"
        />
      </div>

      {/* Primary Sub Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val: any) => setActiveTab(val)}
        className="space-y-6"
      >
        <div className="border-b border-border/80 pb-2">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="keys" className="gap-2">
              <Key className="size-4" />
              API Keys ({keys.length})
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <Code2 className="size-4" />
              Docs & Sandbox
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content: Keys */}
        <TabsContent value="keys" className="space-y-4">
          <ApiKeysTable
            keys={keys}
            isLoading={isLoading}
            onRefresh={fetchKeys}
            onOpenCreate={() => setIsCreateOpen(true)}
          />
        </TabsContent>

        {/* Tab Content: Docs & Sandbox */}
        <TabsContent value="docs" className="space-y-4">
          <ApiDocumentationView apiKeys={keys} />
        </TabsContent>
      </Tabs>

      {/* Modal: Create Key */}
      <CreateKeyModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(result) => {
          fetchKeys();
          setCreatedResult(result);
        }}
      />

      {/* Modal: Reveal Key Once */}
      <KeyCreatedDialog
        result={createdResult}
        onClose={() => setCreatedResult(null)}
      />
    </div>
  );
}
