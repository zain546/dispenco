/** Shared navigation policy. API authorization remains authoritative for data. */
export const PROTECTED_ROOTS = [
  'dashboard',
  'pos',
  'inventory',
  'transfers',
  'purchases',
  'suppliers',
  'reports',
  'chain',
  'settings',
  'prescriptions',
  'customers',
  'returns',
  'onboarding',
];

function routeRoot(path: string): string {
  try {
    return decodeURIComponent(path.split('/')[1]);
  } catch {
    return '';
  }
}

export function isProtectedPath(path: string): boolean {
  return PROTECTED_ROOTS.includes(routeRoot(path));
}

export function sessionAuthorityKey(
  user: { id: string; tenantId: string; role?: string; permissions?: string[] } | null,
): string | null {
  return user
    ? JSON.stringify([user.tenantId, user.id, user.role, [...(user.permissions || [])].sort()])
    : null;
}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value))
    return '/dashboard';
  try {
    const url = new URL(value, 'https://dispenco.invalid');
    if (url.origin !== 'https://dispenco.invalid' || !isProtectedPath(url.pathname))
      return '/dashboard';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard';
  }
}

export function canAccessPage(
  path: string,
  user: { role?: string; permissions?: string[] },
): boolean {
  if (user.role?.toLowerCase() === 'owner') return true;
  const permissions = user.permissions || [];
  const required: Record<string, string[]> = {
    pos: ['sales:create', 'sales:read'],
    inventory: ['inventory:read'],
    transfers: ['inventory:read'],
    purchases: ['purchases:read'],
    suppliers: ['suppliers:manage', 'settings:manage'],
    reports: ['reports:read'],
    chain: ['settings:manage'],
    settings: ['settings:manage', 'billing:manage'],
    prescriptions: ['sales:read'],
    customers: ['customers:read'],
    returns: ['sales:read'],
  };
  const rules = required[routeRoot(path)];
  return !rules || rules.some((permission) => permissions.includes(permission));
}
