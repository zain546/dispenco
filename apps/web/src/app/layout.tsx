import type { Metadata } from 'next';
import React from 'react';
import { QueryProvider } from '@/lib/query-provider';

export const metadata: Metadata = {
  title: 'Dispenco — Modern Pharmacy Management',
  description: 'Modern inventory and business management for pharmacies and medical stores.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f9fafb', color: '#111827' }}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
