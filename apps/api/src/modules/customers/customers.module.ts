import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { RedisCacheModule } from '../cache/redis-cache.module';

// Module for Customer & Khata Management
@Module({
  imports: [RedisCacheModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
