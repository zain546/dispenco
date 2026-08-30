import React from 'react';
import { ProductForm } from '@/features/inventory/components/product-form';

export const metadata = {
  title: 'Add New Product - Dispenco',
  description: 'Register a new medicine or retail product in your store catalog',
};

export default function NewProductPage() {
  return <ProductForm />;
}
