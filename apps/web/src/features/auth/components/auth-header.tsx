import { Wordmark } from '@/components/marketing/shared';

interface AuthHeaderProps {
  subtitle?: string;
}

export function AuthHeader({
  subtitle = 'Sign in to manage inventory, sales & pharmacy operations',
}: AuthHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1>
        <Wordmark />
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
