import React from 'react';
import { InventoryDashboard } from '@/features/inventory';

export const metadata = {
  title: 'Inventory & Exception Hub - Dispenco',
  description: 'Manage pharmacy products, low stock alerts, FEFO expiry tracking, and stock receiving',
};

export default function InventoryPage() {
  return <InventoryDashboard />;
}

