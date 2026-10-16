import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { InvoiceOcrService } from './services/invoice-ocr.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [PrismaModule, SearchModule],
  controllers: [PurchasesController],
  providers: [PurchasesService, InvoiceOcrService],
  exports: [PurchasesService, InvoiceOcrService],
})
export class PurchasesModule {}
