import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { marketingConfig } from './config';
import { legalDocuments, legalDraftUpdated } from './legal-content';
import { PublicPage } from './public-page';

export function LegalPage({ kind }: { kind: keyof typeof legalDocuments }) {
  const document = legalDocuments[kind];
  const related = kind === 'privacy' ? 'terms' : 'privacy';

  return (
    <PublicPage narrow eyebrow="Legal" title={document.title} description={document.description}>
      <div className="mb-8 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="rounded-full border bg-muted/30 px-3 py-1 font-medium text-foreground">
          Provisional document
        </span>
        <span>
          Draft updated <time dateTime={legalDraftUpdated.date}>{legalDraftUpdated.label}</time>
        </span>
      </div>
      <p className="mb-10 border-l-2 border-primary/30 pl-4 text-sm leading-7 text-muted-foreground">
        This is a provisional document. It will be revised as Dispenco’s operational and legal
        arrangements are finalized.
      </p>
      <nav aria-label="On this page" className="mb-10 border-y py-5">
        <p className="mb-3 text-overline text-muted-foreground">On this page</p>
        <ol className="grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2">
          {document.sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="marketing-text-link rounded-md py-1 text-muted-foreground hover:text-foreground"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <article className="space-y-9">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-28">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">{section.title}</h2>
            <div className="space-y-3">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </article>
      <div className="mt-12 border-t pt-6">
        <h2 className="text-sm font-semibold">Questions about this document?</h2>
        <a
          href={`mailto:${marketingConfig.email}`}
          className="marketing-text-link mt-3 inline-flex max-w-full items-center gap-2 rounded-md py-1 text-sm"
        >
          <span className="min-w-0 break-all">{marketingConfig.email}</span>
          <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
        </a>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground">
          <Link
            className="marketing-text-link rounded-md py-1 hover:text-foreground"
            href={marketingConfig.contactHref}
          >
            Contact us
          </Link>
          <Link
            className="marketing-text-link rounded-md py-1 hover:text-foreground"
            href={related === 'privacy' ? marketingConfig.privacyHref : marketingConfig.termsHref}
          >
            {legalDocuments[related].title}
          </Link>
        </div>
      </div>
    </PublicPage>
  );
}
