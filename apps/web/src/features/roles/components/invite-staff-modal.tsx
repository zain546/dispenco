'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UserPlus, UserCheck, Loader2, CircleAlert, ShieldCheck, Check } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { rolesApi, RoleItem, StaffUserItem } from '../services/roles-api';
import { getErrorMessage } from '@/lib/errors';
import { PERMISSION_CATEGORIES } from '@dispenco/types';

const PERM_DEF_MAP = new Map(
  PERMISSION_CATEGORIES.flatMap((c) => c.permissions).map((p) => [p.code as string, p])
);

function getRoleTooltipText(roleName: string, perms: string[]): string {
  const lower = roleName.toLowerCase();
  if (lower === 'owner') {
    return 'Full unrestricted administrative authority across all store branches, inventory, POS sales, financial ledgers, staff accounts, and system settings.';
  }
  if (perms.length === 0) {
    return 'No active permissions assigned.';
  }
  const names = perms.map((p) => PERM_DEF_MAP.get(p)?.name || p);
  return names.join(', ');
}

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: RoleItem[];
  userToEdit?: StaffUserItem | null;
}

export function InviteStaffModal({
  isOpen,
  onClose,
  onSuccess,
  roles,
  userToEdit,
}: InviteStaffModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(userToEdit);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setPassword('');
      setPhone(userToEdit.phone || '');
      setRoleId(userToEdit.roleId || '');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      // Default to Cashier or Staff role if available
      const defaultRole =
        roles.find((r) => r.name.toLowerCase() === 'cashier') ||
        roles.find((r) => r.name.toLowerCase() === 'staff') ||
        roles[0];
      setRoleId(defaultRole?.id || '');
    }
  }, [userToEdit, roles, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      toast.error('Staff name is required');
      return;
    }

    if (!isEditing && !cleanEmail) {
      toast.error('Email address is required');
      return;
    }

    if (!isEditing && (!password || password.length < 6)) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!roleId) {
      toast.error('Please assign a role to this team member');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && userToEdit) {
        await rolesApi.updateUser(userToEdit.id, {
          name: cleanName,
          phone: phone.trim() || undefined,
          roleId,
        });
        toast.success(`Team member "${cleanName}" updated successfully`);
      } else {
        await rolesApi.createUser({
          name: cleanName,
          email: cleanEmail,
          password,
          phone: phone.trim() || undefined,
          roleId,
        });
        toast.success(`Staff account for "${cleanName}" created successfully`);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error('Failed to save staff member', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl border border-border bg-background">
        <DialogHeader className="p-4 sm:p-5 border-b border-border/80 shrink-0 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {isEditing ? <UserCheck className="size-5" /> : <UserPlus className="size-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {isEditing ? `Edit Team Member: ${userToEdit?.name}` : 'Add Staff Team Member'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? 'Update staff profile details or reassign operational role.'
                  : 'Invite a pharmacist, cashier, or store manager to your pharmacy.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="staff-name" className="text-xs font-semibold">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="staff-name"
              placeholder="e.g. Farhan Ahmed"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
              required
            />
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <Label htmlFor="staff-email" className="text-xs font-semibold">
              Email Address {!isEditing && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="staff-email"
              type="email"
              placeholder="farhan@pharmacy.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEditing}
              className="h-9 text-sm"
              required={!isEditing}
            />
            {isEditing && (
              <p className="text-[11px] text-muted-foreground">
                Email address is used as the unique login credential and cannot be changed.
              </p>
            )}
          </div>

          {/* Temporary Password (only when creating) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="staff-password" className="text-xs font-semibold">
                Temporary Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="staff-password"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>
          )}

          {/* Phone Number */}
          <div className="space-y-1.5">
            <Label htmlFor="staff-phone" className="text-xs font-semibold">
              Phone Number (Optional)
            </Label>
            <Input
              id="staff-phone"
              placeholder="e.g. +92 300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="staff-role" className="text-xs font-semibold">
                Assigned Role <span className="text-destructive">*</span>
              </Label>
            </div>

            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="staff-role" className="h-9 text-xs sm:text-sm bg-background">
                <SelectValue placeholder="Select an access role" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="w-[var(--radix-select-trigger-width)] max-h-60"
              >
                {roles.map((r) => {
                  const isOwner = r.name.toLowerCase() === 'owner';
                  const tooltipText = getRoleTooltipText(r.name, r.permissions);

                  return (
                    <SelectItem
                      key={r.id}
                      value={r.id}
                      textValue={r.name}
                      className="cursor-pointer py-1.5"
                    >
                      <div className="flex items-center justify-between gap-3 w-full pr-4">
                        <span className="font-medium text-xs">{r.name}</span>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="text-[10px] font-mono">
                            {isOwner ? '17 perms' : `${r.permissions.length} perms`}
                          </span>
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-flex items-center justify-center size-4 rounded-full hover:text-foreground transition-colors cursor-pointer"
                                  title={`${r.name}: ${tooltipText}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <CircleAlert className="size-3 text-muted-foreground hover:text-foreground" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                align="center"
                                className="flex flex-col items-start w-64 p-3 bg-popover text-popover-foreground border border-border shadow-xl rounded-lg z-50 text-left [&>.rotate-45]:hidden"
                              >
                                <div className="flex items-center justify-between gap-2 w-full border-b border-border/60 pb-1.5">
                                  <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                                    <ShieldCheck className="size-3.5 text-primary shrink-0" />
                                    <span>{r.name} Permissions</span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {isOwner ? '17 perms' : `${r.permissions.length} perms`}
                                  </span>
                                </div>

                                {isOwner ? (
                                  <div className="pt-1 space-y-1">
                                    <p className="font-medium text-foreground text-xs">
                                      Full Administrator Authority
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                      Complete unrestricted access across all store branches, stock intake, billing, financial ledgers, staff accounts, and store settings.
                                    </p>
                                  </div>
                                ) : r.permissions.length === 0 ? (
                                  <p className="text-[11px] text-muted-foreground italic pt-1">
                                    No permissions assigned to this role.
                                  </p>
                                ) : (
                                  <div className="flex flex-col gap-1 w-full pt-1 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                                    {r.permissions.map((p) => {
                                      const def = PERM_DEF_MAP.get(p);
                                      return (
                                        <div
                                          key={p}
                                          className="flex items-center gap-1.5 text-[11px] text-foreground/90"
                                        >
                                          <Check className="size-3 text-primary shrink-0" />
                                          <span className="truncate">{def?.name || p}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          </div>

          <DialogFooter className="p-4 sm:p-5 border-t border-border/80 shrink-0 bg-muted/20 flex flex-row items-center justify-end gap-2">
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
              <span>{isEditing ? 'Save Changes' : 'Create Staff Member'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
