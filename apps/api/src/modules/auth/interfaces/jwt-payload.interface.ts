export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  tokenVersion: number;
  role?: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  tenantId: string;
  tokenVersion: number;
  role?: string;
}
