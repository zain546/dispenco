import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export const metadata = {
  title: 'Store & Account Settings - Dispenco',
  description: 'Configure tenant settings, stores, roles, permissions, and tax defaults',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-border">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Store & Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Configure tenant settings, stores, roles, permissions, and tax defaults.
        </p>
      </div>

      <Card className="border-dashed bg-card/60">
        <CardContent className="p-6 sm:p-10 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Settings className="size-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="text-base font-semibold text-foreground">Workspace Preferences</p>
            <p className="text-xs text-muted-foreground">
              Ready for pharmacy profile updates, user role management, and invoice printing preferences.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
