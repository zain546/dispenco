'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, Check, Loader2, Info } from 'lucide-react';
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? `Edit Role: ${roleToEdit?.name}` : 'Create Custom Role'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure role title and granular access permissions for your pharmacy staff.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Role Name */}
            <div className="space-y-1.5">
              <Label htmlFor="role-name" className="text-xs font-semibold">
                Role Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role-name"
                placeholder="e.g. Inventory Auditor, Assistant Pharmacist"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={roleToEdit?.isDefault}
                className="h-9 text-sm"
              />
              {roleToEdit?.isDefault && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                  <Info className="size-3 text-amber-500" />
                  <span>The title of this system standard role cannot be renamed, but you can adjust permissions.</span>
                </p>
              )}
            </div>

            {/* Permission Selection Summary */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
              <div className="text-xs">
                <span className="font-semibold text-foreground">
                  {selectedPermissions.length} of {totalAvailable} permissions
                </span>{' '}
                <span className="text-muted-foreground">selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSelectedPermissions(
                      permissionsData?.allPermissions || []
                    )
                  }
                  className="h-7 text-xs px-2"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPermissions([])}
                  className="h-7 text-xs px-2 text-muted-foreground"
                >
                  Clear
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
                const someSelected = categoryCodes.some((c) =>
                  selectedPermissions.includes(c)
                );

                return (
                  <div
                    key={category.id}
                    className="border border-border/80 rounded-lg p-3.5 space-y-3 bg-card"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">
                          {category.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCategory(categoryCodes)}
                        className="h-6 text-[11px] px-2 font-medium"
                      >
                        {allSelected ? 'Deselect All' : 'Select Category'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {category.permissions.map((perm) => {
                        const isChecked = selectedPermissions.includes(perm.code);

                        return (
                          <div
                            key={perm.code}
                            onClick={() => togglePermission(perm.code)}
                            className={`flex items-start gap-2.5 p-2.5 rounded-md border text-left cursor-pointer transition-all ${
                              isChecked
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-border/40 hover:bg-muted/30'
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => togglePermission(perm.code)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground leading-tight">
                                {perm.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                                {perm.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-2 font-semibold"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Create Role'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
