import { Check, ChartNoAxesCombined, PackageCheck, ScanLine } from 'lucide-react';
import { DispencoMark } from '@/components/brand/dispenco-mark';
import { CtaButtons } from './shared';
import styles from './final-cta.module.css';

const workflow = [
  {
    icon: PackageCheck,
    title: 'A delivery arrives.',
    detail: 'Batches, expiry dates, and supplier balances — connected.',
  },
  {
    icon: ScanLine,
    title: 'The counter keeps moving.',
    detail: 'Scan, bill, and hand over a clear receipt.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'You see the whole day.',
    detail: 'Sales, stock, and what needs attention. In one view.',
  },
] as const;

export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="marketing-section border-t px-5 py-20 sm:px-8 md:py-24"
    >
      <div
        className={`${styles.panel} relative isolate mx-auto grid max-w-6xl items-center gap-12 overflow-hidden rounded-3xl border bg-muted/20 p-6 sm:p-10 lg:grid-cols-2 lg:gap-16 lg:p-14`}
      >
        <div aria-hidden="true" className={`${styles.grid} pointer-events-none absolute inset-0`} />
        <div className="relative">
          <div className="mb-8 flex items-center gap-4">
            <DispencoMark className="size-14 rounded-2xl" />
            <p className="max-w-48 text-overline leading-5 text-muted-foreground">
              Your pharmacy.
              <br />A little more in hand.
            </p>
          </div>
          <h2
            id="cta-title"
            className="max-w-xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl xl:text-5xl"
          >
            Make room for a{' '}
            <span className="text-primary dark:text-primary-foreground">better working day.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-pretty text-muted-foreground">
            Bring your stock, sales, and daily decisions into one simple workspace. Start with what
            you have. Grow from there.
          </p>
          <div className={`${styles.actions} mt-8`}>
            <CtaButtons />
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {['No credit card required', 'Import your Excel catalog'].map((text) => (
              <span key={text} className="inline-flex items-center gap-1.5">
                <Check
                  className="size-3.5 shrink-0 text-primary dark:text-primary-foreground"
                  aria-hidden="true"
                />
                {text}
              </span>
            ))}
          </div>
        </div>
        <aside
          aria-label="One connected pharmacy workflow"
          className={`${styles.workflow} relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-card/90`}
        >
          <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-5 py-4">
            <span className="text-xs font-medium">One workspace. Everything connected.</span>
            <span aria-hidden="true" className="flex shrink-0 gap-1">
              <span className="size-1 rounded-full bg-foreground/20" />
              <span className="size-1 rounded-full bg-foreground/20" />
              <span className="size-1 rounded-full bg-foreground/20" />
            </span>
          </div>
          <div className="p-5 sm:p-6">
            <p className="mb-6 text-overline text-muted-foreground">
              From the first delivery to the last sale
            </p>
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-y-5 left-5 w-px bg-primary/20" />
              <ol className="space-y-7">
                {workflow.map(({ icon: Icon, title, detail }) => (
                  <li key={title} className="relative flex items-start gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-card">
                      <Icon
                        className="size-4 text-primary dark:text-primary-foreground"
                        aria-hidden="true"
                      />
                    </span>
                    <div className="pt-0.5">
                      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">{detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t bg-primary/5 px-5 py-3.5 text-xs sm:px-6">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            Less chasing records. More time for your pharmacy.
          </div>
        </aside>
      </div>
    </section>
  );
}
