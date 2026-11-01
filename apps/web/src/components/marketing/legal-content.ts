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

export const legalDraftUpdated = { date: '2026-11-01', label: '1 November 2026' } as const;

export const legalDocuments = {
  privacy: {
    title: 'Privacy Policy',
    description: 'How account, pharmacy, and contact information is handled in Dispenco.',
    sections: [
      {
        id: 'information',
        title: '1. Information used by the service',
        paragraphs: [
          'Dispenco handles account details such as your name, email address, store information, and staff access settings. Your workspace can also contain the products, stock, sales, purchases, customer records, and prescriptions that your business chooses to enter.',
          'If you contact us, your message and the contact details you provide are used to understand and respond to your enquiry. Please avoid sending patient records, passwords, or payment credentials in support messages.',
        ],
      },
      {
        id: 'purposes',
        title: '2. Why information is used',
        paragraphs: [
          'Information is used to create and manage accounts, provide pharmacy workflows and reports, apply staff permissions, troubleshoot problems, and respond to support requests. Information needed for billing or a requested integration may also be handled as part of that service.',
        ],
      },
      {
        id: 'device-storage',
        title: '3. Cookies and device storage',
        paragraphs: [
          'The application uses cookies and browser storage for sign-in sessions, the selected store, and preferences. Offline POS features may keep a local catalog and queued transactions on the device until they can sync.',
          'Use trusted devices and protect access to your browser. Clearing site data can remove local settings and unsynced records, so review pending offline sales before doing so.',
        ],
      },
      {
        id: 'providers',
        title: '4. Service providers and contact channels',
        paragraphs: [
          'Hosting, payment, and other configured service providers may process information needed to deliver their part of the service. The exact providers and processing locations depend on the deployment and are being documented for the final policy.',
          'When you contact us through email or WhatsApp, those services also handle your communication under their own privacy policies. Opening the Contact Us page does not submit an enquiry on your behalf.',
        ],
      },
      {
        id: 'retention',
        title: '5. Retention and protection',
        paragraphs: [
          'Retention depends on the purpose of the record, account activity, support needs, and applicable record-keeping requirements. Specific retention periods, backup arrangements, and deletion procedures are still being finalized. Ask us to confirm these details before moving sensitive records into a deployment.',
          'Dispenco includes account authentication and staff access controls. No online service can guarantee absolute security; your business should also manage permissions, protect its devices, and keep appropriate copies of important records.',
        ],
      },
      {
        id: 'requests',
        title: '6. Your questions and requests',
        paragraphs: [
          'Contact us to ask about your information, request a correction or export, or discuss deletion and account closure. What can be provided depends on the request, your authority over the relevant account, and applicable requirements. We may need to verify your identity or account authority before responding.',
        ],
      },
      {
        id: 'updates',
        title: '7. Updates to this policy',
        paragraphs: [
          'This provisional policy will be updated as operational and legal details are confirmed. The draft date above identifies the version currently displayed. Contact us if you need clarification before using the service.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    description: 'Provisional terms for using Dispenco’s pharmacy and business-management tools.',
    sections: [
      {
        id: 'service',
        title: '1. About the service',
        paragraphs: [
          'Dispenco provides software for pharmacy inventory, billing, and business records. It does not replace professional dispensing judgment, licensing obligations, or the checks your business must carry out for medicines, prescriptions, and statutory records.',
        ],
      },
      {
        id: 'accounts',
        title: '2. Accounts and authorized access',
        paragraphs: [
          'Provide accurate account information and use the service only for a business you are authorized to manage. Protect your credentials, assign suitable staff permissions, and contact us if you suspect unauthorized access.',
          'Do not attempt to access another business’s records, disrupt the service, bypass access controls, or upload malicious content.',
        ],
      },
      {
        id: 'records',
        title: '3. Your business records',
        paragraphs: [
          'You are responsible for the information entered into your workspace and for having the authority to handle customer, staff, and patient information. Check prices, quantities, expiry dates, receipts, and reports before relying on them for business decisions.',
          'Keep appropriate copies of important records. Offline transactions must be reviewed and synchronized; avoid clearing local data while sales are still pending.',
        ],
      },
      {
        id: 'commercial-terms',
        title: '4. Plans, trials, and payments',
        paragraphs: [
          'The price, features, taxes, billing interval, trial conditions, renewal arrangements, cancellation terms, and any refund conditions for a paid service should be confirmed with you before you commit.',
          'Illustrative website prices and features marked “coming soon” are not guaranteed plan inclusions. Any separately agreed commercial terms should be reviewed alongside the final service terms.',
        ],
      },
      {
        id: 'availability',
        title: '5. Availability and third-party services',
        paragraphs: [
          'Access depends on your device, browser, connection, and any services used by your deployment. Maintenance, technical issues, or changes to integrations can affect availability. Offline features require prior setup and later synchronization.',
          'Support coverage, backup arrangements, and any availability commitments should be confirmed for your deployment. Third-party services, including payments and messaging, may have their own terms.',
        ],
      },
      {
        id: 'closure',
        title: '6. Cancellation and account closure',
        paragraphs: [
          'Contact us to discuss cancellation, account closure, or exporting records. Review any agreed billing commitments and arrange the records you need before closing your account. Retention or deletion may be affected by applicable record-keeping requirements.',
        ],
      },
      {
        id: 'provisional-status',
        title: '7. Provisional status and questions',
        paragraphs: [
          'This draft summarizes intended service rules. It does not replace a separately agreed contract or any mandatory legal rights. Details such as the contracting entity, governing law, and liability provisions remain to be confirmed in the final terms.',
          'Contact us about anything that is unclear before subscribing or relying on a particular service commitment.',
        ],
      },
    ],
  },
} as const satisfies Record<'privacy' | 'terms', LegalDocument>;
