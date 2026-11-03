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
        'mb-12 max-w-2xl',
        centered && 'marketing-heading-centered mx-auto text-center',
      )}
    >
      <p className="marketing-eyebrow mb-4 text-overline text-primary dark:text-foreground">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{title}</h2>
      {description && (
        <p className="mt-5 text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

export function CtaButtons({
  centered = false,
  appearance = 'default',
}: {
  centered?: boolean;
  appearance?: 'default' | 'hero';
}) {
  const { user } = useAuth();

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row', centered && 'justify-center')}>
      <Button
        asChild
        size="lg"
        className={cn(
          'marketing-action marketing-action-primary h-12 shadow-none',
          appearance === 'hero' && 'hero-cta-primary group',
        )}
      >
        <Link href={user ? '/dashboard' : marketingConfig.trialHref} prefetch={false}>
          {user ? 'Go to dashboard' : 'Start free trial'}
          <ArrowRight
            className={cn('marketing-arrow size-4', appearance === 'hero' && 'hero-cta-arrow')}
            aria-hidden="true"
          />
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        size="lg"
        className={cn(
          'marketing-action h-12 bg-background',
          appearance === 'hero' && 'hero-cta-secondary',
        )}
      >
        <Link href={marketingConfig.contactHref}>Contact us</Link>
      </Button>
    </div>
  );
}
