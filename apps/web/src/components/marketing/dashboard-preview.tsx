import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LockKeyhole,
  Package,
  PanelLeft,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShoppingBag,
  Smartphone,
  Store,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import styles from './dashboard-preview.module.css';

const menu = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: ReceiptText, label: 'Point of sale', active: false },
  { icon: Package, label: 'Inventory', active: false },
  { icon: ShoppingBag, label: 'Purchases', active: false },
  { icon: Users, label: 'Customers', active: false },
  { icon: ClipboardList, label: 'Reports', active: false },
];

const stock = [
  {
    name: 'Augmentin 625mg',
    batch: '#AG-882',
    expiry: '14 Nov 2026',
    remaining: '18 packs remaining',
    status: 'Near Expiry (13 days)',
    warning: true,
  },
  {
    name: 'Panadol CF',
    batch: '#PC-102',
    expiry: '04 Mar 2028',
    remaining: '4 packs remaining',
    status: 'Low Stock Reorder',
    warning: false,
  },
];

function OwnerCompanion() {
  return (
    <aside
      aria-label="Illustrative owner's mobile overview"
      className={cn(
        styles.companion,
        'relative z-10 mx-auto mt-5 w-full max-w-xs rounded-2xl border bg-card/90 p-5 shadow-2xl shadow-primary/20 backdrop-blur-md lg:absolute lg:-right-3 lg:bottom-10 lg:mt-0 lg:w-72 xl:-right-6',
      )}
    >
      <div className="flex items-center gap-2.5 border-b pb-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Smartphone
            className="size-4 text-primary dark:text-primary-foreground"
            aria-hidden="true"
          />
        </span>
        <div>
          <p className="text-xs font-semibold">Dispenco Mobile · Main Branch</p>
          <p className="mt-1 text-micro text-muted-foreground">Your counter, wherever you are.</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Live Daily Cash</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">Rs 184,250</p>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className="flex size-5 items-center justify-center rounded-full bg-success/10">
          <Check className="size-3 text-success" aria-hidden="true" />
        </span>
        All registers balanced
      </div>
      <p className="mt-3 text-micro text-muted-foreground">Illustrative owner view</p>
    </aside>
  );
}

