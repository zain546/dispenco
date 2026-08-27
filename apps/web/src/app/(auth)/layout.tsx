import React from 'react';
import { Card } from '@/components/ui/card';
import { Pill } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md p-6 bg-card border-border shadow-lg">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md mb-2">
            <Pill className="size-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">
            Dispenco
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pharmacy Management Platform
          </p>
        </div>
        {children}
      </Card>
    </div>
  );
}
