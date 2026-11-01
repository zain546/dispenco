import Link from 'next/link';
import { ArrowUpRight, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicPage, publicPageMetadata } from '@/components/marketing/public-page';
import { SupportSearch } from '@/components/marketing/support-search';

export const metadata = publicPageMetadata(
  'Help & support',
  'Practical Dispenco guides for pharmacy setup, catalog imports, counter hardware, and offline sales.',
  '/support',
);

export default function SupportPage() {
  return (
    <PublicPage
      eyebrow="Help & support"
      title="A little guidance goes a long way."
      description="Find a practical guide, work through the next step, or get in touch with the team."
    >
      <SupportSearch />
      <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-2xl border bg-muted/15 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex items-start gap-4">
          <LifeBuoy
            className="mt-1 size-5 shrink-0 text-primary dark:text-primary-foreground"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-base font-semibold">Need a hand with something specific?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Contact us by email or WhatsApp with a little context about the issue.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="marketing-action shrink-0">
          <Link href="/contact">
            Contact support
            <ArrowUpRight className="marketing-arrow size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <Link
        href="/#faq"
        className="marketing-text-link mt-6 inline-flex items-center gap-2 rounded-md py-1 text-sm text-muted-foreground hover:text-foreground"
      >
        More questions? Read the FAQs
        <ArrowUpRight className="marketing-arrow size-3.5" aria-hidden="true" />
      </Link>
    </PublicPage>
  );
}
