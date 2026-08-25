export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
        Dashboard Overview
      </h1>
      <p style={{ margin: '0.25rem 0 1.5rem 0', color: '#64748b', fontSize: '0.875rem' }}>
        Welcome back. Here is your pharmacy summary for today.
      </p>

      {/* Summary Widgets Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Today's Sales
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>
            PKR 0.00
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>0 completed sales</span>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Low Stock Alerts
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#d97706', marginTop: '0.5rem' }}>
            0
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Products below threshold</span>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Expiring Soon
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626', marginTop: '0.5rem' }}>
            0
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Batches expiring within 90 days</span>
        </div>
      </div>
    </div>
  );
}
