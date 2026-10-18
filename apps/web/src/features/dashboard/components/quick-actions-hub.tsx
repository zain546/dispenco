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
      title: 'POS Billing Counter',
      description: 'Barcode scanning, instant sale checkout & digital receipts',
      href: '/pos',
      icon: ShoppingCart,
      badge: 'F2',
      primary: true,
    },
    {
      title: 'Receive Stock Delivery',
      description: 'Check in supplier shipment & record incoming batch lots',
      href: '/inventory/receive',
      icon: Truck,
      requiredPermission: canManageInventory,
    },
    {
      title: 'Add Medicine Product',
      description: 'Create new catalog item with generic composition & tax',
      href: '/inventory/new',
      icon: PackagePlus,
      requiredPermission: canManageInventory,
    },
    {
      title: 'Customer Khata Ledger',
      description: 'Manage credit balances, customer profiles & payments',
      href: '/customers',
      icon: Users,
    },
    {
      title: 'Branch Stock Transfer',
      description: 'Dispatch or receive inventory between pharmacy branches',
      href: '/transfers',
      icon: ArrowLeftRight,
      requiredPermission: canManageTransfers,
    },
    {
      title: 'AI Analytics Copilot',
      description: 'Interrogate pharmacy revenue, sales velocity & expiry risk',
      href: '/reports?tab=copilot',
      icon: Sparkles,
      badge: 'AI',
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Operations Hub
        </h3>
        <span className="text-micro text-muted-foreground">
          Press keyboard shortcuts or click to launch
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {actions.map((act) => {
          if (act.requiredPermission === false) return null;
          const Icon = act.icon;

          return (
            <Link key={act.title} href={act.href} className="group block h-full">
              <Card
                className={`h-full p-2.5 sm:p-3 transition-all duration-200 border cursor-pointer select-none flex flex-col justify-between ${
                  act.primary
                    ? 'border-primary/40 bg-primary/[0.03] hover:bg-primary/[0.08] hover:border-primary shadow-xs'
                    : 'border-border/70 hover:border-border hover:bg-muted/40 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1.5 sm:mb-2">
                    <div
                      className={`size-7 sm:size-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 ${
                        act.primary
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <Icon className="size-3.5 sm:size-4" />
                    </div>
                    {act.badge && (
                      <Badge
                        variant={act.primary ? 'default' : 'secondary'}
                        className="text-micro font-mono px-1.5 py-0 shrink-0"
                      >
                        {act.badge}
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-snug truncate sm:whitespace-normal">
                    {act.title}
                  </h4>
                  <p className="text-micro text-muted-foreground mt-0.5 sm:mt-1 hidden xs:block line-clamp-2 leading-relaxed">
                    {act.description}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
