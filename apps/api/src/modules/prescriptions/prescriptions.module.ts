import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionOcrService } from './services/prescription-ocr.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [PrismaModule, SearchModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrescriptionOcrService],
  exports: [PrescriptionsService, PrescriptionOcrService],
})
export class PrescriptionsModule {}
