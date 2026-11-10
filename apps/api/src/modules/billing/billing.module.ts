import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BillingController } from './billing.controller';
import { SubscriptionService } from './subscription.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { SafepayService } from './safepay.service';
import { SubscriptionGuard } from './guards/subscription.guard';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [BillingController],
  providers: [
    SubscriptionService,
    SafepayService,
    SubscriptionGuard,
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
  ],
  exports: [SubscriptionService, SafepayService, SubscriptionGuard],
})
export class BillingModule {}
