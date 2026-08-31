export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function extractIdFromSlugParam(param: string): string {
  if (!param) return param;
  if (param.includes('--')) {
    const parts = param.split('--');
    return parts[parts.length - 1];
  }
  return param;
}

export function getProductSeoUrl(
  product: { id: string; name?: string },
  action?: 'edit' | 'batches',
): string {
  if (!product?.id) return '/inventory';
  const slug = slugify(product.name || 'product');
  const seoParam = slug ? `${slug}--${product.id}` : product.id;
  return action ? `/inventory/${seoParam}/${action}` : `/inventory/${seoParam}`;
}
