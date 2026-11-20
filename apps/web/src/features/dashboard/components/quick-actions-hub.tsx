'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  PackagePlus,
  Truck,
  Users,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';

interface ActionItem {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  primary?: boolean;
  requiredPermission?: boolean;
}

export function QuickActionsHub() {
  const { canManageInventory, canManageTransfers } = usePermissions();

  const actions: ActionItem[] = [
    {
      title: 'POS Billing',
      description: 'Barcode scanning, instant sale checkout & digital receipts',
      href: '/pos',
      icon: ShoppingCart,
      badge: 'F2',
      primary: true,
    },
    {
      title: 'Receive Delivery',
      description: 'Check in supplier shipment & record incoming batches',
      href: '/inventory/receive',
      icon: Truck,
      requiredPermission: canManageInventory,
    },
    {
      title: 'Add Medicine',
      description: 'Create new catalog item with generic composition & tax',
      href: '/inventory/new',
      icon: PackagePlus,
      requiredPermission: canManageInventory,
    },
    {
      title: 'Khata Ledger',
      description: 'Manage credit balances, customer profiles & payments',
      href: '/customers',
      icon: Users,
    },
    {
      title: 'Stock Transfer',
      description: 'Dispatch or receive inventory between pharmacy branches',
      href: '/transfers',
      icon: ArrowLeftRight,
      requiredPermission: canManageTransfers,
    },
    {
      title: 'AI Copilot',
      description: 'Interrogate pharmacy revenue, sales velocity & expiry risk',
      href: '/reports?tab=copilot',
      icon: Sparkles,
      badge: 'AI',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Quick Operations
        </h3>
        <span className="text-micro text-muted-foreground hidden sm:inline">
          Press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-muted border border-border/60">F2</kbd> for POS counter
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-2.5">
        {actions.map((act) => {
          if (act.requiredPermission === false) return null;
          const Icon = act.icon;

          return (
            <Link
              key={act.title}
              href={act.href}
              className="flex flex-col group select-none"
            >
              <Card
                className={`w-full min-h-[44px] py-2.5 px-2.5 sm:px-3 rounded-xl transition-all duration-200 border cursor-pointer flex items-center justify-between gap-2 sm:gap-2.5 shadow-xs ${
                  act.primary
                    ? 'border-primary/50 bg-primary/[0.08] hover:bg-primary/[0.14] hover:border-primary/80 text-foreground'
                    : 'border-border/80 bg-card hover:border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                  <div
                    className={`size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      act.primary
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-muted/70 text-muted-foreground group-hover:bg-muted group-hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-xs font-medium text-foreground truncate min-w-0 flex-1 group-hover:text-foreground/90">
                    {act.title}
                  </span>
                </div>
                {act.badge && (
                  <kbd
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shadow-2xs font-semibold shrink-0 ${
                      act.primary
                        ? 'bg-primary/20 text-primary border-primary/40'
                        : 'bg-muted/60 border-border/60 text-muted-foreground'
                    }`}
                  >
                    {act.badge}
                  </kbd>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