export function DashboardPreview() {
  return (
    <figure
      aria-label="Illustrative Dispenco pharmacy dashboard with sample sales, bills, expiry and stock records"
      className="hero-stage relative mx-auto mt-16 w-full text-left tabular-nums md:mt-20"
    >
      <div aria-hidden="true" className="hero-horizon pointer-events-none absolute" />
      <div aria-hidden="true" className="hero-floor pointer-events-none absolute" />
      <div
        className={cn(
          styles.frame,
          'hero-browser relative overflow-hidden rounded-2xl border border-border bg-card',
        )}
      >
        <div aria-hidden="true" className="hero-browser-highlight pointer-events-none absolute" />
        <div className="flex h-11 items-center justify-between gap-3 border-b bg-muted/40 px-4 text-xs text-muted-foreground">
          <div className="flex gap-1.5" aria-hidden="true">
            {[1, 2, 3].map((dot) => (
              <span key={dot} className="size-2 rounded-full bg-foreground/20" />
            ))}
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
                <span>Main Branch</span>
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
            <div className="space-y-3 px-2 pb-4 text-xs text-muted-foreground">
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
                Main Branch{' '}
                <span className="mx-2" aria-hidden="true">
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
            <div className={cn(styles.canvas, 'bg-muted/20 p-4 sm:p-6')}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Pharmacy overview</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sample snapshot · 1 Nov 2026 · Main Branch
                  </p>
                </div>
                <Badge variant="outline" className="h-auto gap-2 bg-background px-2.5 py-1 text-xs">
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  Live overview
                </Badge>
              </div>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <Card className="min-w-0 rounded-xl p-4 shadow-none">
                  <div className="flex min-h-8 items-start justify-between gap-2">
                    <h3 className="text-xs font-medium text-muted-foreground">
                      Today&apos;s Gross Sales
                    </h3>
                    <ReceiptText
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">
                    Rs 184,250
                  </p>
                  <Badge
                    variant="secondary"
                    className="mt-3 h-auto bg-success/10 px-2 py-1 text-xs text-foreground"
                  >
                    <ArrowUpRight aria-hidden="true" />
                    +14.2% vs yesterday
                  </Badge>
                </Card>
                <Card className="min-w-0 rounded-xl p-4 shadow-none">
                  <div className="flex min-h-8 items-start justify-between gap-2">
                    <h3 className="text-xs font-medium text-muted-foreground">
                      Active Prescriptions / Bills
                    </h3>
                    <ClipboardList
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">
                    142 <span className="text-base font-normal text-muted-foreground">bills</span>
                  </p>
                  <p className="mt-4 text-xs text-muted-foreground tabular-nums">
                    Avg basket: Rs 1,298
                  </p>
                </Card>
                <Card className="min-w-0 rounded-xl border-warning/20 bg-warning/5 p-4 shadow-none">
                  <div className="flex min-h-8 items-start justify-between gap-2">
                    <h3 className="text-xs font-medium text-foreground">Expiring Within 30 Days</h3>
                    <Clock3 className="size-4 shrink-0 text-warning" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight text-warning tabular-nums">
                    4 Batches
                  </p>
                  <Badge
                    variant="warning"
                    className="mt-3 h-auto px-2 py-1 text-xs text-foreground"
                  >
                    Review before expiry
                  </Badge>
                </Card>
              </div>
              <Card className="overflow-hidden rounded-xl shadow-none">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                  <h3 className="text-sm font-semibold">Live expiry & stock</h3>
                  <span className="text-xs text-muted-foreground">2 items need attention</span>
                </div>
                <table className="w-full table-fixed text-left text-xs">
                  <caption className="sr-only">
                    Sample batch expiry and reorder alerts for Main Branch on 1 November 2026
                  </caption>
                  <thead className="hidden bg-muted/30 text-muted-foreground sm:table-header-group">
                    <tr>
                      <th scope="col" className="w-1/3 px-4 py-3 font-medium">
                        Medicine / batch
                      </th>
                      <th scope="col" className="px-3 py-3 font-medium">
                        Expiry / stock
                      </th>
                      <th scope="col" className="w-1/3 px-4 py-3 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stock.map((item) => (
                      <tr key={item.batch} className="block p-4 sm:table-row sm:p-0">
                        <td className="block sm:table-cell sm:px-4 sm:py-4">
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-micro text-muted-foreground">
                            Batch {item.batch}
                          </p>
                        </td>
                        <td className="mt-2 block sm:mt-0 sm:table-cell sm:px-3 sm:py-4">
                          <p className="tabular-nums">{item.expiry}</p>
                          <p className="mt-1 text-micro text-muted-foreground tabular-nums">
                            {item.remaining}
                          </p>
                        </td>
                        <td className="mt-3 block sm:mt-0 sm:table-cell sm:px-4 sm:py-4">
                          <Badge
                            variant={item.warning ? 'warning' : 'secondary'}
                            className={cn(
                              'h-auto max-w-full px-2 py-1 text-micro whitespace-normal text-foreground',
                              !item.warning && 'bg-primary/10',
                            )}
                          >
                            <span className="text-xs tabular-nums">{item.status}</span>
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <div className="mt-5 pb-6 lg:pr-72">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold">Today&apos;s counter activity</h3>
                  <span className="text-micro text-muted-foreground">142 bills</span>
                </div>
                <div
                  role="img"
                  aria-label="Illustrative hourly billing activity with a busy afternoon"
                  className="mt-4 flex h-16 items-end gap-2 border-b pb-1"
                >
                  {[
                    'h-3',
                    'h-5',
                    'h-4',
                    'h-8',
                    'h-6',
                    'h-10',
                    'h-12',
                    'h-9',
                    'h-14',
                    'h-11',
                    'h-16',
                    'h-12',
                  ].map((height, index) => (
                    <span
                      key={index}
                      className={cn(
                        'min-w-0 flex-1 rounded-t-sm',
                        height,
                        index > 7 ? 'bg-primary' : 'bg-primary/25',
                      )}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-micro text-muted-foreground">
                  <span>08:00</span>
                  <span>14:00</span>
                  <span>20:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <OwnerCompanion />
      <figcaption className="relative mt-6 text-center text-xs text-muted-foreground lg:mt-14">
        A look inside Dispenco. All figures and pharmacy records shown are illustrative.
      </figcaption>
    </figure>
  );
}
