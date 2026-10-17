'use client';

import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Check,
  Minus,
  Info,
  CircleAlert,
} from 'lucide-react';
import {
  PERMISSION_CATEGORIES,
  ALL_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
  DEFAULT_PHARMACIST_PERMISSIONS,
  DEFAULT_CASHIER_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
} from '@dispenco/types';
import { cn } from '@/lib/utils';

export interface RolePermissionsPopoverProps {
  roleName: string;
  permissions?: string[];
  isOwner?: boolean;
  triggerVariant?: 'badge' | 'icon' | 'button';
  className?: string;
}

export function RolePermissionsPopover({
  roleName,
  permissions = [],
  isOwner = false,
  triggerVariant = 'badge',
  className,
}: RolePermissionsPopoverProps) {
  const isRoleOwner = isOwner || roleName.toLowerCase() === 'owner';

  // Get effective permissions with role fallbacks
  const getEffectivePermissions = (): string[] => {
    if (isRoleOwner) return ALL_PERMISSIONS as string[];
    if (permissions && permissions.length > 0) return permissions;

    const lower = roleName.toLowerCase();
    if (lower === 'manager') return DEFAULT_MANAGER_PERMISSIONS as string[];
    if (lower === 'pharmacist') return DEFAULT_PHARMACIST_PERMISSIONS as string[];
    if (lower === 'cashier') return DEFAULT_CASHIER_PERMISSIONS as string[];
    if (lower === 'staff') return DEFAULT_STAFF_PERMISSIONS as string[];
    return [];
  };

  const effectivePermissions = getEffectivePermissions();
  const [filterMode, setFilterMode] = useState<'granted' | 'all'>('granted');

  const totalSystemPerms = ALL_PERMISSIONS.length;
  const grantedCount = isRoleOwner ? totalSystemPerms : effectivePermissions.length;

  // Group permissions by category
  const categoriesWithPermissions = PERMISSION_CATEGORIES.map((cat) => {
    const activePerms = cat.permissions.filter((p) =>
      isRoleOwner ? true : effectivePermissions.includes(p.code)
    );
    const restrictedPerms = cat.permissions.filter((p) =>
      isRoleOwner ? false : !effectivePermissions.includes(p.code)
    );

    return {
      ...cat,
      activePerms,
      restrictedPerms,
      allCategoryPerms: cat.permissions,
    };
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        {triggerVariant === 'icon' ? (
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center size-5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
              className
            )}
            title={`View permissions for ${roleName}`}
            aria-label={`View permissions for ${roleName}`}
          >
            <CircleAlert className="size-3.5" />
          </button>
        ) : triggerVariant === 'badge' ? (
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 border border-border/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
              className
            )}
            title={`View permissions for ${roleName}`}
            aria-label={`View permissions for ${roleName}`}
          >
            <CircleAlert className="size-3 text-muted-foreground" />
            <span>Permissions</span>
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer',
              className
            )}
            title={`View all permissions for ${roleName}`}
          >
            <CircleAlert className="size-3.5 text-muted-foreground" />
            <span>View Permissions</span>
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-80 sm:w-96 p-0 max-h-[80vh] flex flex-col shadow-lg border-border bg-popover z-50 rounded-xl"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="size-4 text-primary shrink-0" />
              <span className="font-semibold text-sm text-foreground truncate">
                {roleName}
              </span>
            </div>
            <Badge
              variant="secondary"
              className="text-micro font-medium shrink-0"
            >
              {grantedCount} of {totalSystemPerms} Granted
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Info className="size-3 shrink-0 text-muted-foreground" />
            <span>Operational rights and access restrictions for this role:</span>
          </p>

          {/* Filter toggle (Granted vs All) */}
          {!isRoleOwner && (
            <div className="flex items-center gap-1 mt-2.5 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-micro">
              <button
                type="button"
                onClick={() => setFilterMode('granted')}
                className={cn(
                  'flex-1 py-1 rounded-md transition-all text-center',
                  filterMode === 'granted'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Granted ({grantedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={cn(
                  'flex-1 py-1 rounded-md transition-all text-center',
                  filterMode === 'all'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All Capabilities ({totalSystemPerms})
              </button>
            </div>
          )}
        </div>

        {/* Content List */}
        <div className="p-3.5 overflow-y-auto flex-1 space-y-3 text-xs custom-scrollbar">
          {isRoleOwner ? (
            <div className="p-3 rounded-lg bg-muted/40 border border-border/80 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <ShieldCheck className="size-4 text-primary shrink-0" />
                <span>Full Administrator Authority</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full administrative authority across all store branches, stock intake, billing, financial ledgers, staff accounts, and system configuration.
              </p>
              <div className="pt-2 border-t border-border/60 flex items-center gap-1.5 text-xs text-foreground/80 font-medium">
                <Check className="size-3.5 text-primary" />
                <span>All {totalSystemPerms} system capabilities active</span>
              </div>
            </div>
          ) : (
            categoriesWithPermissions.map((cat) => {
              const permsToShow =
                filterMode === 'granted'
                  ? cat.activePerms
                  : cat.allCategoryPerms;

              if (filterMode === 'granted' && permsToShow.length === 0) {
                return null;
              }

              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                      {cat.title}
                    </p>
                    <span className="text-micro text-muted-foreground">
                      {cat.activePerms.length} of {cat.allCategoryPerms.length}
                    </span>
                  </div>

                  <div className="divide-y divide-border/40 rounded-lg border border-border/60 bg-card overflow-hidden">
                    {permsToShow.map((perm) => {
                      const isGranted =
                        isRoleOwner || effectivePermissions.includes(perm.code);

                      return (
                        <div
                          key={perm.code}
                          className={cn(
                            'p-2 flex items-start gap-2 transition-colors',
                            isGranted ? 'hover:bg-muted/40' : 'opacity-50 bg-muted/20'
                          )}
                        >
                          {isGranted ? (
                            <Check className="size-3.5 text-primary mt-0.5 shrink-0" />
                          ) : (
                            <Minus className="size-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={cn(
                                  'font-medium text-xs truncate',
                                  isGranted
                                    ? 'text-foreground'
                                    : 'text-muted-foreground line-through decoration-muted-foreground/40'
                                )}
                              >
                                {perm.name}
                              </span>
                              <span className="text-micro font-mono text-muted-foreground/60 shrink-0">
                                {perm.code}
                              </span>
                            </div>
                            <p className="text-micro text-muted-foreground line-clamp-2 mt-0.5">
                              {perm.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
