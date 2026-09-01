import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InventoryService - FEFO Stock Selection Logic (selectBatchesForSale)', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      findFirst: jest.fn(),
    },
    batch: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should throw BadRequestException if requested quantity is <= 0', async () => {
    await expect(
      service.selectBatchesForSale('tenant-1', 'prod-1', 0),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if product does not exist', async () => {
    mockPrismaService.product.findFirst.mockResolvedValue(null);

    await expect(
      service.selectBatchesForSale('tenant-1', 'non-existent-prod', 5),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if available non-expired stock is insufficient', async () => {
    mockPrismaService.product.findFirst.mockResolvedValue({
      id: 'prod-1',
      name: 'Panadol Extra',
      unit: 'Pack',
    });

    // 2 active batches totaling 3 units
    mockPrismaService.batch.findMany.mockResolvedValue([
      {
        id: 'batch-1',
        batchNumber: 'BN-001',
        expiryDate: new Date('2026-10-01'),
        costPrice: 100,
        sellPrice: 150,
        quantityRemaining: 2,
      },
      {
        id: 'batch-2',
        batchNumber: 'BN-002',
        expiryDate: new Date('2026-12-01'),
        costPrice: 100,
        sellPrice: 150,
        quantityRemaining: 1,
      },
    ]);

    // Request 5 units when only 3 available
    await expect(
      service.selectBatchesForSale('tenant-1', 'prod-1', 5),
    ).rejects.toThrow(BadRequestException);
  });

  it('should select earliest expiring batch first (FEFO order)', async () => {
    mockPrismaService.product.findFirst.mockResolvedValue({
      id: 'prod-1',
      name: 'Brufen 400mg',
      unit: 'Box',
    });

    const soonestBatchDate = new Date('2026-09-01');
    const laterBatchDate = new Date('2027-01-01');

    mockPrismaService.batch.findMany.mockResolvedValue([
      {
        id: 'batch-earliest',
        batchNumber: 'BN-EARLY',
        expiryDate: soonestBatchDate,
        costPrice: 50,
        sellPrice: 80,
        quantityRemaining: 10,
      },
      {
        id: 'batch-later',
        batchNumber: 'BN-LATER',
        expiryDate: laterBatchDate,
        costPrice: 50,
        sellPrice: 80,
        quantityRemaining: 20,
      },
    ]);

    // Request 5 units -> Should be fully fulfilled by batch-earliest
    const result = await service.selectBatchesForSale('tenant-1', 'prod-1', 5);

    expect(result.totalQuantityAllocated).toBe(5);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].batchId).toBe('batch-earliest');
    expect(result.allocations[0].quantityToDeduct).toBe(5);
    expect(result.allocations[0].quantityRemainingAfter).toBe(5);
  });

  it('should split deduction across multiple batches in FEFO order when needed', async () => {
    mockPrismaService.product.findFirst.mockResolvedValue({
      id: 'prod-1',
      name: 'Augmentin 625mg',
      unit: 'Pack',
    });

    mockPrismaService.batch.findMany.mockResolvedValue([
      {
        id: 'batch-1',
        batchNumber: 'BN-101',
        expiryDate: new Date('2026-09-15'),
        costPrice: 200,
        sellPrice: 300,
        quantityRemaining: 3,
      },
      {
        id: 'batch-2',
        batchNumber: 'BN-102',
        expiryDate: new Date('2026-11-20'),
        costPrice: 200,
        sellPrice: 300,
        quantityRemaining: 10,
      },
    ]);

    // Request 5 units -> 3 from batch-1, 2 from batch-2
    const result = await service.selectBatchesForSale('tenant-1', 'prod-1', 5);

    expect(result.totalQuantityAllocated).toBe(5);
    expect(result.allocations).toHaveLength(2);

    expect(result.allocations[0].batchId).toBe('batch-1');
    expect(result.allocations[0].quantityToDeduct).toBe(3);
    expect(result.allocations[0].quantityRemainingAfter).toBe(0);

    expect(result.allocations[1].batchId).toBe('batch-2');
    expect(result.allocations[1].quantityToDeduct).toBe(2);
    expect(result.allocations[1].quantityRemainingAfter).toBe(8);
  });
});
