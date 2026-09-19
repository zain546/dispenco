import { apiClient } from '@/lib/api';
import { PermissionCategory } from '@dispenco/types';

export interface RoleItem {
  id: string;
  name: string;
  isDefault: boolean;
  userCount: number;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffUserItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  role: string;
  roleId: string | null;
  isOwner: boolean;
  createdAt: string;
}

export interface PermissionsResponse {
  categories: PermissionCategory[];
  allPermissions: string[];
}

export const rolesApi = {
  /**
   * Get all system permission categories and codes
   */
  async getPermissions(): Promise<PermissionsResponse> {
    const res = await apiClient.get<PermissionsResponse>('/roles/permissions');
    return res.data;
  },

  /**
   * List all roles for the authenticated tenant
   */
  async getRoles(): Promise<RoleItem[]> {
    const res = await apiClient.get<RoleItem[]>('/roles');
    return res.data;
  },

  /**
   * Get single role details with permissions
   */
  async getRole(id: string): Promise<RoleItem> {
    const res = await apiClient.get<RoleItem>(`/roles/${id}`);
    return res.data;
  },

  /**
   * Create custom role
   */
  async createRole(data: {
    name: string;
    description?: string;
    permissionNames: string[];
  }): Promise<RoleItem> {
    const res = await apiClient.post<RoleItem>('/roles', data);
    return res.data;
  },

  /**
   * Update custom role name and permissions
   */
  async updateRole(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissionNames?: string[];
    }
  ): Promise<RoleItem> {
    const res = await apiClient.patch<RoleItem>(`/roles/${id}`, data);
    return res.data;
  },

  /**
   * Delete custom role
   */
  async deleteRole(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/roles/${id}`);
    return res.data;
  },

  /**
   * List all staff members for tenant
   */
  async getUsers(): Promise<StaffUserItem[]> {
    const res = await apiClient.get<StaffUserItem[]>('/users');
    return res.data;
  },

  /**
   * Invite / Add a new staff user
   */
  async createUser(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    roleId: string;
  }): Promise<StaffUserItem> {
    const res = await apiClient.post<StaffUserItem>('/users', data);
    return res.data;
  },

  /**
   * Update staff member details, role, or active status
   */
  async updateUser(
    id: string,
    data: {
      name?: string;
      phone?: string;
      roleId?: string;
      isActive?: boolean;
    }
  ): Promise<StaffUserItem> {
    const res = await apiClient.patch<StaffUserItem>(`/users/${id}`, data);
    return res.data;
  },

  /**
   * Deactivate a staff member
   */
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/users/${id}`);
    return res.data;
  },
};
