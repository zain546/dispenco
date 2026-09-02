import React from 'react';
import { ReceiptView } from '@/features/sales/components/receipt-view';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function POSReceiptPage({ params }: PageProps) {
  const { id } = await params;
  return <ReceiptView saleId={id} />;
}
