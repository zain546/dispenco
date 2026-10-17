'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Key,
  Trash2,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  Plus,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ApiKeyItem } from '@dispenco/types';
import { integrationsApi } from '../services/integrations-api';
import { getErrorMessage } from '@/lib/errors';

interface ApiKeysTableProps {
  keys: ApiKeyItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
}

export function ApiKeysTable({
  keys,
  isLoading,
  onRefresh,
  onOpenCreate,
}: ApiKeysTableProps) {
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = async (key: ApiKeyItem) => {
    setTogglingId(key.id);
    try {
      await integrationsApi.toggleKey(key.id);
      toast.success(
        key.isActive ? 'API key suspended' : 'API key activated'
      );
      onRefresh();
    } catch (err) {
      toast.error('Failed to update API key status', {
        description: getErrorMessage(err),
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleRevoke = async () => {
    if (!keyToRevoke) return;
    setIsRevoking(true);
    try {
      await integrationsApi.deleteKey(keyToRevoke.id);
      toast.success('API key permanently revoked');
      setKeyToRevoke(null);
      onRefresh();
    } catch (err) {
      toast.error('Failed to revoke API key', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsRevoking(false);
    }
  };

  const formatTimestamp = (dateStr: string | null) => {
    if (!dateStr) return 'Never used';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExpiryBadge = (expiresAt: string | null) => {
    if (!expiresAt) {
      return (
        <Badge variant="outline" className="text-[11px] font-normal border-border/80">
          No expiry
        </Badge>
      );
    }
    const expiry = new Date(expiresAt);
    const isExpired = expiry.getTime() < Date.now();
    if (isExpired) {
      return (
        <Badge variant="destructive" className="text-[11px]">
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[11px] font-normal">
        Expires {expiry.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      </Badge>
    );
  };

  if (!isLoading && keys.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 bg-card">
        <EmptyState
          icon={Key}
          title="No Integration API Keys"
          description="Connect third-party accounting packages (QuickBooks, Xero), ERP distributors, or internal scripts using secure, scoped API credentials."
          action={
            <Button onClick={onOpenCreate} className="gap-1.5 font-medium shadow-xs">
              <Plus className="size-4" />
              Generate New API Key
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/40">
              <TableHead className="w-[260px]">Key Name & Prefix</TableHead>
              <TableHead>Permissions & Scopes</TableHead>
              <TableHead>Rate Limit</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead className="text-center w-[100px]">Active</TableHead>
              <TableHead className="text-right w-[90px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k.id} className="hover:bg-muted/30 transition-colors">
                {/* Name & Prefix */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Key className="size-4 text-primary shrink-0" />
                      <span>{k.name}</span>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground flex items-center gap-1 select-all">
                      <span>{k.keyPrefix}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Scopes */}
                <TableCell>
                  <div className="flex flex-wrap gap-1.5 max-w-sm">
                    {k.permissions.map((p) => {
                      const cleanScope = p.replace('public:', '').replace(':read', '');
                      return (
                        <Badge
                          key={p}
                          variant="outline"
                          className="font-mono text-[10px] px-1.5 py-0 bg-background/80 flex items-center gap-1"
                        >
                          <ShieldCheck className="size-2.5 text-primary" />
                          {cleanScope}
                        </Badge>
                      );
                    })}
                  </div>
                </TableCell>

                {/* Rate Limit */}
                <TableCell>
                  <Badge variant="secondary" className="font-medium text-xs gap-1">
                    <Zap className="size-3 text-amber-500" />
                    {k.rateLimit} req/min
                  </Badge>
                </TableCell>

                {/* Last Used */}
                <TableCell className="text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Activity className="size-3 text-muted-foreground/80 shrink-0" />
                    <span>{formatTimestamp(k.lastUsedAt)}</span>
                  </div>
                </TableCell>

                {/* Expiry */}
                <TableCell>{getExpiryBadge(k.expiresAt)}</TableCell>

                {/* Active Switch */}
                <TableCell className="text-center">
                  <Switch
                    checked={k.isActive}
                    disabled={togglingId === k.id}
                    onCheckedChange={() => handleToggle(k)}
                    aria-label={`Toggle active status for ${k.name}`}
                  />
                </TableCell>

                {/* Revoke */}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setKeyToRevoke(k)}
                    title="Revoke API key"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Revocation Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(keyToRevoke)}
        onOpenChange={(open) => !open && setKeyToRevoke(null)}
        title="Revoke API Key"
        description={`Are you sure you want to revoke "${keyToRevoke?.name}"? Any external application, accounting sync, or script using this key will immediately be denied access.`}
        confirmLabel="Revoke Key"
        variant="destructive"
        isLoading={isRevoking}
        onConfirm={handleRevoke}
      />
    </>
  );
}
