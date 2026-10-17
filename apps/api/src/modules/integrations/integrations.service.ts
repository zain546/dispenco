import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto } from './dtos/create-api-key.dto';
import {
  PublicInventoryQueryDto,
  PublicBatchesQueryDto,
  PublicSalesQueryDto,
  PublicFinancialSummaryQueryDto,
} from './dtos/public-query.dtos';
import {
  ApiKeyItem,
  CreateApiKeyResult,
  PublicInventoryItem,
  PublicBatchItem,
  PublicSaleRecord,
  PublicLedgerTransaction,
  PublicFinancialSummary,
  PublicSupplierItem,
  ALL_PUBLIC_API_SCOPES,
} from '@dispenco/types';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // API KEY MANAGEMENT
  // ==========================================

  async createApiKey(
    tenantId: string,
    userId: string,
    dto: CreateApiKeyDto
  ): Promise<CreateApiKeyResult> {
    // Generate secure random key: dsp_live_<48 hex chars>
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawKey = `dsp_live_${randomHex}`;
    const keyPrefix = `${rawKey.slice(0, 16)}...`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    let expiresAt: Date | null = null;
    if (dto.expiresInDays && dto.expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + dto.expiresInDays);
    }

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        keyPrefix,
        keyHash,
        permissions: dto.permissions,
        rateLimit: dto.rateLimit || 60,
        expiresAt,
        createdById: userId,
        isActive: true,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'API_KEY_CREATED',
        entityType: 'ApiKey',
        entityId: apiKey.id,
        metadata: {
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          permissions: apiKey.permissions,
          rateLimit: apiKey.rateLimit,
          expiresAt: apiKey.expiresAt,
        },
      },
    });

    this.logger.log(`API key created: ${apiKey.id} (${apiKey.name}) for tenant ${tenantId}`);

    return {
      apiKey: this.formatApiKeyItem(apiKey),
      rawKey,
    };
  }

  async listApiKeys(tenantId: string): Promise<ApiKeyItem[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((key) => this.formatApiKeyItem(key));
  }

  async toggleApiKey(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<ApiKeyItem> {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: !key.isActive },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: updated.isActive ? 'API_KEY_ACTIVATED' : 'API_KEY_DEACTIVATED',
        entityType: 'ApiKey',
        entityId: updated.id,
        metadata: {
          name: updated.name,
          isActive: updated.isActive,
        },
      },
    });

    return this.formatApiKeyItem(updated);
  }

  async deleteApiKey(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<{ success: boolean; message: string }> {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'API_KEY_REVOKED',
        entityType: 'ApiKey',
        entityId: id,
        metadata: {
          name: key.name,
          keyPrefix: key.keyPrefix,
        },
      },
    });

    return { success: true, message: 'API key revoked permanently' };
  }

  // ==========================================
  // PUBLIC INTEGRATION READ ENDPOINTS
  // ==========================================

  async getPublicInventory(
    tenantId: string,
    query: PublicInventoryQueryDto
  ): Promise<{
    items: PublicInventoryItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      tenantId,
      isActive: true,
    };

    if (query.category) {
      whereClause.category = {
        equals: query.category,
        mode: 'insensitive',
      };
    }

    if (query.search) {
      whereClause.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { genericName: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const batchWhere: any = {
      quantityRemaining: { gt: 0 },
    };
    if (query.storeId) {
      batchWhere.storeId = query.storeId;
    }

    const [products, totalCount] = await Promise.all([
      this.prisma.product.findMany({
        where: whereClause,
        include: {
          batches: {
            where: batchWhere,
            include: {
              store: {
                select: { id: true, name: true },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where: whereClause }),
    ]);

    let mappedItems: PublicInventoryItem[] = products.map((product) => {
      const totalStock = product.batches.reduce(
        (sum, batch) => sum + batch.quantityRemaining,
        0
      );

      const storeName = product.batches[0]?.store?.name;

      return {
        id: product.id,
        name: product.name,
        genericName: product.genericName,
        category: product.category,
        unit: product.unit,
        barcode: product.barcode,
        taxCode: product.taxCode,
        isControlledSubstance: product.isControlledSubstance,
        totalStock,
        lowStockThreshold: product.lowStockThreshold,
        isLowStock: totalStock <= product.lowStockThreshold,
        storeId: query.storeId || undefined,
        storeName: query.storeId ? storeName : undefined,
        attributes: (product.attributes as Record<string, unknown>) || {},
        batchesCount: product.batches.length,
      };
    });

    if (query.isLowStock) {
      mappedItems = mappedItems.filter((item) => item.isLowStock);
    }

    return {
      items: mappedItems,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getPublicBatches(
    tenantId: string,
    query: PublicBatchesQueryDto
  ): Promise<{
    items: PublicBatchItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      tenantId,
      quantityRemaining: { gt: 0 },
    };

    if (query.storeId) {
      whereClause.storeId = query.storeId;
    }

    if (query.productId) {
      whereClause.productId = query.productId;
    }

    const now = new Date();
    if (query.isExpiringSoon) {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + 90);
      whereClause.expiryDate = { lte: thresholdDate };
    }

    const [batches, totalCount] = await Promise.all([
      this.prisma.batch.findMany({
        where: whereClause,
        include: {
          product: { select: { id: true, name: true, category: true } },
          store: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { expiryDate: 'asc' }, // FEFO order
      }),
      this.prisma.batch.count({ where: whereClause }),
    ]);

    const items: PublicBatchItem[] = batches.map((batch) => {
      const diffTime = batch.expiryDate.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: batch.id,
        productId: batch.productId,
        productName: batch.product.name,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate.toISOString(),
        costPrice: Number(batch.costPrice),
        sellPrice: Number(batch.sellPrice),
        quantityRemaining: batch.quantityRemaining,
        storeId: batch.storeId,
        storeName: batch.store.name,
        daysUntilExpiry,
        isExpired: daysUntilExpiry <= 0,
      };
    });

    return {
      items,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getPublicSales(
    tenantId: string,
    query: PublicSalesQueryDto
  ): Promise<{
    sales: PublicSaleRecord[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      tenantId,
    };

    if (query.storeId) {
      whereClause.storeId = query.storeId;
    }

    if (query.status) {
      whereClause.status = query.status;
    }

    if (query.startDate || query.endDate) {
      whereClause.createdAt = {};
      if (query.startDate) {
        whereClause.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        whereClause.createdAt.lte = new Date(query.endDate);
      }
    }

    const [sales, totalCount] = await Promise.all([
      this.prisma.sale.findMany({
        where: whereClause,
        include: {
          store: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
          payments: { select: { method: true, amount: true, status: true } },
          saleItems: {
            include: {
              product: { select: { name: true } },
              batch: { select: { batchNumber: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sale.count({ where: whereClause }),
    ]);

    const mappedSales: PublicSaleRecord[] = sales.map((sale) => {
      const primaryPayment = sale.payments[0]?.method || 'CASH';

      return {
        id: sale.id,
        saleNumber: `REC-${sale.id.slice(0, 8).toUpperCase()}`,
        storeId: sale.storeId,
        storeName: sale.store.name,
        createdAt: sale.createdAt.toISOString(),
        status: sale.status,
        totalAmount: Number(sale.totalAmount),
        discountAmount: Number(sale.discountAmount),
        taxAmount: Number(sale.taxAmount),
        paymentMethod: primaryPayment,
        customerName: sale.customer?.name || null,
        customerPhone: sale.customer?.phone || null,
        itemsCount: sale.saleItems.length,
        items: sale.saleItems.map((item) => ({
          productName: item.product.name,
          batchNumber: item.batch.batchNumber,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          taxApplied: Number(item.taxApplied),
          total: Number(item.unitPrice) * item.quantity - Number(item.discount),
        })),
      };
    });

    return {
      sales: mappedSales,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getPublicSalesLedger(
    tenantId: string,
    query: PublicSalesQueryDto
  ): Promise<{
    ledger: PublicLedgerTransaction[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { sales, pagination } = await this.getPublicSales(tenantId, query);

    const ledger: PublicLedgerTransaction[] = [];

    for (const sale of sales) {
      const netAmount = sale.totalAmount;
      const tax = sale.taxAmount;
      const discount = sale.discountAmount;
      const grossRevenue = netAmount - tax + discount;

      // 1. Debit Entry (Cash / Bank / Accounts Receivable)
      ledger.push({
        id: `${sale.id}-debit`,
        date: sale.createdAt,
        transactionType: 'SALE',
        referenceNumber: sale.saleNumber,
        storeId: sale.storeId,
        storeName: sale.storeName,
        accountCode: sale.paymentMethod === 'CREDIT' ? '1100-AR' : '1010-CASH',
        debit: netAmount,
        credit: 0,
        netAmount,
        taxAmount: tax,
        paymentMethod: sale.paymentMethod,
        entityName: sale.customerName || 'Retail Walk-in Customer',
        description: `POS Sale Receipt ${sale.saleNumber} (${sale.itemsCount} medicines)`,
      });

      // 2. Credit Entry (Sales Revenue)
      ledger.push({
        id: `${sale.id}-credit-rev`,
        date: sale.createdAt,
        transactionType: 'SALE',
        referenceNumber: sale.saleNumber,
        storeId: sale.storeId,
        storeName: sale.storeName,
        accountCode: '4010-SALES-REVENUE',
        debit: 0,
        credit: grossRevenue,
        netAmount: grossRevenue,
        taxAmount: 0,
        paymentMethod: sale.paymentMethod,
        entityName: sale.customerName || 'Retail Customer',
        description: `Revenue from sale ${sale.saleNumber}`,
      });

      // 3. Tax Payable Entry (if tax > 0)
      if (tax > 0) {
        ledger.push({
          id: `${sale.id}-credit-tax`,
          date: sale.createdAt,
          transactionType: 'SALE',
          referenceNumber: sale.saleNumber,
          storeId: sale.storeId,
          storeName: sale.storeName,
          accountCode: '2200-SALES-TAX-PAYABLE',
          debit: 0,
          credit: tax,
          netAmount: tax,
          taxAmount: tax,
          paymentMethod: sale.paymentMethod,
          entityName: 'State Revenue Department',
          description: `Sales Tax Collected on ${sale.saleNumber}`,
        });
      }

      // 4. Discount Expense (if discount > 0)
      if (discount > 0) {
        ledger.push({
          id: `${sale.id}-debit-disc`,
          date: sale.createdAt,
          transactionType: 'SALE',
          referenceNumber: sale.saleNumber,
          storeId: sale.storeId,
          storeName: sale.storeName,
          accountCode: '5050-SALES-DISCOUNT-EXPENSE',
          debit: discount,
          credit: 0,
          netAmount: discount,
          taxAmount: 0,
          paymentMethod: sale.paymentMethod,
          entityName: sale.customerName || 'Retail Customer',
          description: `Commercial Discount applied on ${sale.saleNumber}`,
        });
      }
    }

    return {
      ledger,
      pagination: {
        total: ledger.length,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
      },
    };
  }

  async getPublicFinancialSummary(
    tenantId: string,
    query: PublicFinancialSummaryQueryDto
  ): Promise<PublicFinancialSummary> {
    const whereClause: any = { tenantId, status: 'completed' };

    if (query.storeId) {
      whereClause.storeId = query.storeId;
    }

    if (query.startDate || query.endDate) {
      whereClause.createdAt = {};
      if (query.startDate) whereClause.createdAt.gte = new Date(query.startDate);
      if (query.endDate) whereClause.createdAt.lte = new Date(query.endDate);
    }

    const [sales, stores] = await Promise.all([
      this.prisma.sale.findMany({
        where: whereClause,
        include: {
          payments: { select: { method: true, amount: true } },
          store: { select: { id: true, name: true } },
        },
      }),
      this.prisma.store.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);

    let totalGrossSales = 0;
    let totalDiscounts = 0;
    let totalTaxes = 0;
    let totalNetSales = 0;
    const paymentMethodsBreakdown: Record<string, number> = {};
    const storeMap = new Map<string, { storeId: string; storeName: string; grossSales: number; netSales: number; transactions: number }>();

    stores.forEach((s) => {
      storeMap.set(s.id, {
        storeId: s.id,
        storeName: s.name,
        grossSales: 0,
        netSales: 0,
        transactions: 0,
      });
    });

    for (const sale of sales) {
      const net = Number(sale.totalAmount);
      const discount = Number(sale.discountAmount);
      const tax = Number(sale.taxAmount);
      const gross = net + discount;

      totalGrossSales += gross;
      totalDiscounts += discount;
      totalTaxes += tax;
      totalNetSales += net;

      // Payment breakdown
      const method = sale.payments[0]?.method || 'CASH';
      paymentMethodsBreakdown[method] = (paymentMethodsBreakdown[method] || 0) + net;

      // Store breakdown
      const storeEntry = storeMap.get(sale.storeId);
      if (storeEntry) {
        storeEntry.grossSales += gross;
        storeEntry.netSales += net;
        storeEntry.transactions += 1;
      }
    }

    const totalTransactions = sales.length;
    const averageTicketSize =
      totalTransactions > 0 ? Math.round((totalNetSales / totalTransactions) * 100) / 100 : 0;

    return {
      periodStart: query.startDate || 'all-time',
      periodEnd: query.endDate || new Date().toISOString(),
      totalGrossSales: Math.round(totalGrossSales * 100) / 100,
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
      totalTaxes: Math.round(totalTaxes * 100) / 100,
      totalNetSales: Math.round(totalNetSales * 100) / 100,
      totalTransactions,
      averageTicketSize,
      paymentMethodsBreakdown,
      storesBreakdown: Array.from(storeMap.values()),
    };
  }

  async getPublicSuppliers(tenantId: string): Promise<PublicSupplierItem[]> {
    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return suppliers.map((sup) => ({
      id: sup.id,
      name: sup.name,
      contactPhone: sup.contactPhone,
      contactEmail: sup.contactEmail,
      address: sup.address,
      leadTimeDays: sup.leadTimeDays,
      isActive: sup.isActive,
      pendingOrdersCount: sup._count?.purchaseOrders || 0,
    }));
  }

  // ==========================================
  // OPENAPI 3.0 SPECIFICATION GENERATOR
  // ==========================================

  getOpenApiSpec(baseUrl: string) {
    return {
      openapi: '3.0.3',
      info: {
        title: 'Dispenco Public API for Integrations',
        version: '1.0.0',
        description:
          'High-performance, secure REST API providing programmatic read access to pharmacy inventory, sales, accounting ledgers, and reporting data for third-party integrations (accounting systems, ERPs, distributor portals).',
        contact: {
          name: 'Dispenco Engineering Support',
          url: 'https://dispenco.com/docs/api',
        },
      },
      servers: [
        {
          url: `${baseUrl}/api/v1/public/v1`,
          description: 'Production / Development Gateway Server',
        },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
            description:
              'Provide your Dispenco integration key in the `x-api-key` HTTP header (or `Authorization: Bearer dsp_live_...`).',
          },
        },
        schemas: {
          PublicInventoryItem: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string', example: 'Augmentin 625mg' },
              genericName: { type: 'string', example: 'Amoxicillin + Clavulanic Acid' },
              category: { type: 'string', example: 'Antibiotics' },
              unit: { type: 'string', example: 'Tablets' },
              barcode: { type: 'string', example: '8901234567890' },
              totalStock: { type: 'integer', example: 140 },
              lowStockThreshold: { type: 'integer', example: 20 },
              isLowStock: { type: 'boolean', example: false },
              attributes: { type: 'object' },
            },
          },
          PublicBatchItem: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              productName: { type: 'string', example: 'Panadol Extra 500mg' },
              batchNumber: { type: 'string', example: 'BAT-2026-X9' },
              expiryDate: { type: 'string', format: 'date-time' },
              costPrice: { type: 'number', example: 45.5 },
              sellPrice: { type: 'number', example: 60.0 },
              quantityRemaining: { type: 'integer', example: 50 },
              daysUntilExpiry: { type: 'integer', example: 240 },
            },
          },
          PublicSaleRecord: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              saleNumber: { type: 'string', example: 'REC-F9A0831B' },
              createdAt: { type: 'string', format: 'date-time' },
              totalAmount: { type: 'number', example: 185.0 },
              discountAmount: { type: 'number', example: 10.0 },
              taxAmount: { type: 'number', example: 15.0 },
              paymentMethod: { type: 'string', example: 'CASH' },
              itemsCount: { type: 'integer', example: 2 },
            },
          },
        },
      },
      security: [{ ApiKeyAuth: [] }],
      paths: {
        '/ping': {
          get: {
            summary: 'Verify API credentials and connectivity',
            responses: {
              '200': { description: 'Authenticated successfully' },
              '401': { description: 'Invalid or missing API key' },
            },
          },
        },
        '/inventory': {
          get: {
            summary: 'Retrieve product catalog and active stock levels',
            parameters: [
              { name: 'storeId', in: 'query', schema: { type: 'string' } },
              { name: 'search', in: 'query', schema: { type: 'string' } },
              { name: 'category', in: 'query', schema: { type: 'string' } },
              { name: 'isLowStock', in: 'query', schema: { type: 'boolean' } },
              { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            ],
            responses: {
              '200': { description: 'Paginated list of inventory medicines' },
            },
          },
        },
        '/inventory/batches': {
          get: {
            summary: 'Retrieve batch records with expiry tracking (FEFO)',
            parameters: [
              { name: 'storeId', in: 'query', schema: { type: 'string' } },
              { name: 'productId', in: 'query', schema: { type: 'string' } },
              { name: 'isExpiringSoon', in: 'query', schema: { type: 'boolean' } },
            ],
            responses: {
              '200': { description: 'Active batches sorted by earliest expiry' },
            },
          },
        },
        '/sales': {
          get: {
            summary: 'Retrieve customer sale receipts and transaction history',
            parameters: [
              { name: 'storeId', in: 'query', schema: { type: 'string' } },
              { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
              { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
            ],
            responses: {
              '200': { description: 'Customer transaction receipts' },
            },
          },
        },
        '/sales/ledger': {
          get: {
            summary: 'Export double-entry accounting journal feed (QuickBooks / Xero format)',
            parameters: [
              { name: 'storeId', in: 'query', schema: { type: 'string' } },
              { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
              { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
            ],
            responses: {
              '200': { description: 'Double-entry debit/credit ledger feed' },
            },
          },
        },
        '/reports/summary': {
          get: {
            summary: 'Retrieve financial sales totals, tax collections, and store KPIs',
            parameters: [
              { name: 'storeId', in: 'query', schema: { type: 'string' } },
              { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
              { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
            ],
            responses: {
              '200': { description: 'Aggregated financial summary' },
            },
          },
        },
        '/suppliers': {
          get: {
            summary: 'Retrieve supplier list with pending purchase orders',
            responses: {
              '200': { description: 'Distributor and supplier list' },
            },
          },
        },
      },
    };
  }

  private formatApiKeyItem(key: any): ApiKeyItem {
    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions || [],
      rateLimit: key.rateLimit,
      lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
      expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
      isActive: key.isActive,
      createdAt: key.createdAt.toISOString(),
    };
  }
}
