import { ArrowUpRight } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { marketingConfig } from './config';
import { SectionHeading } from './shared';

const questions = [
  {
    question: 'How is my pharmacy’s data protected?',
    answer:
      'Dispenco uses staff roles and permissions to control access to your store’s records. Before you move sensitive data, ask us about hosting, backups, data retention, and the security measures in your deployment.',
  },
  {
    question: 'Can I switch from paper or my existing software?',
    answer:
      'Yes. You can start with your best-selling products and add the rest over time. If your existing software can export a CSV, use it as a starting point for your catalog import. Review opening stock and balances before your first sale.',
  },
  {
    question: 'Can I import my Excel catalog?',
    answer:
      'Yes. Save your Excel sheet as a CSV file and use the catalog import. Check the import template and validate product details, batches, and expiry dates before you start billing.',
  },
  {
    question: 'What happens if the internet goes down?',
    answer:
      'The POS can queue sales locally after your catalog has been synced on that device. Keep that browser and its local data available until you reconnect. Queued sales need to sync, and any stock conflicts need your review. Initial setup and other cloud features require an internet connection.',
  },
  {
    question: 'Will my barcode scanner and receipt printer work?',
    answer:
      'The POS supports barcode scanning and printable receipts. Scanners that enter barcodes like a keyboard are a practical starting point. Printer compatibility depends on your device, browser, paper size, and print settings; test your hardware during your trial.',
  },
  {
    question: 'Can I manage more than one store?',
    answer:
      'Yes. Dispenco includes a chain view, store-level records, and stock transfers between outlets. Contact us to discuss the right setup for your stores.',
  },
  {
    question: 'How do I get help getting started?',
    answer:
      'Book a demo or contact our team to discuss your catalog, counter setup, and staff onboarding. Support channels, availability, and any onboarding fees will be confirmed with your plan.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer:
      'Contact our team before your next renewal to discuss cancellation and exporting the records you need. Confirm the applicable notice period, refunds, and data-retention terms before subscribing; commercial policies are still to be finalized.',
  },
] as const;

export function Faq() {
  return (
    <section
      id="faq"
      aria-label="Frequently asked questions"
      className="marketing-section px-5 py-24 sm:px-8 md:py-32"
    >
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-5 lg:gap-20">
        <div className="self-start lg:sticky lg:top-28 lg:col-span-2">
          <SectionHeading
            eyebrow="A few things you might be wondering"
            title="Good questions. Clear answers."
            description="Switching software is a big step. Here’s what to know before you start."
          />
          <a
            href={marketingConfig.demoHref}
            className="marketing-text-link inline-flex items-center gap-2 rounded-md text-sm font-medium"
          >
            Talk it through with us
            <ArrowUpRight className="marketing-arrow size-4" aria-hidden="true" />
          </a>
        </div>
        <Accordion
          type="single"
          collapsible
          className="marketing-faq rounded-2xl bg-card lg:col-span-3"
        >
          {questions.map((item, index) => (
            <AccordionItem key={item.question} value={`question-${index}`} className="px-4 sm:px-6">
              <AccordionTrigger className="min-h-20 items-center px-1 py-6 text-sm leading-6 font-medium hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="h-auto px-1 pb-6 text-sm leading-7 text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
