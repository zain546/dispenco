import React from 'react';
import { Pill } from 'lucide-react';

interface AuthHeaderProps {
  subtitle?: string;
}

export function AuthHeader({ subtitle = 'Sign in to manage inventory, sales & pharmacy operations' }: AuthHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
        <Pill className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
        Dispenco Portal
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {subtitle}
      </p>
    </div>
  );
}
