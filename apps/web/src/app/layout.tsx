import type { Metadata } from 'next';
import React from 'react';
import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/context/auth-context';
import './globals.css';
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Dispenco — Modern Pharmacy Management',
  description:
    'Modern inventory and business management for pharmacies and medical stores.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster closeButton position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
