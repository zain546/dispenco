export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'STAFF' | 'ADMIN';
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export * from './product-attributes';
