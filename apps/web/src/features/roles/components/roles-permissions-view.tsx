'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Users, Shield, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { getErrorMessage } from '@/lib/errors';
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
    } catch (err) {
      toast.error('Failed to load team and role data', {
        description: getErrorMessage(err),
      });
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
      <PageHeader
        title="Team & Access Control"
        description="Configure staff member accounts, assign roles, and define granular operational permissions."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="h-8 px-3 gap-1.5 text-xs shadow-2xs font-medium"
            title="Refresh team data"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'team' | 'roles')}
        className="space-y-5"
      >
        <div className="flex items-center justify-between gap-3">
          <TabsList className="h-9 p-1 bg-muted/70 rounded-lg border border-border/60 inline-flex items-center gap-1 w-auto">
            <TabsTrigger
              value="team"
              className="gap-2 px-3.5 py-1 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-md transition-all cursor-pointer"
            >
              <Users className="size-3.5 text-primary shrink-0" />
              <span>Staff Members</span>
              <span className="text-micro font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {users.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="gap-2 px-3.5 py-1 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-md transition-all cursor-pointer"
            >
              <Shield className="size-3.5 text-primary shrink-0" />
              <span>Roles & Permissions</span>
              <span className="text-micro font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {roles.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Staff Members */}
        <TabsContent value="team" className="mt-0 focus-visible:outline-hidden">
          <TeamMembersList
            users={users}
            roles={roles}
            isLoading={isLoading}
            onRefresh={fetchData}
          />
        </TabsContent>

        {/* Tab 2: Roles Matrix */}
        <TabsContent value="roles" className="mt-0 focus-visible:outline-hidden">
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
