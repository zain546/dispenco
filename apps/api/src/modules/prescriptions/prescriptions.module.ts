import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionOcrService } from './services/prescription-ocr.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';
import { RedisCacheModule } from '../cache/redis-cache.module';

@Module({
  imports: [PrismaModule, SearchModule, RedisCacheModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrescriptionOcrService],
  exports: [PrescriptionsService, PrescriptionOcrService],
})
export class PrescriptionsModule {}
