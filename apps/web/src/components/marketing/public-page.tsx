import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { marketingConfig } from './config';

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  return {
    metadataBase: new URL(marketingConfig.url),
    title: `${title} | Dispenco`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | Dispenco`,
      description,
      url: path,
      siteName: 'Dispenco',
      type: 'website',
    },
    twitter: { card: 'summary', title: `${title} | Dispenco`, description },
  };
}

export function PublicPage({
  eyebrow,
  title,
  description,
  children,
  backHref = '/',
  backLabel = 'Back to home',
  narrow = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  narrow?: boolean;
}) {
  return (
    <section
      aria-labelledby="public-page-title"
      className="px-5 pt-10 pb-20 sm:px-8 md:pt-14 md:pb-28"
    >
      <div className={narrow ? 'mx-auto max-w-3xl' : 'mx-auto max-w-6xl'}>
        <Link
          href={backHref}
          className="marketing-text-link mb-12 inline-flex items-center gap-2 rounded-md py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {backLabel}
        </Link>
        <header className="mb-12 max-w-2xl">
          <p className="marketing-eyebrow mb-4 text-overline text-primary dark:text-primary-foreground">
            {eyebrow}
          </p>
          <h1
            id="public-page-title"
            className="text-4xl leading-tight font-semibold tracking-tight text-balance md:text-5xl"
          >
            {title}
          </h1>
          <p className="mt-5 text-base leading-7 text-pretty text-muted-foreground md:text-lg">
            {description}
          </p>
        </header>
        {children}
      </div>
    </section>
  );
}
