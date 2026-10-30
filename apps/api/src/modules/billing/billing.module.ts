import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { SubscriptionService } from './subscription.service';
import { PrismaModule } from '../prisma/prisma.module';

import { SubscriptionGuard } from './guards/subscription.guard';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [SubscriptionService, SubscriptionGuard],
  exports: [SubscriptionService, SubscriptionGuard],
})
export class BillingModule {}
