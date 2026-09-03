import { Metadata } from 'next';
import { PurchasesManager } from '@/features/purchases/components/purchases-manager';

export const metadata: Metadata = {
  title: 'Purchase Orders & Stock Check-in | Dispenco Pharmacy Management',
  description: 'Manage supplier purchase orders, track incoming shipments, and convert deliveries into inventory batches.',
};

export default function PurchasesPage() {
  return <PurchasesManager />;
}
