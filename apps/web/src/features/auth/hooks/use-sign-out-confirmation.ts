'use client';

import { useRef, useState, type MouseEvent } from 'react';

/** Coordinates confirmation and focus; the caller owns session cleanup and navigation. */
export function useSignOutConfirmation(signOut: () => Promise<void>) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const pendingRef = useRef(false);

  const requestSignOut = (event: MouseEvent<HTMLButtonElement>) => {
    if (pendingRef.current) return;
    triggerRef.current = event.currentTarget;
    setError(null);
    setOpen(true);
  };

  const onOpenChange = (nextOpen: boolean) => {
    if (pendingRef.current) return;
    setOpen(nextOpen);
    if (!nextOpen) setError(null);
  };

  const onConfirm = async () => {
    // A synchronous lock also protects against clicks before React updates the buttons.
    if (!open || pendingRef.current) return;
    pendingRef.current = true;
    setIsPending(true);
    setError(null);

    try {
      await signOut();
      setOpen(false);
    } catch {
      setError('We couldn’t sign you out. Please try again.');
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  };

  const onCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    triggerRef.current?.focus();
  };

  return {
    requestSignOut,
    dialogProps: { open, isPending, error, onOpenChange, onConfirm, onCloseAutoFocus },
  };
}
