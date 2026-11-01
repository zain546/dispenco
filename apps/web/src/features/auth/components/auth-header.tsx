import { Wordmark } from '@/components/marketing/shared';

interface AuthHeaderProps {
  subtitle?: string;
}

export function AuthHeader({
  subtitle = 'Sign in to manage inventory, sales & pharmacy operations',
}: AuthHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <Wordmark />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Dispenco Portal</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
