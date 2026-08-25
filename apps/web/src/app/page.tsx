import { Button } from '@dispenco/ui';
import { formatCurrency, formatDate } from '@dispenco/utils';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Dispenco Pharmacy Management</h1>
      <p>Modern inventory and POS for medical stores.</p>
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <p><strong>Sample Date:</strong> {formatDate(new Date())}</p>
        <p><strong>Sample Price:</strong> {formatCurrency(1250)}</p>
        <Button variant="primary">Dispenco POS Counter</Button>
      </div>
    </main>
  );
}
