import { cn } from '@/lib/utils';

/** The ledger stem and split capsule share a 32-unit optical grid. */
export function DispencoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary-foreground/20 bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-md shadow-primary/20',
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-x-2 top-0 h-px rounded-full bg-primary-foreground/40" />
      <svg viewBox="0 0 32 32" fill="none" className="size-full" focusable="false">
        {/* An independent, softly rounded ledger spine keeps the D legible at 16px. */}
        <rect x="6" y="6" width="4" height="20" rx="2" fill="currentColor" />
        {/* Open counter and a diagonal capsule seam give the bowl its dispensing cue. */}
        <path
          d="M12 6h3.5C22 6 26 10 26 16s-4 10-10.5 10H12v-4h3.5c4 0 6.5-2.1 6.5-6s-2.5-6-6.5-6H12V6Z"
          fill="currentColor"
          fillOpacity="0.62"
        />
        <path
          d="M12 6h3.5c4.6 0 8 2 9.6 5.4l-3.2 3.2c-.5-3-2.8-4.6-6.4-4.6H12V6Z"
          fill="currentColor"
        />
        <path d="m22 16 3.5-3.5" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
