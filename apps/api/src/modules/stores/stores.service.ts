import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dtos/create-store.dto';
import { UpdateStoreDto } from './dtos/update-store.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async createStore(tenantId: string, dto: CreateStoreDto) {
    const store = await this.prisma.store.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        currency: dto.currency || 'PKR',
        taxRate: dto.taxRate ?? 0,
        receiptFooter: dto.receiptFooter,
        expiryAlertDays: dto.expiryAlertDays,
      },
    });

    return {
      success: true,
      data: store,
      message: 'Store created successfully',
    };
  }

  async findAllStores(tenantId: string) {
    const stores = await this.prisma.store.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: stores,
      total: stores.length,
    };
  }

  async findOneStore(tenantId: string, storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store || store.tenantId !== tenantId) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }

    return {
      success: true,
      data: store,
    };
  }

  async updateStore(tenantId: string, storeId: string, dto: UpdateStoreDto) {
    await this.findOneStore(tenantId, storeId); // Verify store existence & tenant scoping

    const dataToUpdate: Prisma.StoreUpdateInput = {};

    if (dto.name !== undefined) dataToUpdate.name = dto.name;
    if (dto.address !== undefined) dataToUpdate.address = dto.address;
    if (dto.currency !== undefined) dataToUpdate.currency = dto.currency;
    if (dto.taxRate !== undefined) dataToUpdate.taxRate = dto.taxRate;
    if (dto.receiptFooter !== undefined) dataToUpdate.receiptFooter = dto.receiptFooter;
    if (dto.expiryAlertDays !== undefined) dataToUpdate.expiryAlertDays = dto.expiryAlertDays;
    if (dto.isActive !== undefined) dataToUpdate.isActive = dto.isActive;

    const updatedStore = await this.prisma.store.update({
      where: { id: storeId },
      data: dataToUpdate,
    });

    return {
      success: true,
      data: updatedStore,
      message: 'Store updated successfully',
    };
  }

  async softDeleteStore(tenantId: string, storeId: string) {
    await this.findOneStore(tenantId, storeId);

    const softDeleted = await this.prisma.store.update({
      where: { id: storeId },
      data: { isActive: false },
    });

    return {
      success: true,
      data: softDeleted,
      message: 'Store deactivated successfully',
    };
  }
}
