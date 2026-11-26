interface LegalSection {
  id: string;
  title: string;
  paragraphs: readonly string[];
}

interface LegalDocument {
  title: string;
  description: string;
  sections: readonly LegalSection[];
}

export const legalDraftUpdated = { date: '2026-11-26', label: '26 November 2026' } as const;

export const legalDocuments = {
  privacy: {
    title: 'Privacy Policy',
    description: 'How account, pharmacy, and contact information is handled in Dispenco.',
    sections: [
      {
        id: 'information',
        title: '1. Information we process',
        paragraphs: [
          'Dispenco processes account details such as your name, email address, pharmacy/store profile, and staff role permissions. Within your isolated workspace, you may store product catalogs, batch and expiry records, sales, purchases, supplier balances, customer Khata ledgers, and prescription records.',
          'Each pharmacy workspace is strictly isolated by tenant boundaries. We never share, sell, or expose one pharmacy’s inventory, pricing, customer, or sales data to another store or third party for advertising.',
          'If you contact us by email or WhatsApp, we use your message and contact details to respond to your support request. Avoid sending unnecessary patient health details or payment credentials in support messages.',
        ],
      },
      {
        id: 'purposes',
        title: '2. How information is used',
        paragraphs: [
          'We use your information to authenticate users, enforce staff permissions, operate POS billing and inventory ledgers, send transactional service emails (such as welcome onboarding and payment receipts), diagnose errors, and provide customer support.',
        ],
      },
      {
        id: 'device-storage',
        title: '3. Cookies and offline device storage',
        paragraphs: [
          'Dispenco uses HttpOnly authentication cookies and browser storage for sign-in sessions, active store selection, and display preferences. Offline POS resilience stores a local catalog copy and pending sales queue in your browser until internet connectivity resumes.',
          'Use trusted devices at your pharmacy counter and do not clear browser site data while offline sales are still waiting to sync.',
        ],
      },
      {
        id: 'providers',
        title: '4. Infrastructure and service providers',
        paragraphs: [
          'To deliver the service reliably, Dispenco relies on vetted infrastructure providers: Vercel (web application hosting), Oracle Cloud UAE East (backend API and PostgreSQL database), Safepay (subscription payments), Resend (transactional emails), and Sentry / PostHog (error diagnostics and product analytics, with session video recording disabled for counter performance and privacy).',
          'When you message us on WhatsApp or email, those communications are also subject to the respective provider’s privacy terms.',
        ],
      },
      {
        id: 'retention',
        title: '5. Backups, security, and retention',
        paragraphs: [
          'Production databases are protected with automated encrypted backups every 6 hours (retained on a 14-day daily, 8-week weekly, and 12-month monthly schedule) alongside HTTPS/TLS encryption in transit and role-based access controls.',
          'We retain active workspace records for as long as your account remains active and for a reasonable period after closure to allow data export or comply with applicable record-keeping obligations.',
        ],
      },
      {
        id: 'requests',
        title: '6. Data export, correction, and deletion',
        paragraphs: [
          'Store owners may export inventory, audit logs, and ledger records from the application or contact us at dispenco@gmail.com or WhatsApp (+92 318 6942546) to request data correction, export, or account deletion after identity verification.',
        ],
      },
      {
        id: 'updates',
        title: '7. Policy updates',
        paragraphs: [
          'We may update this Privacy Policy as Dispenco grows or regulatory requirements change. The effective date at the top of this page reflects the latest revision.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    description: 'Terms governing use of Dispenco’s pharmacy inventory, POS, and business-management platform.',
    sections: [
      {
        id: 'service',
        title: '1. About the service',
        paragraphs: [
          'Dispenco provides cloud software for pharmacy inventory, batch/expiry tracking, point-of-sale billing, Khata ledgers, and multi-store management. Dispenco is an operational tool and does not replace licensed pharmacist judgment, DRAP licensing obligations, or statutory tax and FBR compliance checks required for your business.',
        ],
      },
      {
        id: 'accounts',
        title: '2. Accounts and authorized access',
        paragraphs: [
          'You must provide accurate registration details and use Dispenco only for a business you are authorized to operate. Keep your credentials secure, assign appropriate staff permissions, and notify us promptly if you suspect unauthorized access.',
          'You may not attempt to access another tenant’s records, probe or bypass security controls, or disrupt the platform.',
        ],
      },
      {
        id: 'records',
        title: '3. Your store data and accuracy',
        paragraphs: [
          'You retain ownership of all business, product, and customer records entered into your workspace, and you are responsible for having lawful authority to store customer or prescription data. Always verify product prices, batch quantities, expiry dates, and printed receipts before dispensing.',
          'During offline POS operation, ensure queued transactions are synced once internet access returns.',
        ],
      },
      {
        id: 'commercial-terms',
        title: '4. Trials, pricing, and Safepay billing',
        paragraphs: [
          'New Starter workspaces include a 30-day free trial with no credit card required upfront. Following the trial, the Starter plan is billed at PKR 1,500 per 30-day period via Safepay (cards, EasyPaisa, and JazzCash).',
          'If a subscription expires without renewal, your workspace enters Read-Only mode: you never lose access to view or export your existing records, while new write operations (such as creating sales or editing stock) pause until the subscription is renewed.',
        ],
      },
      {
        id: 'availability',
        title: '5. Availability and third-party services',
        paragraphs: [
          'We monitor uptime continuously and maintain automated database backups, though uninterrupted availability depends on internet connectivity, browser compatibility, and third-party providers (hosting, payments, and messaging).',
        ],
      },
      {
        id: 'closure',
        title: '6. Cancellation and account closure',
        paragraphs: [
          'You may cancel your subscription at any time before your next billing period by contacting support at dispenco@gmail.com or WhatsApp (+92 318 6942546). Export any records you need prior to requesting permanent account deletion.',
        ],
      },
      {
        id: 'contact',
        title: '7. Governing law and contact',
        paragraphs: [
          'These terms are governed by the laws of Pakistan. For legal notices, billing questions, or support inquiries, contact Dispenco at dispenco@gmail.com or +92 318 6942546.',
        ],
      },
    ],
  },
} as const satisfies Record<'privacy' | 'terms', LegalDocument>;
