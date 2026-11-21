import Image from 'next/image';
import { LockKeyhole } from 'lucide-react';

export function DashboardPreview() {
  return (
    <figure
      aria-label="Real Dispenco pharmacy dashboard showing live sales, stock alerts, near-expiry batches, and quick POS actions"
      className="relative mx-auto mt-14 w-full md:mt-20"
    >
      {/* Ambient horizon & glow behind the showcase frame */}
      <div aria-hidden="true" className="hero-horizon pointer-events-none absolute" />
      <div aria-hidden="true" className="hero-floor pointer-events-none absolute" />

      <div className="hero-browser relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d10]">
        {/* Crisp top specular edge */}
        <div aria-hidden="true" className="hero-browser-highlight pointer-events-none absolute" />

        {/* Minimal studio browser chrome */}
        <div className="flex h-10 items-center justify-between gap-3 border-b border-white/10 bg-[#111418] px-4 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </div>
          <span className="flex items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-zinc-300">
            <LockKeyhole className="size-3 text-teal-400" aria-hidden="true" />
            dispenco.com/dashboard
          </span>
          <span className="hidden items-center gap-1.5 text-[11px] text-emerald-400 sm:inline-flex">
            <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            Live workspace
          </span>
        </div>

        {/* Real Dispenco store dashboard screenshot */}
        <div className="relative bg-[#0b0d10]">
          <Image
            src="/images/dashboard_preview.webp"
            alt="Dispenco Pharmacy Overview dashboard with today's sales, low stock alerts, near-expiry tracking, recent receipts, and quick POS billing"
            width={1907}
            height={1078}
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1152px"
            className="block h-auto w-full select-none"
          />
          {/* Subtle bottom fade into bezel for polished depth */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b0d10]/70 to-transparent"
          />
        </div>
      </div>

      <figcaption className="mt-5 text-center text-xs text-muted-foreground">
        Actual Dispenco Pharmacy Overview — real-time stock alerts, near-expiry watch, and one-click
        POS billing.
      </figcaption>
    </figure>
  );
}
