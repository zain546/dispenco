# Dispenco marketing page

The public homepage lives in the `(marketing)` route group. The former root
dashboard redirect was removed. Existing auth and dashboard routes and providers
are retained, and the navigation uses the existing auth context to show **Go to
dashboard** when a user session is present.

## Files

Paths below are relative to `apps/web`.

| File                                             | Purpose                                                                                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                               | Removed the root redirect so the marketing page owns `/`.                                                                                       |
| `src/app/(marketing)/layout.tsx`                 | Marketing landmarks, skip link, navbar, and footer.                                                                                             |
| `src/app/(marketing)/page.tsx`                   | Server-rendered section composition, metadata, canonical, Open Graph, Twitter, and SoftwareApplication JSON-LD.                                 |
| `src/app/(marketing)/marketing.css`              | Scoped focus styles, token-derived small-text contrast, anchor offsets, progressive scroll motion, and reduced-motion support.                  |
| `src/app/sitemap.ts`                             | Sitemap containing the public homepage.                                                                                                         |
| `src/app/layout.tsx`                             | Serves the existing Inter Latin variable font with `next/font/local` so builds do not need Google Fonts. Providers and font token are retained. |
| `src/app/fonts/inter-latin.woff2`                | The existing cached Inter variable font, unchanged.                                                                                             |
| `src/app/fonts/OFL.txt`                          | Official Inter SIL Open Font License, retained alongside the font.                                                                              |
| `src/app/robots.ts`                              | Crawler rules excluding application/auth routes while allowing public assets.                                                                   |
| `src/components/marketing/config.ts`             | Editable prices, yearly totals, plan inclusions, example quotes, canonical domain, email, and CTA destinations.                                 |
| `src/components/marketing/shared.tsx`            | Wordmark, section heading, and linked CTA buttons.                                                                                              |
| `src/components/marketing/navbar.tsx`            | Session-aware actions, scroll treatment, theme switch, and mobile/tablet sheet.                                                                 |
| `src/components/marketing/hero.tsx`              | Primary headline, product introduction, and trial/demo actions.                                                                                 |
| `src/components/marketing/dashboard-preview.tsx` | Responsive HTML dashboard with sample KPIs, sales chart, and attention list.                                                                    |
| `src/components/marketing/trust-strip.tsx`       | Four product capabilities; no invented logos or security certifications.                                                                        |
| `src/components/marketing/outcomes.tsx`          | Three pharmacy problems translated into practical outcomes.                                                                                     |
| `src/components/marketing/features.tsx`          | Six-card bento with HTML POS and expiry previews.                                                                                               |
| `src/components/marketing/how-it-works.tsx`      | Three onboarding steps.                                                                                                                         |
| `src/components/marketing/ai-section.tsx`        | Clearly labeled future concept with transparent reorder arithmetic and disabled preview actions.                                                |
| `src/components/marketing/pricing.tsx`           | Accessible monthly/yearly toggle; yearly prices are full annual totals.                                                                         |
| `src/components/marketing/testimonials.tsx`      | Three explicitly fictional placeholder perspectives.                                                                                            |
| `src/components/marketing/faq.tsx`               | Eight questions using the existing keyboard-accessible shadcn accordion.                                                                        |
| `src/components/marketing/final-cta.tsx`         | Closing trial and demo actions.                                                                                                                 |
| `src/components/marketing/footer.tsx`            | Brand, contact, link columns, and current copyright year.                                                                                       |
| `eslint.config.mjs`                              | Enables Next.js and TypeScript lint rules for marketing and SEO files; the previous config contained only ignores.                              |
| `MARKETING.md`                                   | Implementation notes, launch placeholders, and validation scope.                                                                                |

Hero lighting and interaction styles are isolated in
`src/components/marketing/hero.css`: token-based primary/cyan spotlights, a masked
grid, gradient headline, browser edge lighting, floor glow, and CTA highlights.
The decorations are absolutely positioned, and animations use opacity/transform
with reduced-motion overrides. The `hero` CTA appearance leaves other CTAs unchanged.

No dependencies were added. Server Components are the default; only navigation,
theme switching, pricing, and the existing interactive shadcn primitives hydrate.
The root Inter font, theme provider, and application providers are reused.

Inter's Latin font file was copied unchanged from the existing Next.js font cache
after the Google Fonts service blocked a production build. The official license
is bundled. This avoids a network dependency during deployment; it does not
introduce a new typeface or package.

## Replace before launch

In `src/components/marketing/config.ts`:

