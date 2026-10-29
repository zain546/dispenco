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
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, getInitials } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
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
      toast.error('Failed to update user status', {
        description: getErrorMessage(err),
      });
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
          className="border-primary/30 text-primary bg-primary/5 text-micro font-medium gap-1"
        >
          <ShieldCheck className="size-3" />
          <span>Owner</span>
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-micro font-medium">
        {roleName}
      </Badge>
    );
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Search Toolbar & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search staff by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-7 h-8.5 text-xs bg-muted/20 focus-visible:bg-background rounded-lg border-border/70"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {canManageStaff && (
          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="h-8.5 gap-1.5 font-bold text-xs shadow-xs cursor-pointer shrink-0 bg-primary hover:bg-primary/95 text-primary-foreground"
          >
            <UserPlus className="size-3.5" />
            <span>Add Team Member</span>
          </Button>
        )}
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden border-border/80 shadow-2xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Loading team members...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={Users}
                title="No Team Members Found"
                description={
                  search
                    ? 'No staff members matched your search query.'
                    : 'Add team members and assign them roles to collaborate in your pharmacy.'
                }
                action={
                  !search && canManageStaff ? (
                    <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 h-8 text-xs font-medium">
                      <UserPlus className="size-3.5" />
                      <span>Add First Team Member</span>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              {/* Mobile Card List (Visible on < md) */}
              <div className="md:hidden divide-y divide-border/60">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const matchedRole = roles.find(
                    (r) =>
                      (u.roleId && r.id === u.roleId) ||
                      r.name.toLowerCase() === u.role.toLowerCase()
                  );

                  return (
                    <div
                      key={u.id}
                      className="p-3.5 space-y-2.5 hover:bg-muted/15 transition-colors"
                    >
                      {/* Top Row: Avatar + Name + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-primary/20">
                            {getInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5 truncate">
                              <span>{u.name}</span>
                              {isSelf && (
                                <Badge
                                  variant="secondary"
                                  className="text-micro px-1.5 py-0 font-bold"
                                >
                                  You
                                </Badge>
                              )}
                            </p>
                            <p className="text-micro sm:text-xs text-muted-foreground truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>

                        <div>
                          {u.isActive ? (
                            <Badge variant="success" className="text-micro gap-1 px-1.5 py-0.5">
                              <CheckCircle2 className="size-2.5" />
                              <span>Active</span>
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-micro gap-1 px-1.5 py-0.5">
                              <XCircle className="size-2.5" />
                              <span>Deactivated</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Middle Row: Role badge + Contact */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                        <div className="flex items-center gap-1.5">
                          {getRoleBadge(u.role)}
                          <RolePermissionsPopover
                            roleName={u.role}
                            permissions={matchedRole?.permissions}
                            isOwner={u.isOwner}
                            triggerVariant="icon"
                          />
                        </div>

                        {u.phone ? (
                          <span className="text-micro text-muted-foreground tabular-nums">
                            {u.phone}
                          </span>
                        ) : (
                          <span className="text-micro text-muted-foreground/60">
                            Joined {formatDate(u.createdAt)}
                          </span>
                        )}
                      </div>

                      {/* Bottom Actions Row */}
                      {canManageStaff && (
                        <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-border/30">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(u)}
                            className="h-7 text-xs font-semibold px-2.5 gap-1 text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                          >
                            <Edit className="size-3 text-primary" />
                            <span>Edit Role</span>
                          </Button>

                          {!u.isOwner && !isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(u)}
                              className={`h-7 text-xs font-semibold px-2.5 cursor-pointer ${
                                u.isActive
                                  ? 'text-destructive hover:bg-destructive/10'
                                  : 'text-success hover:bg-success/10'
                              }`}
                            >
                              {u.isActive ? 'Deactivate' : 'Reactivate'}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Data Table (Visible on >= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Joined</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
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
                          className="hover:bg-muted/20 transition-colors"
                        >
                          {/* Name & Avatar */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                                {getInitials(u.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground text-xs flex items-center gap-1.5 truncate">
                                  <span>{u.name}</span>
                                  {isSelf && (
                                    <Badge
                                      variant="secondary"
                                      className="text-micro px-1.5 py-0"
                                    >
                                      You
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
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
                              <Badge variant="success" className="text-micro gap-1 px-1.5 py-0">
                                <CheckCircle2 className="size-2.5" />
                                <span>Active</span>
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-micro gap-1 px-1.5 py-0">
                                <XCircle className="size-2.5" />
                                <span>Deactivated</span>
                              </Badge>
                            )}
                          </td>

                          {/* Joined Date */}
                          <td className="py-3 px-4 text-muted-foreground">
                            {formatDate(u.createdAt)}
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
                                        : 'text-success hover:bg-success/10'
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
            </>
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
