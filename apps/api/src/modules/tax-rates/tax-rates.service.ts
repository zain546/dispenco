import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxRateDto } from './dtos/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dtos/update-tax-rate.dto';

@Injectable()
export class TaxRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTaxRateDto) {
    const existing = await this.prisma.taxRate.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: dto.code.toUpperCase().trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Tax rate code '${dto.code}' already exists.`);
    }

    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { tenantId },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxRate.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase().trim(),
        name: dto.name,
        ratePercent: dto.ratePercent,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async findAll(tenantId: string) {
    const taxRates = await this.prisma.taxRate.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });

    if (taxRates.length === 0) {
      return [
        { code: 'EXEMPT', name: 'Exempt / Zero Tax (0%)', ratePercent: 0, isDefault: false },
        { code: 'REDUCED_5', name: 'Reduced Tax (5%)', ratePercent: 5, isDefault: false },
        { code: 'STANDARD', name: 'Standard GST (18%)', ratePercent: 18, isDefault: true },
      ];
    }

    return taxRates;
  }

  async findOne(tenantId: string, id: string) {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id, tenantId },
    });

    if (!taxRate) {
      throw new NotFoundException(`Tax rate with ID '${id}' not found.`);
    }

    return taxRate;
  }

  async update(tenantId: string, id: string, dto: UpdateTaxRateDto) {
    await this.findOne(tenantId, id);

    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { tenantId },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxRate.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.toUpperCase().trim() } : {}),
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.ratePercent !== undefined ? { ratePercent: dto.ratePercent } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.taxRate.delete({
      where: { id },
    });
  }

  async getEffectiveTaxRate(tenantId: string, taxCode?: string | null): Promise<number> {
    if (!taxCode) return 0;
    const cleanCode = taxCode.toUpperCase().trim();

    const found = await this.prisma.taxRate.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: cleanCode,
        },
      },
    });

    if (found) {
      return Number(found.ratePercent);
    }

    switch (cleanCode) {
      case 'EXEMPT':
      case 'ZERO':
        return 0;
      case 'REDUCED_5':
      case 'REDUCED':
        return 5;
      case 'STANDARD':
      case 'GST_18':
      case 'DEFAULT':
        return 18;
      default:
        return 0;
    }
  }
}
