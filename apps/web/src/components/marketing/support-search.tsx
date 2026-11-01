'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supportArticles } from './support-content';

export function SupportSearch() {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const results = supportArticles.filter((article) =>
    `${article.title} ${article.description} ${article.category} ${article.steps.map((step) => `${step.title} ${step.body}`).join(' ')}`
      .toLowerCase()
      .includes(normalizedQuery),
  );

  return (
    <div>
      <div className="max-w-xl">
        <label htmlFor="support-search" className="mb-2 block text-sm font-medium">
          Find a guide
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="support-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search setup, imports, scanners, offline sales…"
            className="h-12 bg-card pl-11"
            aria-describedby="support-results"
          />
        </div>
      </div>
      <p id="support-results" role="status" className="mt-4 mb-6 text-xs text-muted-foreground">
        {results.length} {results.length === 1 ? 'guide' : 'guides'}
        {normalizedQuery ? ' found' : ' to help you get moving'}
      </p>
      {results.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((article) => (
            <Link
              key={article.slug}
              href={`/support/${article.slug}`}
              className="marketing-card group flex flex-col rounded-2xl border bg-card p-6"
            >
              <div className="mb-6 flex items-center justify-between gap-4">
                <span className="flex size-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary dark:text-primary-foreground">
                  <BookOpen className="size-4" aria-hidden="true" />
                </span>
                <ArrowUpRight
                  className="size-4 text-muted-foreground motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <p className="mb-2 text-overline text-muted-foreground">{article.category}</p>
              <h2 className="text-base font-semibold tracking-tight">{article.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{article.description}</p>
              <p className="mt-auto pt-6 text-xs font-medium">Read guide</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-muted/15 p-8 text-center">
          <h2 className="text-lg font-semibold">No matching guides yet.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a shorter search, or contact the team below.
          </p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="marketing-text-link mt-5 rounded-md py-1 text-sm font-medium"
          >
            Show all guides
          </button>
        </div>
      )}
    </div>
  );
}