- **Prices:** Starter PKR 2,500/month or 25,000/year; Growth PKR 4,500/month or
  45,000/year. These and every tier's feature allocation are illustrative. Confirm
  currency, tax treatment, billing rules, inclusions, and commercial terms, then
  remove the placeholder labels in the pricing section. “Most popular” is also a
  sample designation, not a customer statistic.
- **Testimonials:** Replace all three examples with approved customer quotes and
  attribution, then update the explicit placeholder copy in `testimonials.tsx`.
- **Contact:** `/contact` displays the owner-provided email
  `zainali546official@gmail.com` and WhatsApp number `+923424912546` as direct links.
- **Demo:** The demo page and enquiry forms have been removed. All contact CTAs
  use `/contact`; legacy `/demo` URLs redirect to it and are excluded from the sitemap.
- **Canonical domain:** `https://dispenco.com` is selected. Change `url` if
  `dispenco.pk` is the intended primary domain; it feeds metadata, schema,
  sitemap, and robots.

Confirm onboarding timing and the no-card trial before publishing. The FAQ
deliberately avoids claiming an unverified security certification, uptime SLA,
universal hardware support, or refund policy. Replace provisional support and
cancellation language with confirmed policies. `/privacy` and `/terms` contain
provisional Privacy Policy and Terms of Service drafts, labeled as provisional on
the pages. Finalize the contracting entity, applicable jurisdiction, service providers,
processing locations, retention schedules, and commercial terms before treating
them as final legal documents. No particular privacy regime or compliance status is asserted.

## Public contact, legal, and support pages

- Footer destinations are `/contact`, `/support`, `/privacy`, and `/terms`.
  Homepage section links use absolute `/#...` paths so they also work from these pages.
- Contact Us is a static, minimal page with no forms or enquiry collection.
  Email uses `mailto:` and WhatsApp uses the international number in the official
  [click-to-chat format](https://faq.whatsapp.com/5913398998672934). Opening a link
  does not send a message automatically.
- `legal-content.ts` holds the two independent drafts and their update date;
  `LegalPage` shares only their document layout, contents navigation, and contact links.
  Drafting references for clarity and disclosure topics:
  [ICO privacy information guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/)
  and [CMA clear and fair contract guidance](https://www.gov.uk/guidance/writing-a-fair-contract-for-customers).
  These references are not a claim that UK law governs the service.
- `/support` searches the shared guide data used by statically generated
  `/support/[slug]` pages. Unknown guide slugs return 404. Topics cover setup, CSV
  import, counter hardware, offline sales, and requesting support.
- `PublicPage` shares the public page layout and metadata, and the sitemap includes
  all public contact, legal, and support pages.

All preview product records and amounts are illustrative. Future features remain
marked **Coming soon**. The reorder buttons are intentionally disabled and cannot
change inventory or place an order. Placeholder prices and quotes are excluded
from structured data.

## Validation

- Workspace `pnpm lint` and `pnpm typecheck` pass. On this workstation the existing
  cached package manager is selected with
  `$env:COREPACK_HOME='C:/Users/zaina/AppData/Local/node/corepack'` to avoid the
  default launcher attempting a network download.
- Browser layouts checked at 360, 768, 1280, and 1536 CSS pixels without horizontal
  page overflow. Mobile/tablet navigation closes on selection. Pricing changes
  to annual totals, and FAQ content expands correctly.
- Both themes checked. A computed-style contrast check of 252 rendered text
  elements found no AA text-contrast failures in either theme. This is a focused
  contrast check, not a full accessibility certification.
- The landing page has one h1, semantic landmarks, a skip link, visible focus,
  linked CTAs, a named mobile dialog, and reduced-motion CSS. Its browser console
  showed no warnings or errors during these checks.
- `/login`, `/signup`, and `/dashboard` return HTTP 200. The existing login and
  signup forms and dashboard shell were inspected in the browser. No accounts or
  pharmacy transactions were created. Live dashboard data could not be verified
  because the API was not running during preview.
- `/robots.txt` and `/sitemap.xml` return HTTP 200.
- `pnpm --filter @dispenco/web build --webpack` passes, including Next.js type
  validation and static prerendering of `/`. The default Turbopack build hit a
  local Windows CSS-worker process crash; Webpack is the verified production
  build option on this workstation. No package script or bundler default was
  changed.
- Lighthouse scores have not been measured; the requested 95+ scores are not
  asserted. Run Lighthouse against a production server rather than `next dev`.

To preview locally, run `pnpm --filter @dispenco/web dev`. For production on this
workstation, run `pnpm --filter @dispenco/web build --webpack`, then
`pnpm --filter @dispenco/web start`.
