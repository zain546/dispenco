import React from 'react';
import Link from 'next/link';
import { Pill, Home, ShoppingCart, Boxes, BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/80 shadow-xl bg-card overflow-hidden">
        <div className="h-1.5 bg-primary w-full" />
        <CardContent className="p-8 text-center space-y-6">
          <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-xs">
            <Pill className="size-8" />
          </div>

          <div className="space-y-2">
            <span className="text-micro font-bold uppercase tracking-widest text-primary font-mono bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              404 • Resource Not Found
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground pt-1">
              Page Does Not Exist
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The pharmacy module or URL you tried to access does not exist or may have been relocated.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-left pt-1">
            <Link
              href="/pos"
              className="p-3 rounded-xl border border-border/70 hover:border-primary/50 bg-muted/30 hover:bg-primary/5 transition-all group flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5 font-bold text-foreground group-hover:text-primary">
                <ShoppingCart className="size-3.5 text-primary" />
                <span>POS Counter</span>
              </div>
              <span className="text-micro text-muted-foreground">Process counter sales</span>
            </Link>

            <Link
              href="/inventory"
              className="p-3 rounded-xl border border-border/70 hover:border-primary/50 bg-muted/30 hover:bg-primary/5 transition-all group flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5 font-bold text-foreground group-hover:text-primary">
                <Boxes className="size-3.5 text-primary" />
                <span>Inventory</span>
              </div>
              <span className="text-micro text-muted-foreground">Manage batches & stock</span>
            </Link>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button asChild className="w-full h-10 font-bold gap-2 text-xs shadow-xs">
              <Link href="/dashboard">
                <Home className="size-4" />
                <span>Back to Main Dashboard</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
