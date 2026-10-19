'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { canManageInventory, canManageTransfers } = usePermissions();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        router.push('/pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

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
        <span className="text-micro text-muted-foreground hidden sm:inline">
          Press keyboard shortcuts or click to launch
        </span>
      </div>

      <div className="flex items-stretch sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {actions.map((act) => {
          if (act.requiredPermission === false) return null;
          const Icon = act.icon;

          return (
            <Link
              key={act.title}
              href={act.href}
              className="shrink-0 w-[145px] xs:w-[160px] sm:w-auto snap-start flex flex-col group"
            >
              <Card
                className={`flex-1 w-full h-[92px] sm:h-full p-2.5 sm:p-3 transition-all duration-200 border cursor-pointer select-none flex flex-col justify-between ${
                  act.primary
                    ? 'border-primary/40 bg-primary/[0.03] hover:bg-primary/[0.08] hover:border-primary shadow-xs'
                    : 'border-border/70 hover:border-border hover:bg-muted/40 shadow-2xs'
                }`}
              >
                <div className="flex flex-col justify-between h-full">
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
                      <kbd
                        className={`text-micro font-mono px-1.5 py-0.5 rounded border shadow-2xs font-bold shrink-0 ${
                          act.primary
                            ? 'bg-primary/15 text-primary border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground transition-colors'
                            : 'bg-muted border-border/70 text-muted-foreground'
                        }`}
                      >
                        {act.badge}
                      </kbd>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 min-h-[2rem] flex items-center">
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
