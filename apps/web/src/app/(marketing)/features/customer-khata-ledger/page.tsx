import Link from 'next/link';
import { ArrowRight, BookOpen, UserCheck, MessageSquare, ShieldAlert, History, CheckCircle2 } from 'lucide-react';
import { PublicPage, publicPageMetadata } from '@/components/marketing/public-page';
import { marketingConfig } from '@/components/marketing/config';

export const metadata = publicPageMetadata(
  'Pharmacy Khata & Customer Udhaar Ledger Software',
  'Digital customer Khata ledger software for medical stores. Track patient credit balances, record partial repayments, and share instant WhatsApp balance statements.',
  '/features/customer-khata-ledger',
);

export default function CustomerKhataLedgerPage() {
  const highlights = [
    {
      title: 'Digital Credit (Udhaar) Management',
      description:
        'Say goodbye to handwritten paper diaries. Maintain an exact, tamper-proof record of customer credit purchases and advance balance deposits linked to their phone number.',
      icon: BookOpen,
    },
    {
      title: '1-Click WhatsApp Statements',
      description:
        'Send professional ledger statements and payment reminders directly to regular customers over WhatsApp with a single click, improving recovery speed by 40%.',
      icon: MessageSquare,
    },
    {
      title: 'Credit Limit & Risk Guards',
      description:
        'Set custom credit limits per customer. The POS warns counter staff if a customer exceeds their permitted balance limit before dispensing medicine.',
      icon: ShieldAlert,
    },
    {
      title: 'Transparent Repayment History',
      description:
        'Record partial or full repayments with automated balance deductions and print balance receipts for complete customer trust.',
      icon: History,
    },
  ];

  return (
    <PublicPage
      eyebrow="Khata & Accounting"
      title="Eliminate Lost Udhaar with Automated Pharmacy Khata Ledgers"
      description="Medical stores in Pakistan lose thousands every month to forgotten credit sales and disputed paper registers. Dispenco provides a transparent, auditable digital Khata system."
    >
      <div className="space-y-16">
        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs sm:p-8"
            >
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="size-6" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">{item.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="rounded-3xl border border-border/80 bg-muted/40 p-8 sm:p-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
            Built for Community Medical Stores & Family Accounts
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                Never Miss an Udhaar Entry
              </div>
              <p className="text-sm text-muted-foreground">
                Sales on credit automatically update the customer’s live balance at checkout without manual ledger bookkeeping.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                Faster Cash Recovery
              </div>
              <p className="text-sm text-muted-foreground">
                Share clear digital receipts and balance summaries on WhatsApp so customers always know what they owe.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                Complete Account Security
              </div>
              <p className="text-sm text-muted-foreground">
                Staff cannot delete past credit ledger history. All modifications are logged in your store audit trail.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Strip */}
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-primary px-8 py-10 text-primary-foreground sm:flex-row sm:px-12">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl font-bold sm:text-2xl">Take control of your customer credit today</h3>
            <p className="text-sm text-primary-foreground/80">
              Start your 30-day free trial. We will help you migrate your existing paper registers.
            </p>
          </div>
          <Link
            href={marketingConfig.trialHref}
            className="inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background/90"
          >
            Start Free Trial
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </PublicPage>
  );
}
