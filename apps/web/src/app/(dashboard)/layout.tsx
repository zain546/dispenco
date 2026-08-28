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
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';

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
  const { user, storeName, logout } = useAuth();

  const userName = user?.name || 'Owner Pharmacy';
  const displayStoreName = storeName || user?.storeName || 'Main Branch — Blue Area';
  const role = user?.role || 'Owner';

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userInitials = getInitials(userName);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col justify-between p-4 shrink-0 relative z-20">
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
        <div className="pt-4 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-3 px-1">
            <Avatar className="size-8 bg-primary text-primary-foreground shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs min-w-0 flex-1">
              <div className="font-semibold text-sidebar-foreground truncate" title={userName}>
                {userName}
              </div>
              <div className="text-muted-foreground truncate" title={displayStoreName}>
                {displayStoreName} ({role})
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => logout()}
            className="w-full justify-start gap-2 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive px-2 py-1.5 h-8 transition-colors mt-1"
          >
            <LogOut className="size-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
        {/* Top Header */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <Store className="size-4 text-primary shrink-0" />
            <span className="truncate">
              Store: <strong className="text-foreground">{displayStoreName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
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
