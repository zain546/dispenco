import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Store & Account Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure tenant settings, stores, roles, permissions, and tax defaults.
        </p>
      </div>

      <Card>
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Settings className="size-10 text-muted-foreground/60" />
          <p className="text-sm">
            Settings module placeholder — ready for store settings & role management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
