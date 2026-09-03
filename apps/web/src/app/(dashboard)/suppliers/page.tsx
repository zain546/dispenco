import { Metadata } from 'next';
import { SuppliersManager } from '@/features/suppliers/components/suppliers-manager';

export const metadata: Metadata = {
  title: 'Suppliers Directory | Dispenco Pharmacy Management',
  description: 'Manage pharmaceutical vendors, distributor contact info, and lead delivery times.',
};

export default function SuppliersPage() {
  return <SuppliersManager />;
}
