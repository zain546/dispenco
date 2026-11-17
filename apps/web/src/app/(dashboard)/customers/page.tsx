import { Metadata } from 'next';
import { CustomerList } from '@/features/customers/components/customer-list';

export const metadata: Metadata = {
  title: 'Customers & Khata Ledgers | Dispenco',
  description: 'Manage pharmacy customers, credit accounts (Khata), and debt repayments.',
};

export default function CustomersPage() {
  return <CustomerList />;
}
