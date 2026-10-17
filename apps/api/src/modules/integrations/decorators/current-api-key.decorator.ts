import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedApiKey {
  id: string;
  name: string;
  tenantId: string;
  permissions: string[];
  rateLimit: number;
}

export const CurrentApiKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedApiKey => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKey;
  }
);
