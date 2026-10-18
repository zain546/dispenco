'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home, ShoppingCart, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to application monitoring (e.g. Sentry / CloudWatch)
    console.error('Unhandled Dashboard Error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/80 shadow-lg bg-card overflow-hidden">
        <div className="h-2 bg-destructive w-full" />
        <CardContent className="p-6 text-center space-y-5">
          <div className="size-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20 shadow-xs">
            <ShieldAlert className="size-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Module Encountered an Error
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              An unexpected runtime exception was caught. Your transactions and local data remain safe in local offline cache.
            </p>
          </div>

          {error?.message && (
            <div className="bg-muted/50 rounded-xl p-3 text-left border border-border/60 text-micro font-mono text-muted-foreground max-h-24 overflow-y-auto break-all">
              <span className="font-semibold text-destructive block mb-0.5">Error Details:</span>
              {error.message}
              {error.digest && (
                <span className="block mt-1 text-muted-foreground/70">
                  Incident ID: {error.digest}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <Button
              type="button"
              onClick={() => reset()}
              className="w-full sm:flex-1 h-10 font-bold gap-2 text-xs shadow-xs"
            >
              <RotateCcw className="size-4" />
              <span>Try Again</span>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full sm:flex-1 h-10 font-semibold gap-2 text-xs border-border"
            >
              <Link href="/pos">
                <ShoppingCart className="size-4 text-primary" />
                <span>Go to POS</span>
              </Link>
            </Button>
          </div>

          <div className="pt-2 border-t border-border/60">
            <Button asChild variant="ghost" size="sm" className="text-micro text-muted-foreground hover:text-foreground">
              <Link href="/dashboard" className="gap-1.5">
                <Home className="size-3.5" />
                <span>Return to Main Dashboard</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
