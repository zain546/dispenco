'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Shield,
  ShieldCheck,
  Briefcase,
  Pill,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Users,
  Check,
  Lock,
  Loader2,
  LayoutGrid,
  Table2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getErrorMessage } from '@/lib/errors';
import { RoleItem, PermissionsResponse, rolesApi } from '../services/roles-api';
import { RoleModal } from './role-modal';
import { RolePermissionsPopover } from './role-permissions-popover';
import { usePermissions } from '@/hooks/use-permissions';
import { PERMISSION_CATEGORIES } from '@dispenco/types';
import { cn } from '@/lib/utils';

const PERM_DEF_MAP = new Map(
  PERMISSION_CATEGORIES.flatMap((c) => c.permissions).map((p) => [p.code as string, p])
);

function getRoleIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower === 'owner') return ShieldCheck;
  if (lower === 'manager') return Briefcase;
  if (lower === 'pharmacist') return Pill;
  if (lower === 'cashier') return CreditCard;
  return Shield;
}

function getRoleDescription(name: string, perms: string[]) {
  const lower = name.toLowerCase();
  if (lower === 'owner') {
    return 'Full unrestricted administrative authority across all pharmacy branches, inventory, and finances.';
  }
  if (lower === 'manager') {
    return 'Store operations, inventory management, POS billing, suppliers, purchasing, and reporting.';
  }
  if (lower === 'pharmacist') {
    return 'Dispensary operations, catalog medicines, batch intake, stock adjustments, and sales.';
  }
  if (lower === 'cashier') {
    return 'Point-of-sale billing counter, customer receipts lookup, and inventory catalog browsing.';
  }
  if (lower === 'staff') {
    return 'Basic operational counter duties: customer sales processing and inventory browsing.';
  }

  // Custom roles
  const names = perms.slice(0, 3).map((p) => PERM_DEF_MAP.get(p)?.name || p);
  return `Custom profile configured with: ${names.join(', ')}${perms.length > 3 ? ` +${perms.length - 3} more` : ''}.`;
}

