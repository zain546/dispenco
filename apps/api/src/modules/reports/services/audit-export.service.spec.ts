import { Test, TestingModule } from '@nestjs/testing';
import { AuditExportService } from './audit-export.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditExportService', () => {
  let service: AuditExportService;

  const mockPrismaService = {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditExportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditExportService>(AuditExportService);
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs with formatted summaries and severity levels', async () => {
      const now = new Date();
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'STOCK_ADJUSTMENT',
          entityType: 'Batch',
          entityId: 'batch-12345678',
          metadata: { batchNumber: 'BAT-001', quantityChange: -5, reason: 'Damaged bottles' },
          createdAt: now,
          user: {
            id: 'user-1',
            name: 'Pharmacist Sarah',
            email: 'sarah@pharmacy.com',
            userRoles: [{ role: { name: 'Pharmacist' } }],
          },
        },
        {
          id: 'log-2',
          tenantId: 'tenant-1',
          userId: 'user-2',
          action: 'SALE_VOIDED',
          entityType: 'Sale',
          entityId: 'sale-98765432',
          metadata: { saleNumber: 'REC-98765432', totalAmount: 1450, reason: 'Customer changed mind' },
          createdAt: now,
          user: {
            id: 'user-2',
            name: 'Manager John',
            email: 'john@pharmacy.com',
            userRoles: [{ role: { name: 'Manager' } }],
          },
        },
      ]);
      mockPrismaService.auditLog.count.mockResolvedValue(2);

      const result = await service.getAuditLogs('tenant-1', { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);

      // Verify log-1 (Stock Adjustment)
      expect(result.items[0].severity).toBe('warning');
      expect(result.items[0].summaryText).toContain('BAT-001');
      expect(result.items[0].summaryText).toContain('Damaged bottles');
      expect(result.items[0].user?.role).toBe('Pharmacist');

      // Verify log-2 (Sale Voided)
      expect(result.items[1].severity).toBe('critical');
      expect(result.items[1].summaryText).toContain('REC-98765432');
      expect(result.items[1].summaryText).toContain('1450');
      expect(result.items[1].user?.role).toBe('Manager');
    });
  });

  describe('generateAuditCsv', () => {
    it('should generate valid unparsed CSV content with standard inspection headers', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-100',
          tenantId: 'tenant-1',
          userId: 'user-1',
          action: 'API_KEY_CREATED',
          entityType: 'ApiKey',
          entityId: 'key-100',
          metadata: { name: 'QuickBooks Sync', keyPrefix: 'dsp_live_123...' },
          createdAt: new Date('2026-10-17T10:00:00Z'),
          user: {
            id: 'user-1',
            name: 'Dr. Zain',
            email: 'zain@pharmacy.com',
            userRoles: [{ role: { name: 'Owner' } }],
          },
        },
      ]);

      const csv = await service.generateAuditCsv('tenant-1', {});

      expect(csv).toContain('"Log ID"');
      expect(csv).toContain('"Action Code"');
      expect(csv).toContain('"Actor Name"');
      expect(csv).toContain('"API_KEY_CREATED"');
      expect(csv).toContain('"Dr. Zain"');
      expect(csv).toContain('QuickBooks Sync');
    });
  });
});
