import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { PublicApiController } from './public-api.controller';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { ApiKeyScopeGuard } from './guards/api-key-scope.guard';
import { ApiKeyRateLimitGuard } from './guards/api-key-rate-limit.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [IntegrationsController, PublicApiController],
  providers: [
    IntegrationsService,
    ApiKeyAuthGuard,
    ApiKeyScopeGuard,
    ApiKeyRateLimitGuard,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
