const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        esModuleInterop: true,
      },
      fileName: filename,
    }).outputText,
    filename,
  );

require('reflect-metadata');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { SalesService } = require('../src/modules/sales/sales.service.ts');

describe('SalesService - Security & Accounting Guardrails', () => {
  const createMockService = (overrides = {}) => {
    const mockTx = {
      customer: {
        findFirst: async () => null,
        create: async (args) => ({ id: 'new-cust', ...args.data }),
        update: async () => ({ id: 'cust-1' }),
      },
      sale: {
        findFirst: async () => null,
        create: async (args) => ({
          id: 'sale-1',
          receiptNumber: 'REC-001',
          totalAmount: 0,
          discountAmount: 0,
          taxAmount: 0,
          status: 'COMPLETED',
          createdAt: new Date(),
          ...args.data,
          customer: null,
          store: { id: 'store-1', name: 'Main Store' },
          user: { id: 'user-1', name: 'Staff' },
          saleItems: [],
        }),
        update: async () => ({ id: 'sale-1' }),
        updateMany: async () => ({ count: 1 }),
      },
      product: {
        findFirst: async () => null,
        findMany: async () => [
          { id: 'prod-1', name: 'Panadol', unit: 'Pack', attributes: { packSize: 10 } },
        ],
      },
      taxRate: {
        findMany: async () => [],
      },
      batch: {
        update: async () => ({}),
        updateMany: async () => ({ count: 1 }),
      },
      payment: {
        create: async () => ({ id: 'pay-1' }),
      },
      auditLog: {
        create: async () => ({ id: 'log-1' }),
      },
      ...overrides.tx,
    };

    const mockPrisma = {
      store: {
        findFirst: async () => ({ id: 'store-1', name: 'Main Pharmacy' }),
      },
      nextSequence: async () => ({ seq: 1, formatted: 'REC-001' }),
      $transaction: async (cb) => cb(mockTx),
      ...overrides.prisma,
    };

    const mockInventory = {
      selectBatchesForSale: async () => ({
        productId: 'prod-1',
        totalQuantityRequested: 1,
        totalQuantityAllocated: 1,
        allocations: [
          {
            batchId: 'batch-1',
            batchNumber: 'B-01',
            expiryDate: new Date('2027-01-01'),
            costPrice: 50,
            sellPrice: 80,
            quantityToDeduct: 1,
            quantityRemainingBefore: 10,
            quantityRemainingAfter: 9,
          },
        ],
      }),
      ...overrides.inventory,
    };

    const mockNotifications = {
      sendMessage: async () => true,
    };

    const mockRedis = {
      get: async (k) => overrides.cachedTx || null,
      set: async () => undefined,
      del: async () => undefined,
      delByPattern: async () => 0,
      wrap: async (_k, _ttl, fn) => fn(),
      invalidateStoreInventory: async () => undefined,
      invalidateTenantConfig: async () => undefined,
      ...overrides.redis,
    };

    const service = new SalesService(
      mockPrisma,
      mockInventory,
      mockNotifications,
      mockRedis,
    );

    return { service, mockTx, mockPrisma, mockRedis };
  };

  test('1. Rejects credit (Khata) sale when customerId is missing, even if customerName is provided', async () => {
    const { service } = createMockService();

    await assert.rejects(
      async () => {
        await service.createSale('tenant-1', 'user-1', {
          paymentMethod: 'CREDIT',
          customerName: 'Anonymous Walk-in',
          items: [{ productId: 'prod-1', quantity: 1, unitPrice: 80 }],
        });
      },
      {
        name: 'BadRequestException',
        message: 'Customer account required for Khata credit sale.',
      },
    );
  });

  test('2. Does NOT create orphan Customer in Khata database for walk-in cash sales without phone number', async () => {
    let customerCreated = false;
    const { service } = createMockService({
      tx: {
        customer: {
          findFirst: async () => null,
          create: async () => {
            customerCreated = true;
            return { id: 'should-not-exist' };
          },
        },
      },
    });

    await service.createSale('tenant-1', 'user-1', {
      paymentMethod: 'CASH',
      customerName: 'Walk-in Cashier Guest',
      items: [{ productId: 'prod-1', quantity: 1, unitPrice: 80 }],
    });

    assert.equal(customerCreated, false, 'Should not create customer row in DB for casual walk-ins');
  });

  test('3. Idempotency: Returns cached sale immediately when duplicate clientTxId is submitted', async () => {
    const cachedResponse = {
      sale: { id: 'cached-sale-id', receiptNumber: 'REC-CACHED-001' },
      message: 'Sale created successfully (cached)',
    };

    const { service } = createMockService({
      cachedTx: cachedResponse,
    });

    const result = await service.createSale('tenant-1', 'user-1', {
      clientTxId: 'tx-already-executed-123',
      paymentMethod: 'CASH',
      items: [{ productId: 'prod-1', quantity: 1, unitPrice: 80 }],
    });

    assert.deepEqual(result, cachedResponse);
  });

  test('4. Proportional Tax & Clamped 100% Discount: Grand total and tax are 0 when 100% discount is applied', async () => {
    let createdSaleData = null;
    const { service } = createMockService({
      tx: {
        sale: {
          create: async (args) => {
            createdSaleData = args.data;
            return {
              id: 'sale-free',
              receiptNumber: 'REC-FREE',
              createdAt: new Date(),
              ...args.data,
              customer: null,
              store: { id: 'store-1', name: 'Main Store' },
              user: { id: 'user-1', name: 'Staff' },
              saleItems: [],
            };
          },
        },
        taxRate: {
          findMany: async () => [
            { id: 'tax-1', code: 'GST10', ratePercent: 10, isDefault: true, isActive: true },
          ],
        },
      },
    });

    const result = await service.createSale('tenant-1', 'user-1', {
      paymentMethod: 'CASH',
      overallDiscount: 100,
      overallDiscountType: 'PERCENT',
      items: [{ productId: 'prod-1', quantity: 2, unitPrice: 100 }],
    });

    assert.equal(result.success, true);
    assert.equal(Number(createdSaleData.totalAmount), 0, 'Grand total must be 0 with 100% order discount');
    assert.equal(Number(createdSaleData.taxAmount), 0, 'Tax must be proportionally scaled to 0');
  });

  test('5. Rejects checkout if cart items array is empty', async () => {
    const { service } = createMockService();

    await assert.rejects(
      async () => {
        await service.createSale('tenant-1', 'user-1', {
          paymentMethod: 'CASH',
          items: [],
        });
      },
      {
        name: 'BadRequestException',
        message: 'Sale cart must contain at least one medicine item',
      },
    );
  });
});
