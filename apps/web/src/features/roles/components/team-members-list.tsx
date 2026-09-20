'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Edit,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { StaffUserItem, RoleItem, rolesApi } from '../services/roles-api';
import { InviteStaffModal } from './invite-staff-modal';
import { RolePermissionsPopover } from './role-permissions-popover';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/hooks/use-permissions';

interface TeamMembersListProps {
  users: StaffUserItem[];
  roles: RoleItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function TeamMembersList({
  users,
  roles,
  isLoading,
  onRefresh,
}: TeamMembersListProps) {
  const { user: currentUser } = useAuth();
  const { canManageStaff } = usePermissions();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<StaffUserItem | null>(null);

  const handleOpenAdd = () => {
    setSelectedUserForEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (user: StaffUserItem) => {
    setSelectedUserForEdit(user);
    setModalOpen(true);
  };

  const handleToggleActive = async (user: StaffUserItem) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot deactivate your own account');
      return;
    }

    const newActive = !user.isActive;
    try {
      await rolesApi.updateUser(user.id, { isActive: newActive });
      toast.success(
        newActive
          ? `Account for "${user.name}" has been reactivated`
          : `Account for "${user.name}" has been deactivated`
      );
      onRefresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to update user status';
      toast.error(msg);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (roleName: string) => {
    const lower = roleName.toLowerCase();
    if (lower === 'owner') {
      return (
        <Badge
          variant="outline"
          className="bg-primary/5 text-primary border-primary/25 text-[10px] font-medium gap-1"
        >
          <ShieldCheck className="size-3" />
          <span>Owner</span>
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] font-medium">
        {roleName}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <span>Staff & Pharmacy Team</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage employees, assign access roles, and control operational permissions.
          </p>
        </div>

        {canManageStaff && (
          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="gap-1.5 font-semibold text-xs h-9 shadow-xs"
          >
            <UserPlus className="size-3.5" />
            <span>Add Team Member</span>
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Filter team members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-xs"
        />
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden border-border/80">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Loading team members...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="size-6" />
              </div>
              <p className="font-semibold text-sm text-foreground">No Team Members Found</p>
              <p className="text-xs">
                {search
                  ? 'No staff matched your search query.'
                  : 'Add team members and assign them roles to collaborate.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const matchedRole = roles.find(
                      (r) =>
                        (u.roleId && r.id === u.roleId) ||
                        r.name.toLowerCase() === u.role.toLowerCase()
                    );

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {/* Name & Avatar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground text-xs flex items-center gap-1.5 truncate">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1.5 py-0"
                                  >
                                    You
                                  </Badge>
                                )}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {getRoleBadge(u.role)}
                            <RolePermissionsPopover
                              roleName={u.role}
                              permissions={matchedRole?.permissions}
                              isOwner={u.isOwner}
                              triggerVariant="icon"
                            />
                          </div>
                        </td>

                        {/* Contact Phone */}
                        <td className="py-3 px-4 text-muted-foreground">
                          {u.phone || '—'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="size-2.5" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded-full border border-zinc-500/20">
                              <XCircle className="size-2.5" />
                              <span>Deactivated</span>
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {canManageStaff && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(u)}
                                className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                              >
                                <Edit className="size-3" />
                                <span>Edit</span>
                              </Button>

                              {!u.isOwner && !isSelf && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleActive(u)}
                                  className={`h-7 text-xs px-2 ${
                                    u.isActive
                                      ? 'text-destructive hover:bg-destructive/10'
                                      : 'text-emerald-600 hover:bg-emerald-500/10'
                                  }`}
                                >
                                  {u.isActive ? 'Deactivate' : 'Reactivate'}
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite/Edit Staff Modal */}
      <InviteStaffModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedUserForEdit(null);
        }}
        onSuccess={onRefresh}
        roles={roles}
        userToEdit={selectedUserForEdit}
      />
    </div>
  );
}
