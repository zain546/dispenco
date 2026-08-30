'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { ProductForm } from '@/features/inventory/components/product-form';
import { productsApi, type ProductData } from '@/features/inventory/services/products-api';
import { Button } from '@/components/ui/button';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    setIsLoading(true);
    setError(null);

    productsApi
      .getProductById(productId)
      .then((res) => {
        setProduct(res.data);
      })
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to fetch medicine product details';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [productId]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-sm font-medium">Loading medicine product specifications...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 max-w-md mx-auto space-y-4 text-center">
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center justify-center gap-2 text-sm font-medium">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error || 'Medicine product not found'}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/inventory')}>
          Return to Inventory Catalog
        </Button>
      </div>
    );
  }

  return <ProductForm initialData={product} isEditing={true} />;
}
