'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { canAccessPage, sessionAuthorityKey } from '@/lib/auth-policy';
import { Button } from '@/components/ui/button';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, verifiedPath, sessionError, refreshSession } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !sessionError && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
    }
  }, [isLoading, sessionError, user, pathname, router]);
  if (sessionError)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert">We couldn’t verify your session. Please try again.</p>
        <Button onClick={() => void refreshSession()}>Try again</Button>
      </div>
    );
  if (isLoading || verifiedPath !== pathname || !user)
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
      >
        Verifying your session…
      </div>
    );
  if (!canAccessPage(pathname, user))
    return (
      <div className="p-8" role="alert">
        You don’t have permission to access this page.
      </div>
    );
  return <Fragment key={sessionAuthorityKey(user)}>{children}</Fragment>;
}
