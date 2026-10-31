import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { SubscriptionService } from './subscription.service';
import { PrismaModule } from '../prisma/prisma.module';

import { ConfigModule } from '@nestjs/config';
import { SafepayService } from './safepay.service';
import { SubscriptionGuard } from './guards/subscription.guard';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [BillingController],
  providers: [SubscriptionService, SafepayService, SubscriptionGuard],
  exports: [SubscriptionService, SafepayService, SubscriptionGuard],
})
export class BillingModule {}
