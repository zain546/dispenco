'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Terminal,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateApiKeyResult } from '@dispenco/types';

interface KeyCreatedDialogProps {
  result: CreateApiKeyResult | null;
  onClose: () => void;
}

export function KeyCreatedDialog({ result, onClose }: KeyCreatedDialogProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isRevealed, setIsRevealed] = useState(true);

  if (!result) return null;

  const rawKey = result.rawKey;
  const curlExample = `curl -X GET "http://localhost:4000/api/v1/public/v1/ping" \\\n  -H "x-api-key: ${rawKey}"`;

  const copyToClipboard = async (text: string, isSnippet = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isSnippet) {
        setCopiedCurl(true);
        setTimeout(() => setCopiedCurl(false), 2000);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
      toast.success(isSnippet ? 'cURL command copied!' : 'API key copied to clipboard!');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Dialog open={Boolean(result)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-6" />
            <DialogTitle className="text-xl">API Key Generated Successfully</DialogTitle>
          </div>
          <DialogDescription>
            Your API key for <strong className="text-foreground">{result.apiKey.name}</strong> is ready.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Critical Security Warning */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-warning/30 bg-warning/10 text-foreground text-sm">
            <AlertTriangle className="size-5 shrink-0 text-warning mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Please copy your API key immediately
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                For security reasons, we do not store the plain-text key and you will{' '}
                <strong className="text-foreground">never be able to view it again</strong> once this dialog is closed. If you lose this key, you must generate a new one.
              </p>
            </div>
          </div>

          {/* Key Display Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Integration Secret Key</span>
              <button
                type="button"
                onClick={() => setIsRevealed(!isRevealed)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {isRevealed ? (
                  <>
                    <EyeOff className="size-3.5" /> Hide Secret
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5" /> Reveal Secret
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 font-mono text-xs sm:text-sm px-3.5 py-2.5 bg-muted/70 rounded-lg border border-border select-all break-all">
                {isRevealed ? rawKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => copyToClipboard(rawKey)}
                className="h-9 sm:h-auto gap-1.5 shadow-xs font-medium shrink-0 w-full sm:w-auto"
              >
                {copiedKey ? (
                  <>
                    <Check className="size-3.5 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy Key
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Granted Scopes:</span>
            {result.apiKey.permissions.map((perm) => (
              <Badge key={perm} variant="outline" className="font-mono text-micro bg-background">
                <ShieldCheck className="size-3 mr-1 text-primary" />
                {perm}
              </Badge>
            ))}
            <Badge variant="secondary" className="text-micro">
              {result.apiKey.rateLimit} req/min
            </Badge>
          </div>

          {/* Quickstart cURL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Terminal className="size-3.5 text-primary" />
                Quick Verification (Terminal)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(curlExample, true)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {copiedCurl ? (
                  <>
                    <Check className="size-3 text-success" /> Copied Command
                  </>
                ) : (
                  <>
                    <Copy className="size-3" /> Copy cURL
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-zinc-950 text-zinc-100 dark:bg-zinc-900 rounded-lg text-xs font-mono overflow-x-auto select-all leading-relaxed border border-border/40">
              {curlExample}
            </pre>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-3">
          <Button onClick={onClose} className="w-full sm:w-auto font-medium">
            I Have Safely Saved My Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
