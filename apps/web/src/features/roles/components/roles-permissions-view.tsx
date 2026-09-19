'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Users, Shield, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  rolesApi,
  RoleItem,
  StaffUserItem,
  PermissionsResponse,
} from '../services/roles-api';
import { TeamMembersList } from './team-members-list';
import { RolesList } from './roles-list';

export function RolesPermissionsView() {
  const [activeTab, setActiveTab] = useState<'team' | 'roles'>('team');
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [users, setUsers] = useState<StaffUserItem[]>([]);
  const [permissionsData, setPermissionsData] = useState<PermissionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rolesRes, usersRes, permsRes] = await Promise.all([
        rolesApi.getRoles(),
        rolesApi.getUsers(),
        rolesApi.getPermissions(),
      ]);
      setRoles(rolesRes);
      setUsers(usersRes);
      setPermissionsData(permsRes);
    } catch {
      toast.error('Failed to load team and role data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="size-6 text-primary" />
            <span>Team & Access Control Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Enterprise RBAC: manage employee accounts, define custom roles, and configure granular permissions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
          className="h-9 px-3 gap-1.5 self-start sm:self-auto text-xs"
          title="Refresh team data"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'team' | 'roles')}
        className="space-y-4"
      >
        <TabsList className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 h-auto border border-border/40">
          <TabsTrigger
            value="team"
            className="gap-1.5 font-medium text-xs sm:text-sm px-3 py-1.5"
          >
            <Users className="size-3.5 text-primary shrink-0" />
            <span>Staff Members ({users.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="gap-1.5 font-medium text-xs sm:text-sm px-3 py-1.5"
          >
            <Shield className="size-3.5 text-indigo-500 shrink-0" />
            <span>Roles & Permissions ({roles.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Team Members */}
        <TabsContent value="team" className="mt-0">
          <TeamMembersList
            users={users}
            roles={roles}
            isLoading={isLoading}
            onRefresh={fetchData}
          />
        </TabsContent>

        {/* Tab 2: Roles Matrix */}
        <TabsContent value="roles" className="mt-0">
          <RolesList
            roles={roles}
            permissionsData={permissionsData}
            isLoading={isLoading}
            onRefresh={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
