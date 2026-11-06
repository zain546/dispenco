import type { Metadata, Viewport } from 'next';
import React from 'react';
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
  title: 'Dispenco — Modern Pharmacy Management',
  description: 'Modern inventory and business management for pharmacies and medical stores.',
  applicationName: 'Dispenco',
  appleWebApp: { title: 'Dispenco', capable: true, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#007595' },
    { media: '(prefers-color-scheme: dark)', color: '#005f78' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn('font-sans', inter.variable)}
    >
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
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