interface RolesListProps {
  roles: RoleItem[];
  permissionsData: PermissionsResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function RolesList({
  roles,
  permissionsData,
  isLoading,
  onRefresh,
}: RolesListProps) {
  const { canManageRoles } = usePermissions();
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<RoleItem | null>(null);

  // Deletion state
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenCreate = () => {
    setSelectedRoleForEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (role: RoleItem) => {
    setSelectedRoleForEdit(role);
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
      await rolesApi.deleteRole(roleToDelete.id);
      toast.success(`Role "${roleToDelete.name}" deleted successfully`);
      setRoleToDelete(null);
      onRefresh();
    } catch (err: unknown) {
      toast.error('Failed to delete role', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalAvailablePerms = permissionsData?.allPermissions.length || 18;

  return (
    <div className="space-y-4">
      {/* Action Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span>Workspace Roles & Access Levels</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure permission capabilities for managers, pharmacists, cashiers, and custom roles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-muted/80 rounded-lg border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-xs font-medium cursor-pointer',
                viewMode === 'cards'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Cards Grid View"
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden xs:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-xs font-medium cursor-pointer',
                viewMode === 'matrix'
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Full Permissions Matrix View"
            >
              <Table2 className="size-3.5" />
              <span className="hidden xs:inline">Matrix View</span>
            </button>
          </div>

          {canManageRoles && (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 font-medium text-xs h-8 shadow-2xs"
            >
              <Plus className="size-3.5" />
              <span>Create Custom Role</span>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card className="border-border/80">
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="text-xs">Loading roles and permissions...</span>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        /* ================= CARDS VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const isRoleOwner = role.name.toLowerCase() === 'owner';
            const RoleIcon = getRoleIcon(role.name);
            const isSystemRole =
              role.isDefault ||
              ['owner', 'manager', 'pharmacist', 'cashier', 'staff'].includes(
                role.name.toLowerCase()
              );
            const permCount = isRoleOwner
              ? totalAvailablePerms
              : role.permissions?.length || 0;

            const visiblePerms = (role.permissions || []).slice(0, 4);
            const remainingCount = Math.max(0, (role.permissions?.length || 0) - 4);

            return (
              <Card
                key={role.id}
                className="border-border/80 hover:border-border transition-all flex flex-col justify-between shadow-2xs"
              >
                <CardHeader className="p-4 pb-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <RoleIcon className="size-4.5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-bold text-foreground">
                            {role.name}
                          </CardTitle>
                          {isSystemRole ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-medium"
                            >
                              System Role
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-medium border-primary/30 text-primary bg-primary/5"
                            >
                              Custom Role
                            </Badge>
                          )}
                          {isRoleOwner && (
                            <Badge
                              variant="outline"
                              className="bg-primary/5 text-primary border-primary/25 text-[10px] font-medium gap-1"
                            >
                              <ShieldCheck className="size-3" />
                              <span>Unrestricted</span>
                            </Badge>
                          )}
                        </div>

                        <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Users className="size-3 text-muted-foreground shrink-0" />
                          <span>
                            {role.userCount}{' '}
                            {role.userCount === 1 ? 'staff member' : 'staff members'}{' '}
                            assigned
                          </span>
                        </CardDescription>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium border-border"
                      >
                        {isRoleOwner ? `All ${totalAvailablePerms}` : `${permCount} of ${totalAvailablePerms}`} Perms
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {getRoleDescription(role.name, role.permissions || [])}
                  </p>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3">
                  {/* Capabilities Preview */}
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Operational Capabilities
                      </span>
                    </div>

                    {isRoleOwner ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                        <Check className="size-3.5 text-primary shrink-0" />
                        <span>All 18 system actions enabled with primary administrative authority.</span>
                      </div>
                    ) : role.permissions && role.permissions.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {visiblePerms.map((perm) => {
                            const def = PERM_DEF_MAP.get(perm);
                            return (
                              <div
                                key={perm}
                                className="flex items-center gap-1.5 text-xs text-foreground/90 p-1.5 rounded-md bg-card border border-border/50 truncate"
                                title={def ? `${def.name}: ${def.description}` : perm}
                              >
                                <Check className="size-3 text-primary shrink-0" />
                                <span className="truncate font-medium text-[11px]">
                                  {def?.name || perm}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {remainingCount > 0 && (
                          <p className="text-[11px] text-muted-foreground pt-0.5">
                            +{remainingCount} additional operational actions permitted
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-1">
                        No permissions assigned to this role yet.
                      </p>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <RolePermissionsPopover
                      roleName={role.name}
                      permissions={role.permissions}
                      isOwner={isRoleOwner}
                      triggerVariant="button"
                    />

                    <div className="flex items-center gap-1.5">
                      {isRoleOwner ? (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Lock className="size-3" />
                          <span>Protected</span>
                        </span>
                      ) : (
                        <>
                          {canManageRoles && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(role)}
                              className="h-7 text-xs px-2.5 gap-1 shadow-2xs font-medium"
                            >
                              <Edit2 className="size-3" />
                              <span>Configure</span>
                            </Button>
                          )}
                          {!role.isDefault && canManageRoles && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRoleToDelete(role)}
                              className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete custom role"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ================= MATRIX TABLE VIEW ================= */
        <Card className="overflow-hidden border-border/80 shadow-2xs">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-foreground font-semibold">
                    <th className="py-3 px-4 min-w-56">Permission & Capability</th>
                    {roles.map((r) => {
                      const isOwner = r.name.toLowerCase() === 'owner';
                      return (
                        <th key={r.id} className="py-3 px-3 text-center min-w-28">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-bold text-xs">{r.name}</span>
                            <span className="text-[10px] text-muted-foreground font-normal font-mono">
                              {isOwner ? 'All 18' : `${r.permissions.length} perms`}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PERMISSION_CATEGORIES.map((cat) => (
                    <React.Fragment key={cat.id}>
                      {/* Category Header Row */}
                      <tr className="bg-muted/20">
                        <td
                          colSpan={roles.length + 1}
                          className="py-2 px-4 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider"
                        >
                          {cat.title}
                        </td>
                      </tr>

                      {/* Permission Rows */}
                      {cat.permissions.map((perm) => (
                        <tr key={perm.code} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4">
                            <p className="font-medium text-xs text-foreground">
                              {perm.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {perm.description}
                            </p>
                          </td>

                          {roles.map((r) => {
                            const isOwner = r.name.toLowerCase() === 'owner';
                            const hasPerm = isOwner || r.permissions.includes(perm.code);

                            return (
                              <td key={r.id} className="py-2.5 px-3 text-center">
                                {hasPerm ? (
                                  <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary mx-auto">
                                    <Check className="size-3" />
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40 text-xs">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Create/Edit Modal */}
      <RoleModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedRoleForEdit(null);
        }}
        onSuccess={onRefresh}
        roleToEdit={selectedRoleForEdit}
        permissionsData={permissionsData}
      />

      {/* Role Deletion Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(roleToDelete)}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
        title="Delete Custom Role"
        description={`Are you sure you want to delete the custom role "${roleToDelete?.name}"? Staff assigned to this role will need to be reassigned.`}
        confirmLabel="Delete Role"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
