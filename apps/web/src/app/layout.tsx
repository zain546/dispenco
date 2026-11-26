import type { Metadata, Viewport } from 'next';
import React from 'react';
import Script from 'next/script';
import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/context/auth-context';
import { StoreProvider } from '@/context/store-context';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import localFont from 'next/font/local';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';

// The same Inter Latin variable font, served locally so builds work offline.
const inter = localFont({
  src: './fonts/inter-latin.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-sans',
  adjustFontFallback: 'Arial',
});

// Icons, favicon and share images come from the file conventions in this folder
// (favicon.ico, icon.svg, icon1.png, apple-icon.png, opengraph-image.png, manifest.ts).
export const metadata: Metadata = {
  metadataBase: new URL('https://dispenco.com'),
  title: {
    default: 'Dispenco — Pharmacy Inventory & POS Billing Software',
    template: '%s | Dispenco',
  },
  description:
    'All-in-one pharmacy management software in Pakistan. FEFO batch expiry tracking, high-speed barcode POS, Khata ledger accounting, purchases, and multi-branch control.',
  applicationName: 'Dispenco',
  keywords: [
    'pharmacy software Pakistan',
    'medical store software',
    'pharmacy management system',
    'pharmacy POS billing software',
    'medicine inventory software',
    'expiry date tracking pharmacy',
    'medical store billing software',
    'pharmacy Khata ledger',
    'Dispenco pharmacy',
  ],
  authors: [{ name: 'Dispenco Team', url: 'https://dispenco.com' }],
  creator: 'Dispenco',
  publisher: 'Dispenco',
  alternates: {
    canonical: 'https://dispenco.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: 'https://dispenco.com',
    siteName: 'Dispenco',
    title: 'Dispenco — Pharmacy Inventory & POS Billing Software',
    description:
      'All-in-one pharmacy management software in Pakistan. FEFO batch expiry tracking, high-speed barcode POS, Khata ledger, and multi-store control.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dispenco — Pharmacy Inventory & POS Billing Software',
    description:
      'All-in-one pharmacy management software in Pakistan. FEFO batch expiry tracking, barcode POS, Khata ledger, and multi-store management.',
  },
  appleWebApp: { title: 'Dispenco', capable: true, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#007595' },
    { media: '(prefers-color-scheme: dark)', color: '#005f78' },
  ],
};

const gtmId = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-PCWNHTKB';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn('font-sans', inter.variable)}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-background font-sans antialiased text-foreground"
      >
        <Script
          id="google-tag-manager"
          src={`https://www.googletagmanager.com/gtm.js?id=${gtmId}`}
          strategy="lazyOnload"
        />
        <Script id="google-tag-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
          `}
        </Script>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <StoreProvider>
                {children}
                <Toaster closeButton position="top-right" richColors />
              </StoreProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
