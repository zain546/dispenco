'use client';

import type { ComponentPropsWithoutRef, PointerEvent, ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Tracks pointer movement across a group of SpotlightCard children and updates
 * each card's `--mouse-x` / `--mouse-y` CSS variables directly on the DOM node
 * (zero React re-renders). Moving near any edge illuminates the facing 1px border.
 */
export function SpotlightGrid({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'div'> & { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const cards = container.querySelectorAll<HTMLElement>('[data-spotlight-card]');
    const { clientX, clientY } = event;

    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${clientY - rect.top}px`);
      card.style.setProperty('--spotlight-opacity', '1');
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cards = container.querySelectorAll<HTMLElement>('[data-spotlight-card]');
    for (const card of cards) {
      card.style.setProperty('--spotlight-opacity', '0');
    }
  }, []);

  return (
    <div
      ref={containerRef}
      data-spotlight-grid=""
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * A card with a directional 1px border & subtle surface spotlight that follows
 * the user's cursor. Works standalone or inside a SpotlightGrid for seamless
 * cross-card edge illumination.
 */
export function SpotlightCard({
  children,
  className,
  standalone = false,
  ...props
}: ComponentPropsWithoutRef<'div'> & {
  children: ReactNode;
  standalone?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!standalone) return;
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
      card.style.setProperty('--spotlight-opacity', '1');
    },
    [standalone],
  );

  const handlePointerLeave = useCallback(() => {
    if (!standalone) return;
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--spotlight-opacity', '0');
  }, [standalone]);

  return (
    <div
      ref={cardRef}
      data-spotlight-card=""
      onPointerMove={standalone ? handlePointerMove : undefined}
      onPointerLeave={standalone ? handlePointerLeave : undefined}
      className={cn(
        'spotlight-card relative rounded-2xl border border-border bg-card',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
