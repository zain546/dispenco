import { SetMetadata } from '@nestjs/common';
import { PublicApiScope } from '@dispenco/types';

export const PUBLIC_SCOPE_KEY = 'public_api_scope';

export const RequirePublicScope = (scope: PublicApiScope) =>
  SetMetadata(PUBLIC_SCOPE_KEY, scope);
