import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, SaleStatus } from '@prisma/client';

describe('SalesService - Transactional Sale Creation (createSale)', () => {
  let service: SalesService;

  const mockTx = {
    customer: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sale: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    taxRate: {
      findMany: jest.fn(),
    },
    batch: {
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    payment: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockPrismaService = {
    store: {
      findFirst: jest.fn(),
    },
    sale: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    nextSequence: jest.fn().mockResolvedValue({ seq: 6, formatted: 'REC-20260902-0006' }),
    $transaction: jest.fn(),
  };

  const mockInventoryService = {
    selectBatchesForSale: jest.fn(),
  };

  const mockNotificationsService = {
    sendMessage: jest.fn().mockResolvedValue(true),
  };

  const mockRedisCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delByPattern: jest.fn().mockResolvedValue(0),
    wrap: jest.fn().mockImplementation((_k, _ttl, fn) => fn()),
    invalidateStoreInventory: jest.fn().mockResolvedValue(undefined),
    invalidateTenantConfig: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockTx.batch.updateMany.mockResolvedValue({ count: 1 });
    mockTx.sale.updateMany.mockResolvedValue({ count: 1 });
    mockTx.taxRate.findMany.mockResolvedValue([]);
    mockTx.product.findMany.mockResolvedValue([
      { id: 'prod-1', name: 'Augmentin 625mg', unit: 'Pack', attributes: {} },
    ]);
    mockPrismaService.nextSequence.mockResolvedValue({ seq: 6, formatted: 'REC-20260902-0006' });
    mockPrismaService.$transaction.mockImplementation((callback) => callback(mockTx));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: RedisCacheService,
          useValue: mockRedisCacheService,
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  it('should throw BadRequestException if items array is empty', async () => {
    await expect(
      service.createSale('tenant-1', 'user-1', { items: [] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if no active store is found', async () => {
    mockPrismaService.store.findFirst.mockResolvedValue(null);

    await expect(
      service.createSale('tenant-1', 'user-1', {
        items: [{ productId: 'prod-1', quantity: 2 }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if a medicine product in cart does not exist', async () => {
    mockPrismaService.store.findFirst.mockResolvedValue({ id: 'store-1', name: 'Main Pharmacy' });
    mockTx.product.findMany.mockResolvedValue([]);

    await expect(
      service.createSale('tenant-1', 'user-1', {
        items: [{ productId: 'invalid-prod', quantity: 1 }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create sale, deduct stock FEFO, generate receipt, and record payment', async () => {
    mockPrismaService.store.findFirst.mockResolvedValue({ id: 'store-1', name: 'Main Store' });

    mockTx.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Augmentin 625mg',
        unit: 'Pack',
        attributes: {},
      },
    ]);

    mockInventoryService.selectBatchesForSale.mockResolvedValue({
      productId: 'prod-1',
      totalQuantityRequested: 2,
      totalQuantityAllocated: 2,
      allocations: [
        {
          batchId: 'batch-fefo-1',
          batchNumber: 'BN-1001',
          expiryDate: new Date('2026-11-30'),
          costPrice: 150,
          sellPrice: 200,
          quantityToDeduct: 2,
          quantityRemainingBefore: 10,
          quantityRemainingAfter: 8,
        },
      ],
    });

    mockTx.sale.create.mockResolvedValue({
      id: 'sale-101',
      receiptNumber: 'REC-20260902-0006',
      totalAmount: 400,
      discountAmount: 0,
      taxAmount: 0,
      status: SaleStatus.COMPLETED,
      createdAt: new Date(),
      customer: null,
      store: { id: 'store-1', name: 'Main Store' },
      user: { id: 'user-1', name: 'Pharmacist John', email: 'john@pharma.com' },
      saleItems: [
        {
          id: 'si-1',
          productId: 'prod-1',
          batchId: 'batch-fefo-1',
          quantity: 2,
          unitPrice: 200,
          discount: 0,
          taxApplied: 0,
          product: { name: 'Augmentin 625mg', unit: 'Pack' },
          batch: { batchNumber: 'BN-1001' },
        },
      ],
    });

    const result = await service.createSale('tenant-1', 'user-1', {
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 2, unitPrice: 200 }],
      paymentMethod: PaymentMethod.CASH,
    });

    expect(result.success).toBe(true);
    expect(result.sale.receiptNumber).toBe('REC-20260902-0006');
    expect(result.sale.totalAmount).toBe(400);

    // Verify batch quantity remaining was decremented in transaction atomically
    expect(mockTx.batch.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'batch-fefo-1',
        quantityRemaining: { gte: 2 },
      },
      data: {
        quantityRemaining: {
          decrement: 2,
        },
      },
    });

    // Verify payment record was created
    expect(mockTx.payment.create).toHaveBeenCalled();
  });

  describe('voidSale', () => {
    it('should atomically claim the sale and restore batch stock', async () => {
      mockTx.sale.findFirst.mockResolvedValue({
        id: 'sale-1',
        receiptNumber: 'REC-20261102-0001',
        status: SaleStatus.COMPLETED,
        storeId: 'store-1',
        totalAmount: 200,
        saleItems: [
          {
            id: 'si-1',
            batchId: 'batch-1',
            quantity: 2,
            stockDeducted: 2,
          },
        ],
      });
      mockTx.sale.updateMany.mockResolvedValue({ count: 1 });
      mockTx.batch.update.mockResolvedValue({});
      mockTx.auditLog.create.mockResolvedValue({});

      const result = await service.voidSale('tenant-1', 'user-1', 'sale-1', 'Customer returned');

      expect(result.success).toBe(true);
      expect(mockTx.sale.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'sale-1',
          tenantId: 'tenant-1',
          status: { not: SaleStatus.VOIDED },
        },
        data: {
          status: SaleStatus.VOIDED,
        },
      });
      expect(mockTx.batch.update).toHaveBeenCalledWith({
        where: { id: 'batch-1' },
        data: {
          quantityRemaining: {
            increment: 2,
          },
        },
      });
    });

    it('should throw BadRequestException if sale was already voided or concurrently claimed', async () => {
      mockTx.sale.findFirst.mockResolvedValue({
        id: 'sale-1',
        receiptNumber: 'REC-20261102-0001',
        status: SaleStatus.COMPLETED,
        storeId: 'store-1',
        saleItems: [],
      });
      mockTx.sale.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.voidSale('tenant-1', 'user-1', 'sale-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
