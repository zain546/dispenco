import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, Info } from 'lucide-react';
import { PublicPage, publicPageMetadata } from '@/components/marketing/public-page';
import { getSupportArticle, supportArticles } from '@/components/marketing/support-content';

export const dynamicParams = false;

export function generateStaticParams() {
  return supportArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getSupportArticle(slug);
  if (!article) notFound();
  return publicPageMetadata(article.title, article.description, `/support/${article.slug}`);
}

export default async function SupportArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getSupportArticle(slug);
  if (!article) notFound();
  return (
    <PublicPage
      eyebrow={article.category}
      title={article.title}
      description={article.description}
      backHref="/support"
      backLabel="All support guides"
    >
      <div className="grid items-start gap-10 lg:grid-cols-3 lg:gap-16">
        <article className="rounded-2xl border bg-card p-6 sm:p-8 lg:col-span-2">
          <ol className="space-y-8">
            {article.steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/30 text-xs font-medium tabular-nums">
                  {index + 1}
                </span>
                <div className="pt-1">
                  <h2 className="text-base font-semibold tracking-tight">{step.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
            <Info
              className="mt-1 size-4 shrink-0 text-primary dark:text-primary-foreground"
              aria-hidden="true"
            />
            <p className="text-sm leading-6 text-muted-foreground">{article.takeaway}</p>
          </div>
        </article>
        <aside className="rounded-2xl border bg-muted/15 p-6 lg:sticky lg:top-28">
          <h2 className="text-base font-semibold">Still need help?</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Tell us which step you’re on and what happened. We’ll help you take it from there.
          </p>
          <Link
            href="/contact"
            className="marketing-text-link mt-5 inline-flex items-center gap-2 rounded-md py-1 text-sm font-medium"
          >
            Contact support
            <ArrowUpRight className="marketing-arrow size-4" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </PublicPage>
  );
}
