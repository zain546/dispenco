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

  test('6. Returns: Proportionally deducts overall bill discount from item refund so refund never exceeds paid total', async () => {
    let recordedReturnData = null;
    const { service } = createMockService({
      tx: {
        sale: {
          findFirst: async () => ({
            id: 'sale-disc-1',
            receiptNumber: 'REC-DISC-01',
            status: 'COMPLETED',
            totalAmount: 800,
            discountAmount: 200, // Rs 200 overall bill discount on Rs 1000 gross
            taxAmount: 0,
            customerId: null,
            customer: null,
            saleItems: [
              {
                id: 'si-1',
                batchId: 'batch-1',
                quantity: 2,
                stockDeducted: 2,
                unitPrice: 500, // 2 * 500 = 1000 gross
                discount: 0, // 0 item-level discount
                taxApplied: 0,
                returnItems: [],
                product: { id: 'prod-1', name: 'Augmentin' },
                batch: { id: 'batch-1', batchNumber: 'B-01' },
              },
            ],
          }),
        },
        return: {
          create: async (args) => {
            recordedReturnData = args.data;
            return {
              id: 'ret-1',
              returnNumber: 'RET-001',
              ...args.data,
              sale: { id: 'sale-disc-1', storeId: 'store-1' },
            };
          },
        },
      },
    });

    await service.createReturn('tenant-1', 'user-1', {
      saleId: 'sale-disc-1',
      reason: 'Customer changed mind',
      refundMethod: 'CASH',
      items: [{ saleItemId: 'si-1', quantity: 1 }], // Returning 1 of 2 units
    });

    assert.equal(
      Number(recordedReturnData.refundAmount),
      400,
      'Returning 50% of a Rs. 800 net sale (Rs. 1000 gross - Rs. 200 overall discount) must refund Rs. 400, not Rs. 500',
    );
  });

  test('7. Returns: Rejects CREDIT (Khata) refund method for a walk-in sale without a registered customer account', async () => {
    const { service } = createMockService({
      tx: {
        sale: {
          findFirst: async () => ({
            id: 'sale-walkin-1',
            receiptNumber: 'REC-WALKIN-01',
            status: 'COMPLETED',
            totalAmount: 500,
            discountAmount: 0,
            taxAmount: 0,
            customerId: null,
            customer: null,
            saleItems: [
              {
                id: 'si-1',
                batchId: 'batch-1',
                quantity: 1,
                stockDeducted: 1,
                unitPrice: 500,
                discount: 0,
                taxApplied: 0,
                returnItems: [],
                product: { id: 'prod-1', name: 'Panadol' },
                batch: { id: 'batch-1', batchNumber: 'B-01' },
              },
            ],
          }),
        },
      },
    });

    await assert.rejects(
      async () => {
        await service.createReturn('tenant-1', 'user-1', {
          saleId: 'sale-walkin-1',
          reason: 'Defective',
          refundMethod: 'CREDIT',
          items: [{ saleItemId: 'si-1', quantity: 1 }],
        });
      },
      {
        name: 'BadRequestException',
        message:
          'Cannot issue a Khata credit adjustment for a walk-in sale without a registered customer account.',
      },
    );
  });

  test('8. Returns: Consolidates duplicate saleItemId entries in request payload to prevent exceeding max returnable', async () => {
    const { service } = createMockService({
      tx: {
        sale: {
          findFirst: async () => ({
            id: 'sale-dup-1',
            receiptNumber: 'REC-DUP-01',
            status: 'COMPLETED',
            totalAmount: 100,
            discountAmount: 0,
            taxAmount: 0,
            customerId: null,
            customer: null,
            saleItems: [
              {
                id: 'si-1',
                batchId: 'batch-1',
                quantity: 1,
                stockDeducted: 1,
                unitPrice: 100,
                discount: 0,
                taxApplied: 0,
                returnItems: [],
                product: { id: 'prod-1', name: 'Panadol' },
                batch: { id: 'batch-1', batchNumber: 'B-01' },
              },
            ],
          }),
        },
      },
    });

    await assert.rejects(
      async () => {
        await service.createReturn('tenant-1', 'user-1', {
          saleId: 'sale-dup-1',
          reason: 'Duplicate payload test',
          refundMethod: 'CASH',
          items: [
            { saleItemId: 'si-1', quantity: 1 },
            { saleItemId: 'si-1', quantity: 1 },
          ],
        });
      },
      /Cannot return 2 units of Panadol\. Max returnable: 1/,
    );
  });
});
