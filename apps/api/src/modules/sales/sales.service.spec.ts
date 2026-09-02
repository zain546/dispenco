import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, SaleStatus } from '@prisma/client';

describe('SalesService - Transactional Sale Creation (createSale)', () => {
  let service: SalesService;

  const mockTx = {
    customer: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    sale: {
      count: jest.fn(),
      create: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    batch: {
      update: jest.fn(),
    },
    payment: {
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
    $transaction: jest.fn(),
  };

  const mockInventoryService = {
    selectBatchesForSale: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
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
    mockTx.product.findFirst.mockResolvedValue(null);

    await expect(
      service.createSale('tenant-1', 'user-1', {
        items: [{ productId: 'invalid-prod', quantity: 1 }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create sale, deduct stock FEFO, generate receipt, and record payment', async () => {
    mockPrismaService.store.findFirst.mockResolvedValue({ id: 'store-1', name: 'Main Store' });
    mockTx.sale.count.mockResolvedValue(5);

    mockTx.product.findFirst.mockResolvedValue({
      id: 'prod-1',
      name: 'Augmentin 625mg',
      unit: 'Pack',
    });

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

    // Verify batch quantity remaining was decremented in transaction
    expect(mockTx.batch.update).toHaveBeenCalledWith({
      where: { id: 'batch-fefo-1' },
      data: {
        quantityRemaining: {
          decrement: 2,
        },
      },
    });

    // Verify payment record was created
    expect(mockTx.payment.create).toHaveBeenCalled();
  });
});
