import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#0284c7', fontSize: '1.5rem', fontWeight: 700 }}>
            Dispenco
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Pharmacy Management Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
