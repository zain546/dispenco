import Link from 'next/link';

export default function SignupPage() {
  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textAlign: 'center' }}>
        Create your pharmacy account
      </h1>
      <p
        style={{
          color: '#6b7280',
          fontSize: '0.875rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
        }}
      >
        Get started with Dispenco management in seconds.
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
            Store Name
          </label>
          <input
            type="text"
            placeholder="Al-Shifa Pharmacy"
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
            Email
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
          Create Account & Go to Dashboard
        </Link>
        <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
