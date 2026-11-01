import Link from 'next/link';
import { ArrowRight, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { marketingConfig } from './config';

export function Wordmark({ linked = true }: { linked?: boolean }) {
  const mark = (
    <>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Pill className="size-5" aria-hidden="true" />
      </span>
      <span className="text-xl font-semibold tracking-tight">
        dispenco<span className="text-primary dark:text-foreground">.</span>
      </span>
    </>
  );
  return linked ? (
    <Link
      href="/"
      aria-label="Dispenco home"
      className="inline-flex shrink-0 items-center gap-2.5 rounded-lg"
    >
      {mark}
    </Link>
  ) : (
    <span className="inline-flex items-center gap-2.5">{mark}</span>
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
    <div className={cn('mb-12 max-w-2xl', centered && 'mx-auto text-center')}>
      <p className="mb-4 text-overline text-primary dark:text-foreground">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{title}</h2>
      {description && (
        <p className="mt-5 text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

export function CtaButtons({ centered = false }: { centered?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row', centered && 'justify-center')}>
      <Button asChild size="lg" className="h-12 shadow-none">
        <Link href={marketingConfig.trialHref} prefetch={false}>
          Start free trial <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="h-12 bg-background">
        <a href={marketingConfig.demoHref}>Book a demo</a>
      </Button>
    </div>
  );
}
