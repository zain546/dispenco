'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Store,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'POS Counter', href: '/pos', icon: ShoppingCart },
  { name: 'Purchases', href: '/purchases', icon: Truck },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: '240px',
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.25rem 1rem',
          flexShrink: 0,
        }}
      >
        <div>
          {/* Logo & Brand */}
          <div style={{ padding: '0 0.5rem 1.5rem 0.5rem', borderBottom: '1px solid #334155' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8' }}>
              Dispenco
            </h1>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Pharmacy Management
            </span>
          </div>

          {/* Nav Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '1.5rem' }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.625rem 0.75rem',
                    borderRadius: '6px',
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    backgroundColor: isActive ? '#0284c7' : 'transparent',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Account / Logout */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              OP
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#f8fafc' }}>
                Owner Pharmacy
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Al-Shifa Group
              </div>
            </div>
          </div>
          <Link
            href="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#f87171',
              fontSize: '0.875rem',
              textDecoration: 'none',
              padding: '0.375rem 0.5rem',
            }}
          >
            <LogOut size={16} />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        {/* Top Header Placeholder */}
        <header
          style={{
            height: '60px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.875rem' }}>
            <Store size={18} />
            <span>Store: <strong>Main Branch — Blue Area</strong></span>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Status: <span style={{ color: '#16a34a', fontWeight: 600 }}>● Connected</span>
          </div>
        </header>

        {/* Page View Body */}
        <main style={{ flex: 1, padding: '1.5rem' }}>{children}</main>
      </div>
    </div>
  );
}
