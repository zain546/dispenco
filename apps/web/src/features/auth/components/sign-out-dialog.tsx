'use client';

import { Loader2, LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SignOutDialogProps {
  open: boolean;
  isPending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  onCloseAutoFocus: (event: Event) => void;
}

/** Presentation only: session handling is supplied by the confirmation controller. */
export function SignOutDialog({
  open,
  isPending,
  error,
  onOpenChange,
  onConfirm,
  onCloseAutoFocus,
}: SignOutDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-2xl shadow-black/10 motion-reduce:animate-none dark:shadow-black/40"
        overlayClassName="bg-background/65 supports-backdrop-filter:backdrop-blur-sm motion-reduce:animate-none"
        aria-busy={isPending}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
      >
        <div
          aria-hidden="true"
          className="h-px bg-linear-to-r from-transparent via-primary/40 to-transparent"
        />
        <AlertDialogHeader className="block p-6 text-left">
          <div className="space-y-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary dark:text-primary-foreground">
              <LogOut className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-2">
              <AlertDialogTitle className="text-lg leading-6 font-semibold tracking-tight">
                Sign out of Dispenco?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-6 text-pretty">
                You’ll need to sign in again to access your pharmacy workspace.
              </AlertDialogDescription>
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-destructive/15 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
            >
              {error}
            </p>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row flex-wrap items-center justify-end border-t border-border/70 bg-muted/20 px-6 py-4">
          <AlertDialogCancel
            size="sm"
            disabled={isPending}
            className="h-10 min-w-20 px-4 text-sm sm:min-w-24"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            size="sm"
            disabled={isPending}
            className="h-10 min-w-20 px-4 text-sm shadow-none sm:min-w-24"
            onClick={(event) => {
              // Radix must not close the dialog before the asynchronous action settles.
              event.preventDefault();
              void onConfirm();
            }}
          >
            {isPending && (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {isPending ? 'Signing out…' : 'Sign out'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
