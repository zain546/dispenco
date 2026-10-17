import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicApiScope } from '@dispenco/types';
import * as crypto from 'crypto';

describe('IntegrationsService', () => {
  let service: IntegrationsService;

  const mockPrismaService = {
    apiKey: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    batch: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    sale: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    store: {
      findMany: jest.fn(),
    },
    supplier: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
  });

  describe('createApiKey', () => {
    it('should generate a secure raw key starting with dsp_live_ and persist hashed version', async () => {
      mockPrismaService.apiKey.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'key-123',
          ...data,
          lastUsedAt: null,
          createdAt: new Date(),
        })
      );
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.createApiKey('tenant-1', 'user-1', {
        name: 'QuickBooks Sync',
        permissions: [PublicApiScope.SALES_READ, PublicApiScope.INVENTORY_READ],
        rateLimit: 120,
        expiresInDays: 30,
      });

      expect(result.rawKey).toMatch(/^dsp_live_[a-f0-9]{48}$/);
      expect(result.apiKey.name).toBe('QuickBooks Sync');
      expect(result.apiKey.keyPrefix).toMatch(/^dsp_live_[a-f0-9]{7}\.\.\.$/);
      expect(result.apiKey.rateLimit).toBe(120);

      // Verify stored hash matches SHA-256 of rawKey
      const expectedHash = crypto
        .createHash('sha256')
        .update(result.rawKey)
        .digest('hex');

      expect(mockPrismaService.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            keyHash: expectedHash,
            name: 'QuickBooks Sync',
            permissions: [PublicApiScope.SALES_READ, PublicApiScope.INVENTORY_READ],
            rateLimit: 120,
          }),
        })
      );

      // Verify audit log creation
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'API_KEY_CREATED',
            tenantId: 'tenant-1',
            entityType: 'ApiKey',
          }),
        })
      );
    });
  });

  describe('toggleApiKey', () => {
    it('should toggle the active status of an existing API key', async () => {
      mockPrismaService.apiKey.findFirst.mockResolvedValue({
        id: 'key-1',
        tenantId: 'tenant-1',
        name: 'ERP Sync',
        keyPrefix: 'dsp_live_1234567...',
        permissions: [PublicApiScope.INVENTORY_READ],
        rateLimit: 60,
        isActive: true,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
      });

      mockPrismaService.apiKey.update.mockResolvedValue({
        id: 'key-1',
        tenantId: 'tenant-1',
        name: 'ERP Sync',
        keyPrefix: 'dsp_live_1234567...',
        permissions: [PublicApiScope.INVENTORY_READ],
        rateLimit: 60,
        isActive: false,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: new Date(),
      });

      const updated = await service.toggleApiKey('tenant-1', 'user-1', 'key-1');
      expect(updated.isActive).toBe(false);
      expect(mockPrismaService.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: { isActive: false },
      });
    });
  });
});
