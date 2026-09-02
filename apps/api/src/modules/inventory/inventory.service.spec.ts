import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockAdjustmentReason } from './dtos/adjust-stock.dto';

describe('InventoryService', () => {
  let service: InventoryService;

  const mockPrismaService = {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    batch: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    store: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

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
  });

  describe('selectBatchesForSale', () => {
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

  describe('lookupByBarcode', () => {
    it('should throw BadRequestException if barcode parameter is empty', async () => {
      await expect(service.lookupByBarcode('tenant-1', '  ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if no product matches barcode', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.lookupByBarcode('tenant-1', '123456789')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return product and FEFO-ordered active batches when barcode matches', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-barcode-1',
        name: 'Panadol Extra',
        genericName: 'Paracetamol + Caffeine',
        category: 'TABLET',
        unit: 'Box',
        barcode: '8901234567890',
        lowStockThreshold: 10,
        attributes: {},
        batches: [
          {
            id: 'batch-fefo-1',
            batchNumber: 'BN-FEFO-01',
            expiryDate: new Date('2026-09-30'),
            costPrice: 50,
            sellPrice: 80,
            quantityReceived: 100,
            quantityRemaining: 25,
            createdAt: new Date(),
          },
          {
            id: 'batch-fefo-2',
            batchNumber: 'BN-FEFO-02',
            expiryDate: new Date('2027-03-31'),
            costPrice: 50,
            sellPrice: 80,
            quantityReceived: 100,
            quantityRemaining: 50,
            createdAt: new Date(),
          },
        ],
      });

      const result = await service.lookupByBarcode('tenant-1', '8901234567890');

      expect(result.success).toBe(true);
      expect(result.product.id).toBe('prod-barcode-1');
      expect(result.product.barcode).toBe('8901234567890');
      expect(result.product.totalStock).toBe(75);
      expect(result.batches).toHaveLength(2);
      expect(result.batches[0].batchNumber).toBe('BN-FEFO-01');
    });
  });

  describe('adjustBatchStock', () => {
    it('should throw NotFoundException if batch does not exist', async () => {
      mockPrismaService.batch.findFirst.mockResolvedValue(null);

      await expect(
        service.adjustBatchStock('tenant-1', 'user-1', 'invalid-batch', {
          newQuantity: 5,
          reason: StockAdjustmentReason.RECOUNT,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return unchanged response if difference is 0', async () => {
      mockPrismaService.batch.findFirst.mockResolvedValue({
        id: 'batch-1',
        batchNumber: 'BN-001',
        quantityRemaining: 10,
        product: { id: 'prod-1', name: 'Panadol', unit: 'Pack' },
      });

      const result = await service.adjustBatchStock('tenant-1', 'user-1', 'batch-1', {
        newQuantity: 10,
        reason: StockAdjustmentReason.RECOUNT,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('unchanged');
      expect(result.batch.quantityRemaining).toBe(10);
    });
  });
});
