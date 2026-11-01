import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  LockKeyhole,
  Package,
  PanelLeft,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const menu = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: ReceiptText, label: 'Point of sale', active: false },
  { icon: Package, label: 'Inventory', active: false },
  { icon: ShoppingBag, label: 'Purchases', active: false },
  { icon: Users, label: 'Customers', active: false },
  { icon: ClipboardList, label: 'Reports', active: false },
];
const bars = [
  'h-10',
  'h-14',
  'h-12',
  'h-20',
  'h-16',
  'h-24',
  'h-20',
  'h-16',
  'h-24',
  'h-28',
  'h-24',
  'h-32',
  'h-28',
  'h-24',
  'h-32',
  'h-36',
  'h-28',
  'h-32',
  'h-36',
  'h-40',
  'h-36',
];

export function DashboardPreview() {
  return (
    <figure
      aria-label="Illustrative Dispenco dashboard with sample sales, expiry alerts and low-stock items"
      className="relative mx-auto mt-16 w-full text-left md:mt-20"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-foreground/5">
        <div className="flex h-11 items-center justify-between gap-3 border-b bg-muted/40 px-4 text-xs text-muted-foreground">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2 rounded-full bg-foreground/20" />
            <span className="size-2 rounded-full bg-foreground/20" />
            <span className="size-2 rounded-full bg-foreground/20" />
          </div>
          <span className="flex items-center gap-2">
            <LockKeyhole className="size-3" aria-hidden="true" />
            app.dispenco.com
          </span>
          <span className="hidden sm:block">Your pharmacy, at a glance</span>
          <PanelLeft className="size-3 sm:hidden" aria-hidden="true" />
        </div>
        <div className="flex">
          <aside
            className="hidden w-44 shrink-0 flex-col justify-between border-r bg-muted/20 p-4 lg:flex"
            aria-hidden="true"
          >
            <div>
              <div className="mb-8 flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Plus className="size-4" />
                </span>
                dispenco.
              </div>
              <div className="mb-5 flex items-center gap-2 rounded-lg border bg-background p-2 text-xs">
                <Store className="size-4 text-muted-foreground" />
                <span>My pharmacy</span>
                <ChevronDown className="ml-auto size-3" />
              </div>
              <p className="mb-2 px-2 text-overline text-muted-foreground">Workspace</p>
              <div className="space-y-1">
                {menu.map(({ icon: Icon, label, active }) => (
                  <div
                    key={label}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2 py-2.5 text-xs',
                      active
                        ? 'bg-primary/10 font-medium text-primary dark:text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 px-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CircleHelp className="size-4" />
                Help & support
              </div>
              <div className="flex items-center gap-2">
                <Settings2 className="size-4" />
                Settings
              </div>
              <div className="flex items-center gap-2 border-t pt-4">
                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-micro font-medium text-foreground">
                  YO
                </span>
                <span>
                  Your account
                  <br />
                  <span className="text-micro">Store owner</span>
                </span>
              </div>
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <div className="flex h-12 items-center justify-between border-b px-4 sm:px-6">
              <span className="text-xs text-muted-foreground">
                Workspace{' '}
                <span className="mx-2 text-border" aria-hidden="true">
                  /
                </span>
                <span className="font-medium text-foreground">Overview</span>
              </span>
              <div className="flex items-center gap-4 text-muted-foreground" aria-hidden="true">
                <Search className="size-4" />
                <Bell className="size-4" />
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-micro text-foreground">
                  YO
                </span>
              </div>
            </div>
            <div className="bg-muted/20 p-4 sm:p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold tracking-tight sm:text-lg">
                    A good day starts with a clear view.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Here&apos;s what&apos;s happening at your pharmacy.
                  </p>
                </div>
                <span className="hidden items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs sm:flex">
                  Today <ChevronDown className="size-3" aria-hidden="true" />
                </span>
              </div>
              <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                  {
                    label: 'Today’s sales',
                    value: 'PKR 48,250',
                    detail: '32 completed sales',
                    icon: ReceiptText,
                  },
                  {
                    label: 'Inventory value',
                    value: 'PKR 842,600',
                    detail: '1,248 products in stock',
                    icon: Package,
                  },
                  {
                    label: 'Near expiry',
                    value: '08 batches',
                    detail: 'Review upcoming expiries',
                    icon: ClipboardList,
                  },
                  {
                    label: 'Low stock',
                    value: '12 products',
                    detail: 'Ready for your review',
                    icon: ShoppingBag,
                  },
                ].map(({ label, value, detail, icon: Icon }) => (
                  <Card key={label} className="rounded-lg p-3 shadow-none sm:p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      {label}
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-base font-semibold tracking-tight tabular-nums sm:text-xl">
                      {value}
                    </p>
                    <p className="mt-1.5 text-micro text-muted-foreground">{detail}</p>
                  </Card>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-5">
                <Card className="min-w-0 rounded-lg p-4 shadow-none md:col-span-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Sales overview</p>
                    <span className="text-micro text-muted-foreground">
                      This week <ChevronDown className="ml-1 inline size-3" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-3">
                    <span className="text-2xl font-semibold tracking-tight tabular-nums">
                      PKR 286,400
                    </span>
                    <span className="flex items-center gap-1 text-micro text-primary dark:text-foreground">
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                      12.8%
                    </span>
                  </div>
                  <p className="mt-1 text-micro text-muted-foreground">
                    Compared with last week · sample data
                  </p>
                  <div
                    role="img"
                    aria-label="Sample weekly sales chart showing a rising trend"
                    className="mt-6 flex h-44 items-end gap-1.5 border-b border-border bg-muted/20 px-2 pt-4 sm:gap-2"
                  >
                    {bars.map((height, index) => (
                      <div
                        key={index}
                        className={cn(
                          'min-w-0 flex-1 rounded-t-sm',
                          height,
                          index > 15 ? 'bg-primary' : 'bg-primary/25',
                        )}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between text-micro text-muted-foreground">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                </Card>
                <Card className="rounded-lg p-4 shadow-none md:col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Needs your attention</p>
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-micro font-medium">
                      20
                    </span>
                  </div>
                  <div className="mt-5 space-y-4">
                    {[
                      {
                        name: 'Augmentin 625mg',
                        detail: 'Batch AUG-2411 · 24 packs',
                        status: 'Exp. 31 Jan 2027',
                      },
                      {
                        name: 'Panadol 500mg',
                        detail: 'Batch PND-2608 · 6 packs left',
                        status: 'Below minimum stock',
                      },
                      {
                        name: 'Glucophage 500mg',
                        detail: 'Batch GLU-2412 · 18 packs',
                        status: 'Exp. 28 Feb 2027',
                      },
                    ].map((item) => (
                      <div key={item.name} className="border-b pb-4 last:border-0 last:pb-0">
                        <p className="text-xs font-medium">{item.name}</p>
                        <p className="mt-1 text-micro text-muted-foreground">{item.detail}</p>
                        <Badge
                          variant="secondary"
                          className="mt-2 h-5 bg-primary/10 text-xs text-foreground"
                        >
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 flex items-center gap-1 text-xs font-medium">
                    Everything important, in one place{' '}
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </p>
                </Card>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-micro text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary" />
                  All records up to date
                </span>
                <span className="flex items-center gap-1.5">
                  <ArrowDownToLine className="size-3" aria-hidden="true" />
                  Your business. Less guesswork.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs text-muted-foreground">
        A look inside Dispenco. All figures and pharmacy records shown are illustrative.
      </figcaption>
    </figure>
  );
}
