/** In-memory identity for non-React client services, set only after API verification. */
type SessionIdentity = { id: string; tenantId: string };
let identity: SessionIdentity | null = null;

export function setSessionIdentity(next: SessionIdentity | null) {
  identity = next ? { id: next.id, tenantId: next.tenantId } : null;
}

export function getSessionIdentity(): SessionIdentity | null {
  return identity;
}
