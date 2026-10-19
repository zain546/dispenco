'use client';

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/context/store-context';
import { usePermissions } from '@/hooks/use-permissions';
import { CreateStoreModal } from './create-store-modal';
import {
  Store,
  Check,
  ChevronDown,
  PlusCircle,
  Layers,
  MapPin,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreSwitcherProps {
  className?: string;
  isCollapsed?: boolean;
}

export function StoreSwitcher({ className }: StoreSwitcherProps) {
  const { stores, activeStoreId, activeStore, isAllStores, isMultiStore, setActiveStoreId } = useStore();
  const permissions = usePermissions();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const displayTitle = isAllStores
    ? 'All Stores (Org Overview)'
    : activeStore?.name || stores[0]?.name || 'Select Store Branch';

  const canManageStores = permissions.canManageSettings;

  // Single-Store View: Zero clutter, clean pharmacy badge without dropdown distraction
  if (!isMultiStore) {
    return (
      <>
        <div
          className={cn(
            'flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-border/70 bg-muted/40 text-xs font-semibold text-foreground shrink-0 max-w-[205px] sm:max-w-[260px] shadow-2xs',
            className
          )}
        >
          <div className="size-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Store className="size-3.5" />
          </div>
          <span className="truncate font-semibold text-foreground text-left flex-1">
            {displayTitle}
          </span>
          {canManageStores && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded shrink-0"
              title="Add a 2nd branch store to unlock multi-store features"
            >
              <PlusCircle className="size-3.5" />
            </button>
          )}
        </div>
        <CreateStoreModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
      </>
    );
  }

  // Multi-Store View: Full branch switcher with Org-level overview
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-label="Select a store branch"
            className={cn(
              'h-9 gap-1.5 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm font-medium border-border/80 hover:bg-accent/60 hover:text-accent-foreground transition-all shrink-0 max-w-[205px] sm:max-w-[260px] justify-between shadow-2xs',
              className
            )}
          >
            <div className="flex items-center gap-2 truncate min-w-0">
              {isAllStores ? (
                <div className="size-5 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Layers className="size-3.5" />
                </div>
              ) : (
                <div className="size-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Store className="size-3.5" />
                </div>
              )}
              <span className="truncate font-semibold text-foreground text-left">
                {displayTitle}
              </span>
            </div>
            <ChevronDown className="size-3.5 opacity-60 shrink-0 ml-1" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64 sm:w-72 p-1.5 shadow-md">
          <DropdownMenuLabel className="text-micro font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center justify-between">
            <span>Branches & Outlets</span>
            <Badge variant="secondary" className="text-micro px-1.5 py-0 h-4 font-semibold">
              {stores.length} Stores
            </Badge>
          </DropdownMenuLabel>

          {/* Org-Level All Stores View */}
          <DropdownMenuItem
            onClick={() => setActiveStoreId('all')}
            className={cn(
              'flex items-center justify-between px-2 py-2 text-xs rounded-md cursor-pointer transition-colors',
              isAllStores ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-6 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Layers className="size-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground">All Stores (Org Overview)</div>
                <div className="text-micro text-muted-foreground truncate">
                  Consolidated multi-branch analytics
                </div>
              </div>
            </div>
            {isAllStores && <Check className="size-4 text-primary shrink-0 ml-2" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1" />

          {/* Individual Store Branches */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
            {stores.map((store) => {
              const isSelected = !isAllStores && store.id === activeStoreId;

              return (
                <DropdownMenuItem
                  key={store.id}
                  onClick={() => setActiveStoreId(store.id)}
                  className={cn(
                    'flex items-center justify-between px-2 py-2 text-xs rounded-md cursor-pointer transition-colors',
                    isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Building2 className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate">{store.name}</div>
                      {store.address ? (
                        <div className="text-micro text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="size-2.5 shrink-0" />
                          <span className="truncate">{store.address}</span>
                        </div>
                      ) : (
                        <div className="text-micro text-muted-foreground">
                          {store.currency} • Active Counter
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="size-4 text-primary shrink-0 ml-2" />}
                </DropdownMenuItem>
              );
            })}
          </div>

          {/* Create Store Action */}
          {canManageStores && (
            <>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-2 px-2 py-2 text-xs text-primary font-semibold hover:bg-primary/10 rounded-md cursor-pointer transition-colors"
              >
                <PlusCircle className="size-4" />
                <span>+ Add Branch Store</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateStoreModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </>
  );
}
