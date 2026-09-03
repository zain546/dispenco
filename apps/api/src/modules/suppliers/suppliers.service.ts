import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import { UpdateSupplierDto } from './dtos/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateSupplierDto) {
    const supplier = await this.prisma.supplier.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        contactPhone: dto.contactPhone?.trim() || null,
        contactEmail: dto.contactEmail?.trim() || null,
        address: dto.address?.trim() || null,
        leadTimeDays: dto.leadTimeDays ?? 3,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    };
  }

  async findAll(tenantId: string, search?: string) {
    const where: any = { tenantId };

    if (search && search.trim()) {
      const query = search.trim();
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { contactPhone: { contains: query, mode: 'insensitive' } },
        { contactEmail: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
      ];
    }

    const suppliers = await this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    return {
      success: true,
      data: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        contactPhone: s.contactPhone,
        contactEmail: s.contactEmail,
        address: s.address,
        leadTimeDays: s.leadTimeDays,
        isActive: s.isActive,
        purchaseOrdersCount: s._count.purchaseOrders,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  async findOne(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }

    return {
      success: true,
      data: supplier,
    };
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto) {
    await this.findOne(tenantId, id);

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone?.trim() || null }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail?.trim() || null }),
        ...(dto.address !== undefined && { address: dto.address?.trim() || null }),
        ...(dto.leadTimeDays !== undefined && { leadTimeDays: dto.leadTimeDays }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      success: true,
      message: 'Supplier updated successfully',
      data: updated,
    };
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    await this.prisma.supplier.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Supplier deleted successfully',
    };
  }
}
