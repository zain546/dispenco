import React from 'react';
import { ProductList } from '@/features/inventory';

export const metadata = {
  title: 'Inventory & Stock Catalog - Dispenco',
  description: 'Manage pharmacy products, batches, stock levels, and FEFO expiry tracking',
};

export default function InventoryPage() {
  return <ProductList />;
}
