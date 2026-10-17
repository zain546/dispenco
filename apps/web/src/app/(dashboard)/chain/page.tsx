import { Metadata } from 'next';
import { ChainManagementView } from '@/features/chain/components/chain-management-view';

export const metadata: Metadata = {
  title: 'Chain Operations & Multi-Store Management | Dispenco',
  description: 'Enterprise multi-store pharmacy management, consolidated KPIs, and central price controls',
};

export default function ChainPage() {
  return <ChainManagementView />;
}
