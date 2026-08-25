import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children, style, ...props }: ButtonProps) {
  const baseStyles: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: '#10b981', color: '#ffffff' },
    secondary: { backgroundColor: '#e5e7eb', color: '#1f2937' },
    danger: { backgroundColor: '#ef4444', color: '#ffffff' },
  };

  return (
    <button style={{ ...baseStyles, ...variantStyles[variant], ...style }} {...props}>
      {children}
    </button>
  );
}
