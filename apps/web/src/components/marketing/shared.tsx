'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { DispencoMark } from '@/components/brand/dispenco-mark';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { marketingConfig } from './config';

export function Wordmark({ linked = true, className }: { linked?: boolean; className?: string }) {
  const mark = (
    <>
      <DispencoMark />
      <span className="text-lg font-bold tracking-tight text-foreground sm:text-xl">dispenco</span>
    </>
  );
  return linked ? (
    <Link
      href="/"
      aria-label="Dispenco home"
      className={cn(
        'marketing-wordmark inline-flex shrink-0 items-center gap-2.5 rounded-xl',
        className,
      )}
    >
      {mark}
    </Link>
  ) : (
    <span className={cn('inline-flex shrink-0 items-center gap-2.5', className)}>{mark}</span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div
      className={cn(
        'mb-12 max-w-2xl md:mb-14',
        centered && 'marketing-heading-centered mx-auto text-center',
      )}
    >
      <p className="marketing-eyebrow mb-3 text-xs font-medium tracking-wide uppercase">
        <span aria-hidden="true" className="h-px w-4 bg-current opacity-60" />
        {eyebrow}
      </p>
      <h2 className="text-[clamp(1.875rem,1.4rem+1.8vw,2.75rem)] leading-[1.15] font-semibold tracking-[-0.025em] text-balance">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

export function CtaButtons({
  centered = false,
  className,
}: {
  centered?: boolean;
  className?: string;
}) {
  const { user } = useAuth();

  return (
    <div
      className={cn('flex flex-col gap-3 sm:flex-row', centered && 'sm:justify-center', className)}
    >
      <Button
        asChild
        size="lg"
        className="marketing-action marketing-action-primary h-12 w-full rounded-xl px-6 shadow-none sm:w-auto"
      >
        <Link href={user ? '/dashboard' : marketingConfig.trialHref} prefetch={false}>
          {user ? 'Go to dashboard' : 'Start free trial'}
          <ArrowRight className="marketing-arrow size-4" aria-hidden="true" />
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        size="lg"
        className="marketing-action h-12 w-full rounded-xl bg-card/60 px-6 shadow-none backdrop-blur-sm hover:border-foreground/25 hover:bg-card sm:w-auto"
      >
        <Link href={marketingConfig.contactHref}>Book a walkthrough</Link>
      </Button>
    </div>
  );
}
