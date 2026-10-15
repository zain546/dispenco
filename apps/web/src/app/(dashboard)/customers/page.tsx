import { Metadata } from 'next';
import { CustomerList } from '@/features/customers/components/customer-list';

export const metadata: Metadata = {
  title: 'Customers & Khata Ledgers | Dispenco',
  description: 'Manage pharmacy customers, credit accounts (Khata), and debt repayments.',
};

export default function CustomersPage() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <CustomerList />
    </div>
  );
}
