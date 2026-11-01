export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  tokenVersion: number;
  role?: string;
  permissions?: string[];
  tokenUse?: 'access' | 'refresh';
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  storeId?: string;
  storeName?: string;
  userId: string;
  email: string;
  tenantId: string;
  tokenVersion: number;
  role?: string;
  permissions?: string[];
}
