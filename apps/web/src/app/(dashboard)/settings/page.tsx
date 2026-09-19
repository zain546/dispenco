import React from 'react';
import { RolesPermissionsView } from '@/features/roles/components/roles-permissions-view';

export const metadata = {
  title: 'Roles & Staff Settings - Dispenco',
  description: 'Manage pharmacy team members, custom roles, and fine-grained access permissions',
};

export default function SettingsPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-12">
      <RolesPermissionsView />
    </div>
  );
}
