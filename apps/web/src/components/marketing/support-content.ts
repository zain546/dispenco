export const supportArticles = [
  {
    slug: 'getting-started',
    title: 'Set up your first pharmacy',
    description: 'Start with your store, your core products, and a test sale.',
    category: 'Getting started',
    steps: [
      {
        title: 'Create your account and store.',
        body: 'Sign up, then complete the store setup with your pharmacy name and location. Use your own account details so you can return to the same workspace.',
      },
      {
        title: 'Bring in your core products.',
        body: 'Start with your best sellers. Add products individually or import your catalog. Review selling prices, opening stock, batches, and expiry dates before you begin billing.',
      },
      {
        title: 'Check the counter setup.',
        body: 'Test your barcode scanner and print settings on the device you will use at the counter. Confirm that the correct product appears when you scan a barcode.',
      },
      {
        title: 'Review a small test sale.',
        body: 'Check the items, quantities, payment method, and receipt. Review the resulting sales and stock records before rolling the workflow out to your team.',
      },
    ],
    takeaway:
      'Keep your original stock and balance records until you have checked your opening figures in Dispenco.',
  },
  {
    slug: 'import-your-catalog',
    title: 'Import an Excel or CSV catalog',
    description: 'Use the template, map your columns, and review rows before importing.',
    category: 'Inventory',
    steps: [
      {
        title: 'Start with the import template.',
        body: 'Open the inventory import and choose “Download CSV Template”. Compare its headings with your existing catalog. If you work in Excel, save the prepared sheet as a CSV file.',
      },
      {
        title: 'Upload or paste your CSV.',
        body: 'Upload the file or paste the CSV text into the import screen. Match your column headings to the corresponding Dispenco fields.',
      },
      {
        title: 'Review validation results.',
        body: 'Check product names, prices, units, stock quantities, batch numbers, and expiry dates. Correct invalid rows and confirm which records are ready to import.',
      },
      {
        title: 'Confirm and check your inventory.',
        body: 'Confirm the import after reviewing the records. Open a few imported products and compare them with your source file before using them for live billing.',
      },
    ],
    takeaway:
      'Keep a copy of your source file. Avoid importing the same catalog twice without checking for existing products.',
  },
  {
    slug: 'scanner-and-receipt-setup',
    title: 'Check scanners and receipt printing',
    description: 'A practical setup check for your counter hardware.',
    category: 'Point of sale',
    steps: [
      {
        title: 'Check scanner input.',
        body: 'Connect your scanner to the counter device. A scanner that enters a barcode like a keyboard is a practical starting point. Scan a known product and check the result in the POS.',
      },
      {
        title: 'Check product barcodes.',
        body: 'If a product is not found, compare the scanned value with the barcode saved in its product record. Check the selected store and the product details before changing any records.',
      },
      {
        title: 'Check printer settings.',
        body: 'Select the intended receipt printer in your browser’s print dialog. Check paper size, margins, scaling, and whether headers and footers are enabled.',
      },
      {
        title: 'Test on your actual device.',
        body: 'Print a test receipt and check that medicine names, quantities, and totals are readable. Compatibility depends on your printer, operating system, and browser.',
      },
    ],
    takeaway:
      'When requesting help, include your browser, operating system, printer model, and a description of what happens.',
  },
  {
    slug: 'offline-sales',
    title: 'Understand offline sales and sync',
    description: 'What to check when your counter loses its internet connection.',
    category: 'Point of sale',
    steps: [
      {
        title: 'Prepare while connected.',
        body: 'Initial setup and catalog synchronization require an internet connection. Offline sales depend on the product information already available on that device.',
      },
      {
        title: 'Keep the same device and browser.',
        body: 'Queued sales are stored locally in that browser. Avoid clearing site data, changing devices, or removing unsynced records while you are offline.',
      },
      {
        title: 'Reconnect and review pending sales.',
        body: 'After the connection returns, open the offline sync view and review the pending transactions. Sync them while the device is connected.',
      },
      {
        title: 'Check sync results.',
        body: 'Review the result of each transaction and any stock conflicts. Confirm that sales and inventory records agree before removing local transaction logs.',
      },
    ],
    takeaway:
      'Do not delete an unsynced local record to clear an error. Contact support with the error details if you are unsure how to proceed.',
  },
  {
    slug: 'requesting-support',
    title: 'Get useful help, faster',
    description: 'Give the team enough context to understand your issue.',
    category: 'Support',
    steps: [
      {
        title: 'Identify the workflow.',
        body: 'Include the page you were using, the selected store, and the action you were trying to complete. Describe what you expected and what happened instead.',
      },
      {
        title: 'Record the exact message.',
        body: 'Copy the error text if one appears. Include when it happened and whether the same steps reproduce the issue.',
      },
      {
        title: 'Share device details.',
        body: 'Include your browser and device type. For counter hardware, add the scanner or printer model and relevant print settings.',
      },
      {
        title: 'Keep the request focused.',
        body: 'Send your message from an address where the team can reply. Leave out passwords, patient information, and payment details.',
      },
    ],
    takeaway: 'Use the Contact Us page to reach the team by email or WhatsApp.',
  },
] as const;

export function getSupportArticle(slug: string) {
  return supportArticles.find((article) => article.slug === slug);
}
