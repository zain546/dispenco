'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  Lock,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RoleItem, PermissionsResponse, rolesApi } from '../services/roles-api';
import { RoleModal } from './role-modal';
import { usePermissions } from '@/hooks/use-permissions';

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
  const { isOwner, canManageRoles } = usePermissions();
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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to delete role';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalAvailablePerms = permissionsData?.allPermissions.length || 17;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <span>Workspace Roles & Access Levels</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure permission capabilities for managers, pharmacists, cashiers, and custom roles.
          </p>
        </div>

        {canManageRoles && (
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-1.5 font-semibold text-xs h-9 shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Create Custom Role</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="text-xs">Loading roles and permissions...</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const isRoleOwner = role.name.toLowerCase() === 'owner';
            const permCount = isRoleOwner
              ? totalAvailablePerms
              : role.permissions?.length || 0;

            return (
              <Card
                key={role.id}
                className="border-border/80 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base font-bold text-foreground">
                          {role.name}
                        </CardTitle>
                        {role.isDefault ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold bg-muted/80"
                          >
                            System Role
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold bg-primary/5 text-primary border-primary/20"
                          >
                            Custom Role
                          </Badge>
                        )}
                        {isRoleOwner && (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold gap-1"
                          >
                            <Sparkles className="size-3 fill-amber-500 text-amber-500" />
                            <span>Unrestricted</span>
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-muted-foreground flex items-center gap-2 pt-0.5">
                        <Users className="size-3 text-muted-foreground" />
                        <span>
                          {role.userCount}{' '}
                          {role.userCount === 1 ? 'team member' : 'team members'}{' '}
                          assigned
                        </span>
                      </CardDescription>
                    </div>

                    <div className="text-right shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium border-border"
                      >
                        {permCount} of {totalAvailablePerms} Permissions
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-4">
                  {/* Permissions sample pills */}
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Access Capabilities
                    </p>
                    {isRoleOwner ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                        <span>Full administrative access across all pharmacy stores, inventory, and finances.</span>
                      </div>
                    ) : role.permissions && role.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                        {role.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-background border border-border font-medium text-foreground/90"
                          >
                            <CheckCircle2 className="size-2.5 text-emerald-600 shrink-0" />
                            <span>{perm}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No permissions granted to this role yet.
                      </p>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground">
                      Created: {new Date(role.createdAt).toLocaleDateString()}
                    </span>

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
                              className="h-7 text-xs px-2 gap-1"
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
                              className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
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
      <Dialog
        open={Boolean(roleToDelete)}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-4" />
              <span>Delete Custom Role</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete the custom role{' '}
              <strong>"{roleToDelete?.name}"</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoleToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="gap-1.5 font-semibold"
            >
              {isDeleting && <Loader2 className="size-3 animate-spin" />}
              <span>Delete Role</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
