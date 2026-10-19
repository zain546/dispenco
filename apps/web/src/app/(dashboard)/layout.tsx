'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  ShoppingCart,
  RotateCcw,
  Truck,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Store,
  Pill,
  ChevronLeft,
  ChevronRight,
  Menu,
  FileText,
  Building2,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/layout/notification-bell';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/context/auth-context';
import { useStore } from '@/context/store-context';
import { usePermissions } from '@/hooks/use-permissions';
import { StoreSwitcher } from '@/components/store-switcher';
import { ConnectivityIndicator } from '@/components/layout/connectivity-indicator';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission: string | null;
  requiresMultiStore?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: null },
    ],
  },
  {
    label: 'Point of Sale',
    items: [
      { name: 'POS Counter', href: '/pos', icon: ShoppingCart, permission: null },
      { name: 'Prescriptions', href: '/prescriptions', icon: FileText, permission: null },
      { name: 'Returns', href: '/returns', icon: RotateCcw, permission: null },
      { name: 'Customers & Khata', href: '/customers', icon: Users, permission: null },
    ],
  },
  {
    label: 'Inventory & Supply',
    items: [
      { name: 'Inventory & Batches', href: '/inventory', icon: Package, permission: null },
      { name: 'Stock Transfers', href: '/transfers', icon: ArrowRightLeft, permission: null, requiresMultiStore: true },
      { name: 'Purchases', href: '/purchases', icon: Truck, permission: null },
      { name: 'Suppliers', href: '/suppliers', icon: Store, permission: 'canManageSuppliers' },
    ],
  },
  {
    label: 'Intelligence & Management',
    items: [
      { name: 'Analytics & Audits', href: '/reports', icon: BarChart3, permission: 'canViewReports' },
      { name: 'Chain Operations', href: '/chain', icon: Building2, permission: 'canManageSettings', requiresMultiStore: true },
      { name: 'Settings & Integrations', href: '/settings', icon: Settings, permission: 'canManageSettings' },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, storeName, logout, isLoading } = useAuth();
  const { activeStore, isAllStores, isMultiStore } = useStore();
  const permissions = usePermissions();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('dispenco_sidebar_collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('dispenco_sidebar_collapsed', String(next));
      return next;
    });
  };

  const userName = user?.name || (isLoading ? '...' : 'User Account');
  const displayStoreName = isAllStores
    ? 'All Stores (Org View)'
    : (activeStore?.name || storeName || user?.storeName || 'Primary Store');
  const role = user?.role || (isLoading ? '' : 'Staff');

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'U';
  };

  const userInitials = getInitials(userName);

  const filterNavItems = (items: NavItem[]) =>
    items.filter((item) => {
      if (item.requiresMultiStore && !isMultiStore) return false;
      if (!item.permission) return true;
      return Boolean((permissions as any)[item.permission]);
    });

  const renderNavLinks = (inMobile = false) => (
    <nav className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
      {NAV_GROUPS.map((group, gIdx) => {
        const visibleItems = filterNavItems(group.items);
        if (visibleItems.length === 0) return null;

        const isCollapsedNav = isCollapsed && !inMobile;

        return (
          <div key={group.label} className="space-y-1">
            {!isCollapsedNav ? (
              <div className="text-overline text-muted-foreground/70 px-3 py-1 font-semibold select-none">
                {group.label}
              </div>
            ) : gIdx > 0 ? (
              <div className="my-1 border-t border-sidebar-border/60 mx-2" />
            ) : null}

            <div className="flex flex-col gap-0.5">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                const navLink = (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => inMobile && setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      isCollapsedNav ? 'justify-center px-0 h-9' : 'justify-start h-9',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!isCollapsedNav && <span className="truncate">{item.name}</span>}
                  </Link>
                );

                if (isCollapsedNav) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium text-xs">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navLink;
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex min-h-screen bg-background">
        {/* Desktop Collapsible Sidebar (Hidden on Mobile/Tablet < lg) */}
        <aside
          className={cn(
            'hidden lg:flex h-screen sticky top-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col justify-between p-3.5 shrink-0 z-30 transition-all duration-300 ease-in-out',
            isCollapsed ? 'w-20' : 'w-64'
          )}
        >
          {/* Top Section: Brand Header & Nav */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Header / Brand */}
            {isCollapsed ? (
              <div className="pb-3 border-b border-sidebar-border flex flex-col items-center gap-2 shrink-0">
                <Link href="/dashboard" className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                  <Pill className="size-6" />
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  aria-label="Expand Sidebar"
                  title="Expand Sidebar"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="pb-3 border-b border-sidebar-border flex items-center justify-between gap-2 shrink-0">
                <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
                    <Pill className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold tracking-tight text-primary leading-none truncate">
                      Dispenco
                    </h1>
                    <span className="text-micro font-medium text-muted-foreground leading-tight block mt-1 truncate">
                      Pharmacy POS
                    </span>
                  </div>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent shrink-0"
                  aria-label="Collapse Sidebar"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
            )}

            {/* Scrollable Navigation */}
            <div className="mt-4 flex-1 flex flex-col min-h-0">
              {renderNavLinks(false)}
            </div>
          </div>

          {/* Footer Account / Logout - 100vh Viewport Bound */}
          <div className="pt-3 border-t border-sidebar-border shrink-0 space-y-3">
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="size-9 bg-primary text-primary-foreground shrink-0 ring-2 ring-primary/20 cursor-pointer">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <p className="font-semibold">{userName}</p>
                    <p className="text-micro text-muted-foreground">{role}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => logout()}
                      className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                      aria-label="Sign Out"
                    >
                      <LogOut className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs text-destructive font-medium">
                    Sign Out
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-2">
                  <Avatar className="size-9 bg-primary text-primary-foreground shrink-0 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-xs min-w-0 flex-1">
                    <div
                      className="font-semibold text-sidebar-foreground truncate"
                      title={userName}
                    >
                      {userName}
                    </div>
                    <div
                      className="text-muted-foreground truncate"
                      title={displayStoreName}
                    >
                      {displayStoreName} •{' '}
                      <span className="text-primary font-medium">{role}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => logout()}
                  className="w-full justify-start gap-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive px-3 py-2 h-9 transition-colors"
                >
                  <LogOut className="size-4" />
                  <span>Sign Out</span>
                </Button>
              </>
            )}
          </div>
        </aside>

        {/* Main Content Container */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
          {/* Top Header */}
          <header className="h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-2.5 sm:px-6 shadow-xs shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[calc(100%-115px)] sm:max-w-none">
              {/* Mobile Drawer Trigger (Visible on < lg) */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="lg:hidden size-8 sm:size-9 shrink-0 text-foreground"
                    aria-label="Open Navigation Menu"
                  >
                    <Menu className="size-4 sm:size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-4 flex flex-col justify-between bg-sidebar text-sidebar-foreground">
                  <SheetHeader className="p-0 pb-3 border-b border-sidebar-border text-left">
                    <SheetTitle className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                        <Pill className="size-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-primary leading-none">Dispenco</h2>
                        <span className="text-xs font-normal text-muted-foreground">Pharmacy POS</span>
                      </div>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="my-4 flex-1 overflow-y-auto">
                    {renderNavLinks(true)}
                  </div>

                  <div className="pt-3 border-t border-sidebar-border space-y-3">
                    <div className="flex items-center gap-3 px-1">
                      <Avatar className="size-9 bg-primary text-primary-foreground shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-xs min-w-0 flex-1">
                        <div className="font-semibold truncate">{userName}</div>
                        <div className="text-muted-foreground truncate">{displayStoreName} • <span className="text-primary font-medium">{role}</span></div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMobileOpen(false);
                        logout();
                      }}
                      className="w-full justify-start gap-2.5 text-xs text-destructive hover:bg-destructive/10 px-3 py-2 h-9"
                    >
                      <LogOut className="size-4" />
                      <span>Sign Out</span>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <StoreSwitcher />
            </div>

            <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground shrink-0">
              <ThemeToggle />
              <NotificationBell />
              <ConnectivityIndicator />
            </div>
          </header>

          {/* Page View Body */}
          <main className="flex-1 p-3.5 sm:p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
