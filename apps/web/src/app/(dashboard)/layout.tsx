'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Store,
  Pill,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'POS Counter', href: '/pos', icon: ShoppingCart },
  { name: 'Purchases', href: '/purchases', icon: Truck },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Logo & Brand */}
          <div className="px-2 pb-4 border-b border-sidebar-border flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
              <Pill className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-primary leading-none">
                Dispenco
              </h1>
              <span className="text-[11px] text-muted-foreground leading-tight block mt-0.5">
                Pharmacy Management
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1 mt-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Account / Logout */}
        <div className="pt-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-3 px-1">
            <Avatar className="size-8 bg-primary text-primary-foreground">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                OP
              </AvatarFallback>
            </Avatar>
            <div className="text-xs">
              <div className="font-semibold text-sidebar-foreground">
                Owner Pharmacy
              </div>
              <div className="text-muted-foreground">
                Al-Shifa Group
              </div>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 text-xs font-medium text-destructive hover:bg-destructive/10 px-2 py-1.5 rounded-md transition-colors"
          >
            <LogOut className="size-4" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
        {/* Top Header */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Store className="size-4 text-primary" />
            <span>Store: <strong className="text-foreground">Main Branch — Blue Area</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Status:</span>
            <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </Badge>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
