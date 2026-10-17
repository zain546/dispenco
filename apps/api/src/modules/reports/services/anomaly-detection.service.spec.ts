import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AnomalyType, AnomalyStatus } from '@dispenco/types';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;

  const mockPrismaService = {
    sale: {
      findMany: jest.fn(),
    },
    saleItem: {
      findMany: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    anomalyFlag: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomalyDetectionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AnomalyDetectionService>(AnomalyDetectionService);
  });

  describe('runScan', () => {
    it('should flag excessive discretionary discounts', async () => {
      // Void rate scan returns empty
      mockPrismaService.sale.findMany
        .mockResolvedValueOnce([]) // for void rates
        .mockResolvedValueOnce([   // for discounts
          {
            id: 'sale-disc-1',
            tenantId: 'tenant-1',
            storeId: 'store-1',
            userId: 'user-1',
            receiptNumber: 'REC-001',
            totalAmount: 1500,
            discountAmount: 1200, // > 1000 flat discount & 44.4% of gross
            createdAt: new Date(),
            user: { id: 'user-1', name: 'Cashier Ali', email: 'ali@store.com' },
          },
        ])
        .mockResolvedValueOnce([]); // for after hours

      mockPrismaService.saleItem.findMany.mockResolvedValueOnce([]);
      mockPrismaService.auditLog.findMany.mockResolvedValueOnce([]);
      mockPrismaService.anomalyFlag.findFirst.mockResolvedValue(null);
      mockPrismaService.anomalyFlag.create.mockResolvedValue({ id: 'flag-1' });

      const result = await service.runScan('tenant-1');

      expect(result.scannedRules).toBe(5);
      expect(result.newFlagsCreated).toBe(1);
      expect(mockPrismaService.anomalyFlag.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            type: AnomalyType.EXCESSIVE_DISCOUNT,
            referenceId: 'sale-disc-1',
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status to RESOLVED with manager resolution note and write audit log', async () => {
      mockPrismaService.anomalyFlag.findFirst.mockResolvedValue({
        id: 'flag-10',
        tenantId: 'tenant-1',
        status: AnomalyStatus.FLAGGED,
        type: AnomalyType.EXCESSIVE_DISCOUNT,
        resolutionNote: null,
      });

      mockPrismaService.anomalyFlag.update.mockResolvedValue({
        id: 'flag-10',
        tenantId: 'tenant-1',
        storeId: 'store-1',
        userId: 'user-1',
        type: AnomalyType.EXCESSIVE_DISCOUNT,
        severity: 'HIGH',
        status: AnomalyStatus.RESOLVED,
        title: 'Excessive Discount',
        description: 'Discount test',
        statisticalScore: null,
        metricBaseline: null,
        metricObserved: null,
        referenceId: 'sale-1',
        metadata: {},
        resolutionNote: 'Manager authorized clearance sale',
        reviewedById: 'manager-1',
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        store: { id: 'store-1', name: 'Main Pharmacy' },
        user: { id: 'user-1', name: 'Cashier Ali', email: 'ali@store.com' },
        reviewedBy: { id: 'manager-1', name: 'Manager Zain', email: 'zain@store.com' },
      });

      const updated = await service.updateStatus('tenant-1', 'flag-10', 'manager-1', {
        status: AnomalyStatus.RESOLVED,
        resolutionNote: 'Manager authorized clearance sale',
      });

      expect(updated.status).toBe(AnomalyStatus.RESOLVED);
      expect(updated.resolutionNote).toBe('Manager authorized clearance sale');
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ANOMALY_FLAG_RESOLVED',
            entityType: 'AnomalyFlag',
            entityId: 'flag-10',
          }),
        }),
      );
    });
  });

  describe('getKpiSummary', () => {
    it('should calculate accurate counts and operational integrity score', async () => {
      mockPrismaService.anomalyFlag.findMany.mockResolvedValue([
        { status: AnomalyStatus.FLAGGED, severity: 'CRITICAL', type: AnomalyType.BELOW_COST_SALE },
        { status: AnomalyStatus.FLAGGED, severity: 'HIGH', type: AnomalyType.HIGH_VOID_RATE },
        { status: AnomalyStatus.UNDER_REVIEW, severity: 'MEDIUM', type: AnomalyType.AFTER_HOURS_SALE },
        { status: AnomalyStatus.RESOLVED, severity: 'HIGH', type: AnomalyType.EXCESSIVE_DISCOUNT },
      ]);

      const summary = await service.getKpiSummary('tenant-1');

      expect(summary.totalFlags).toBe(4);
      expect(summary.pendingReviewCount).toBe(2);
      expect(summary.investigatingCount).toBe(1);
      expect(summary.resolvedCount).toBe(1);
      expect(summary.criticalSeverityCount).toBe(1);
      expect(summary.highSeverityCount).toBe(1);
      // Penalty: 1 critical * 15 + 1 high * 8 = 23 -> 100 - 23 = 77
      expect(summary.integrityScorePercent).toBe(77);
      expect(summary.breakdownByType[AnomalyType.BELOW_COST_SALE]).toBe(1);
      expect(summary.breakdownByType[AnomalyType.HIGH_VOID_RATE]).toBe(1);
    });
  });
});
