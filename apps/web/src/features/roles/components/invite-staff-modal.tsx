'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
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
import { rolesApi, RoleItem, StaffUserItem } from '../services/roles-api';

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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save staff member';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {isEditing ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {isEditing ? `Edit Team Member: ${userToEdit?.name}` : 'Add Staff Team Member'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? 'Update staff profile details or reassign access role.'
                  : 'Invite a pharmacist, cashier, or store manager to your pharmacy.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
            <Label htmlFor="staff-role" className="text-xs font-semibold">
              Assigned Role <span className="text-destructive">*</span>
            </Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="staff-role" className="h-9 text-sm">
                <SelectValue placeholder="Select an access role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {r.permissions.length} perms
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
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
              <span>{isEditing ? 'Save Changes' : 'Create Staff Member'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
