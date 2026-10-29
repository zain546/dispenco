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
    <div className="space-y-4 sm:space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            API Credentials &amp; Endpoints
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Connect third-party accounting (QuickBooks, Xero), distributor ERPs, and external scripts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchKeys}
            disabled={isLoading}
            className="h-8.5 px-3 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`size-3 text-primary ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8.5 px-3 gap-1.5 font-bold text-xs bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Generate Key</span>
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards: 2-column on mobile, 4-column on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Active Keys"
          value={activeKeysCount}
          caption={`${keys.length} total keys`}
          icon={Key}
          variant="default"
        />
        <StatCard
          title="Scopes Granted"
          value={totalScopesAssigned}
          caption="Active credentials"
          icon={ShieldCheck}
          variant="success"
        />
        <StatCard
          title="REST Endpoints"
          value="7"
          caption="Inventory, POS, Reports"
          icon={Layers}
          variant="default"
        />
        <StatCard
          title="Gateway Status"
          value="Operational"
          caption="Rate limiting active"
          icon={Activity}
          variant="success"
        />
      </div>

      {/* Primary Sub Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val: any) => setActiveTab(val)}
        className="space-y-4"
      >
        <div className="border-b border-border/80 pb-2">
          <TabsList className="grid w-full sm:max-w-sm grid-cols-2 h-9 p-1 bg-muted/60 rounded-xl border border-border/60">
            <TabsTrigger
              value="keys"
              className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <Key className="size-3.5" />
              API Keys ({keys.length})
            </TabsTrigger>
            <TabsTrigger
              value="docs"
              className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <Code2 className="size-3.5" />
              Docs &amp; Sandbox
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
