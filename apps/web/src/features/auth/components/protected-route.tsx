'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { canAccessPage, sessionAuthorityKey } from '@/lib/auth-policy';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, sessionError, refreshSession } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !sessionError && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
    }
  }, [isLoading, sessionError, user, pathname, router]);

  if (sessionError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center bg-background">
        <p className="text-sm text-muted-foreground" role="alert">
          We couldn’t verify your session. Please try again.
        </p>
        <Button onClick={() => void refreshSession()}>Try again</Button>
      </div>
    );
  }

  // Initial cold load: only shown when user is not yet loaded in memory
  if (isLoading || !user) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-col items-center justify-center bg-background gap-3"
      >
        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Loader2 className="size-4 text-primary animate-spin" />
        </div>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading Dispenco...
        </p>
      </div>
    );
  }

  if (!canAccessPage(pathname, user)) {
    return (
      <div className="p-8 text-sm text-muted-foreground" role="alert">
        You don’t have permission to access this page.
      </div>
    );
  }

  return <Fragment key={sessionAuthorityKey(user)}>{children}</Fragment>;
}
