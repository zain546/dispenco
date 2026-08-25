import Link from 'next/link';

export default function LoginPage() {
  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textAlign: 'center' }}>
        Sign in to your account
      </h1>
      <p
        style={{
          color: '#6b7280',
          fontSize: '0.875rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
        }}
      >
        Enter your credentials to access your pharmacy workspace.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.25rem',
            }}
          >
            Email address
          </label>
          <input
            type="email"
            placeholder="owner@pharmacy.com"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.25rem',
            }}
          >
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <Link
          href="/dashboard"
          style={{
            marginTop: '0.5rem',
            display: 'block',
            textAlign: 'center',
            padding: '0.625rem',
            backgroundColor: '#0284c7',
            color: '#fff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Sign In
        </Link>
        <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
