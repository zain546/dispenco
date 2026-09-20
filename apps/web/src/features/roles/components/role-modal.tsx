'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Shield,
  Check,
  Loader2,
  Info,
  Package,
  CreditCard,
  Building2,
  BarChart3,
  Users,
  CheckCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { rolesApi, RoleItem, PermissionsResponse } from '../services/roles-api';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit?: RoleItem | null;
  permissionsData: PermissionsResponse | null;
}

function getCategoryIcon(id: string) {
  switch (id) {
    case 'inventory':
      return <Package className="size-4 text-primary shrink-0" />;
    case 'sales':
      return <CreditCard className="size-4 text-primary shrink-0" />;
    case 'purchasing':
      return <Building2 className="size-4 text-primary shrink-0" />;
    case 'reports':
      return <BarChart3 className="size-4 text-primary shrink-0" />;
    case 'administration':
      return <Users className="size-4 text-primary shrink-0" />;
    default:
      return <Shield className="size-4 text-primary shrink-0" />;
  }
}

export function RoleModal({
  isOpen,
  onClose,
  onSuccess,
  roleToEdit,
  permissionsData,
}: RoleModalProps) {
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(roleToEdit);

  useEffect(() => {
    if (roleToEdit) {
      setName(roleToEdit.name);
      setSelectedPermissions(roleToEdit.permissions || []);
    } else {
      setName('');
      setSelectedPermissions([]);
    }
  }, [roleToEdit, isOpen]);

  const categories = permissionsData?.categories || [];
  const totalAvailable = permissionsData?.allPermissions.length || 0;
  const percentageActive = totalAvailable > 0
    ? Math.round((selectedPermissions.length / totalAvailable) * 100)
    : 0;

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const toggleCategory = (categoryPermCodes: string[]) => {
    const allSelected = categoryPermCodes.every((c) =>
      selectedPermissions.includes(c)
    );
    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((p) => !categoryPermCodes.includes(p))
      );
    } else {
      setSelectedPermissions((prev) => {
        const combined = new Set([...prev, ...categoryPermCodes]);
        return Array.from(combined);
      });
    }
  };

  const handleSelectAll = () => {
    setSelectedPermissions(permissionsData?.allPermissions || []);
  };

  const handleClearAll = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      toast.error('Role name is required');
      return;
    }

    if (cleanName.toLowerCase() === 'owner') {
      toast.error('The name "Owner" is reserved for the primary account');
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error('Please grant at least one permission to this role');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && roleToEdit) {
        await rolesApi.updateRole(roleToEdit.id, {
          name: cleanName,
          permissionNames: selectedPermissions,
        });
        toast.success(`Role "${cleanName}" updated successfully`);
      } else {
        await rolesApi.createRole({
          name: cleanName,
          permissionNames: selectedPermissions,
        });
        toast.success(`Role "${cleanName}" created successfully`);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save role';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl w-[calc(100vw-2rem)] max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl border border-border bg-background">
        {/* Header */}
        <DialogHeader className="p-4 sm:px-6 sm:py-4 border-b border-border/80 shrink-0 bg-muted/20 pr-12">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Shield className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                  {isEditing ? `Edit Role: ${roleToEdit?.name}` : 'Create Custom Role'}
                </DialogTitle>
                {roleToEdit?.isDefault ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium border-primary/30 text-primary bg-primary/5 py-0"
                  >
                    System Standard
                  </Badge>
                ) : isEditing ? (
                  <Badge variant="secondary" className="text-[10px] py-0">
                    Custom Role
                  </Badge>
                ) : null}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure role title and granular access permissions for your pharmacy staff.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
            {/* Role Name Input */}
            <div className="space-y-1.5">
              <Label htmlFor="role-name" className="text-xs font-semibold text-foreground">
                Role Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role-name"
                placeholder="e.g. Inventory Auditor, Assistant Pharmacist"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={roleToEdit?.isDefault}
                className="h-9 text-sm bg-background font-medium"
                required
              />
              {roleToEdit?.isDefault ? (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground mt-1">
                  <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    The title of this system standard role is protected, but you can customize any operational permissions below.
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Give this role a distinct name indicating the member&apos;s pharmacy operational duties.
                </p>
              )}
            </div>

            {/* Permission Selection Summary & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-muted/40 border border-border/70">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-background border border-border/60 flex items-center justify-center font-bold text-xs text-primary font-mono shrink-0 shadow-2xs">
                  {selectedPermissions.length}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {selectedPermissions.length} of {totalAvailable} capabilities granted
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ({percentageActive}%)
                    </span>
                  </div>
                  <div className="w-40 sm:w-48 bg-muted rounded-full h-1.5 mt-1.5 overflow-hidden border border-border/50">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${percentageActive}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs px-2.5 font-medium cursor-pointer"
                >
                  <CheckCheck className="size-3 mr-1 text-primary" />
                  <span>Select All</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Permission Categories */}
            <div className="space-y-4">
              {categories.map((category) => {
                const categoryCodes = category.permissions.map((p) => p.code);
                const allSelected = categoryCodes.every((c) =>
                  selectedPermissions.includes(c)
                );
                const activeCount = categoryCodes.filter((c) =>
                  selectedPermissions.includes(c)
                ).length;

                return (
                  <div
                    key={category.id}
                    className="border border-border/80 rounded-xl p-3.5 sm:p-4 space-y-3 bg-card shadow-2xs"
                  >
                    {/* Category Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/50">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-muted/80 flex items-center justify-center shrink-0">
                          {getCategoryIcon(category.id)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground">
                              {category.title}
                            </h4>
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-mono px-1.5 py-0"
                            >
                              {activeCount} / {category.permissions.length}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {category.description}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCategory(categoryCodes)}
                        className="h-6 text-[11px] px-2.5 font-medium self-end sm:self-center cursor-pointer shrink-0"
                      >
                        {allSelected ? 'Deselect All' : 'Select Category'}
                      </Button>
                    </div>

                    {/* Permissions 2-Column Responsive Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-0.5">
                      {category.permissions.map((perm) => {
                        const isChecked = selectedPermissions.includes(perm.code);

                        return (
                          <div
                            key={perm.code}
                            onClick={() => togglePermission(perm.code)}
                            className={`flex items-start gap-2.5 p-3 rounded-lg border text-left cursor-pointer transition-all duration-150 select-none ${
                              isChecked
                                ? 'border-primary/50 bg-primary/[0.04] shadow-2xs'
                                : 'border-border/60 bg-card hover:bg-muted/40 hover:border-border'
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => togglePermission(perm.code)}
                              className="mt-0.5 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground leading-tight">
                                {perm.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">
                                {perm.description}
                              </p>
                            </div>
                            {isChecked && (
                              <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Responsive Footer */}
          <DialogFooter className="p-3.5 sm:px-6 sm:py-3.5 border-t border-border/80 shrink-0 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground text-center sm:text-left">
              <span className="font-semibold text-foreground">
                {selectedPermissions.length}
              </span>{' '}
              permissions enabled for this role
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="gap-2 font-semibold cursor-pointer shadow-xs"
              >
                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                <span>{isEditing ? 'Save Changes' : 'Create Role'}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
