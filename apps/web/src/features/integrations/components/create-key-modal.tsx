'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Key, ShieldCheck, Clock, Zap, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreateApiKeyPayload,
  CreateApiKeyResult,
  PublicApiScope,
  ALL_PUBLIC_API_SCOPES,
} from '@dispenco/types';
import { integrationsApi } from '../services/integrations-api';
import { getErrorMessage } from '@/lib/errors';

interface CreateKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: CreateApiKeyResult) => void;
}

export function CreateKeyModal({
  open,
  onOpenChange,
  onCreated,
}: CreateKeyModalProps) {
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<PublicApiScope[]>([
    PublicApiScope.INVENTORY_READ,
    PublicApiScope.SALES_READ,
  ]);
  const [rateLimit, setRateLimit] = useState('60');
  const [expiresInDays, setExpiresInDays] = useState<string>('never');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleScope = (scope: PublicApiScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSelectAllScopes = () => {
    if (selectedScopes.length === ALL_PUBLIC_API_SCOPES.length) {
      setSelectedScopes([]);
    } else {
      setSelectedScopes(ALL_PUBLIC_API_SCOPES.map((s) => s.scope));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a descriptive name for this API key');
      return;
    }

    if (selectedScopes.length === 0) {
      toast.error('Select at least one permission scope for this key');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateApiKeyPayload = {
        name: name.trim(),
        permissions: selectedScopes,
        rateLimit: parseInt(rateLimit, 10) || 60,
        expiresInDays: expiresInDays === 'never' ? null : parseInt(expiresInDays, 10),
      };

      const result = await integrationsApi.createKey(payload);
      toast.success('API key generated successfully');
      setName('');
      setSelectedScopes([PublicApiScope.INVENTORY_READ, PublicApiScope.SALES_READ]);
      setRateLimit('60');
      setExpiresInDays('never');
      onOpenChange(false);
      onCreated(result);
    } catch (err) {
      toast.error('Failed to create API key', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center gap-2 text-primary">
              <Key className="size-5" />
              <DialogTitle className="text-xl">Generate Integration API Key</DialogTitle>
            </div>
            <DialogDescription>
              Create a scoped API credential for connecting external accounting software, ERPs, or distributor systems.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Key Name */}
            <div className="space-y-2">
              <Label htmlFor="key-name" className="text-sm font-semibold">
                Key Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="key-name"
                placeholder="e.g. QuickBooks Accounting Sync, Distributor ERP"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                Give this key a label that clearly identifies which third-party system is using it.
              </p>
            </div>

            {/* Permission Scopes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-primary" />
                  Permission Scopes ({selectedScopes.length} selected)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleSelectAllScopes}
                >
                  {selectedScopes.length === ALL_PUBLIC_API_SCOPES.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {ALL_PUBLIC_API_SCOPES.map((scopeDef) => {
                  const isChecked = selectedScopes.includes(scopeDef.scope);
                  return (
                    <div
                      key={scopeDef.scope}
                      onClick={() => toggleScope(scopeDef.scope)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-all cursor-pointer ${
                        isChecked
                          ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                          : 'border-border/60 hover:border-border hover:bg-muted/40'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleScope(scopeDef.scope)}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5 flex-1 select-none">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <span className="font-medium text-foreground">
                            {scopeDef.name}
                          </span>
                          <span className="font-mono text-micro text-muted-foreground bg-muted px-1.5 py-0.5 rounded self-start sm:self-auto">
                            {scopeDef.scope}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {scopeDef.description}
                        </p>
                        <p className="text-xs text-primary/80 font-medium pt-0.5">
                          Use case: {scopeDef.recommendedFor}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Limits & Expiry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              {/* Rate Limit */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Zap className="size-4 text-warning" />
                  Rate Limit
                </Label>
                <Select value={rateLimit} onValueChange={setRateLimit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rate limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 requests / minute (Strict)</SelectItem>
                    <SelectItem value="60">60 requests / minute (Standard)</SelectItem>
                    <SelectItem value="120">120 requests / minute (High Throughput)</SelectItem>
                    <SelectItem value="300">300 requests / minute (Enterprise)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Per-key sliding window threshold before returning HTTP 429.
                </p>
              </div>

              {/* Expiry */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="size-4 text-primary" />
                  Key Expiration
                </Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Expires in 30 days</SelectItem>
                    <SelectItem value="90">Expires in 90 days (Recommended)</SelectItem>
                    <SelectItem value="365">Expires in 1 year</SelectItem>
                    <SelectItem value="never">Never expires</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Periodic key rotation is recommended for high security.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-32">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Key'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
