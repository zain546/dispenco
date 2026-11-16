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
const { CustomersService } = require('../src/modules/customers/customers.service.ts');

describe('CustomersService - Khata Accounting & Financial Audit Guardrails', () => {
  const createMockService = (overrides = {}) => {
    const invalidatedCacheKeys = [];
    const mockCache = {
      del: async (key) => {
        invalidatedCacheKeys.push(key);
      },
      wrap: async (key, ttl, fn) => fn(),
      get: async () => null,
      set: async () => {},
      ...overrides.cache,
    };

    const mockPrisma = {
      customer: {
        create: async ({ data }) => ({
          id: 'cust-1',
          createdAt: new Date(),
          ...data,
        }),
        findFirst: async () => null,
        findMany: async () => [],
        count: async () => 0,
        aggregate: async () => ({ _sum: { creditBalance: 0 } }),
        delete: async () => ({ id: 'cust-1' }),
        update: async () => ({ id: 'cust-1' }),
        ...overrides.customer,
      },
      sale: {
        findMany: async () => [],
        ...overrides.sale,
      },
      payment: {
        findMany: async () => [],
        create: async ({ data }) => ({ id: 'pay-1', ...data }),
        ...overrides.payment,
      },
      return: {
        findMany: async () => [],
        ...overrides.return,
      },
      auditLog: {
        create: async () => ({ id: 'log-1' }),
      },
      $transaction: async (fn) =>
        fn({
          payment: {
            create: async ({ data }) => ({ id: 'pay-1', createdAt: new Date(), ...data }),
          },
          customer: {
            update: async ({ data }) => ({ id: 'cust-1', creditBalance: 500 }),
          },
          auditLog: {
            create: async () => ({ id: 'log-1' }),
          },
        }),
      ...overrides.prisma,
    };

    const service = new CustomersService(mockPrisma, mockCache);
    return { service, mockPrisma, mockCache, invalidatedCacheKeys };
  };

  test('1. Customer Creation invalidates summary cache and stores initial Khata balance', async () => {
    const { service, invalidatedCacheKeys } = createMockService();
    const created = await service.create('tenant-1', {
      name: 'Haji Abdul Rehman',
      phone: '0300 1234567',
      initialCreditBalance: 1500,
    });

    assert.equal(created.name, 'Haji Abdul Rehman');
    assert.equal(Number(created.creditBalance), 1500);
    assert.ok(invalidatedCacheKeys.includes('customers:summary:tenant-1'));
  });

  test('2. Customer Deletion Guard: Blocks deletion if customer has active Khata debt', async () => {
    const { service } = createMockService({
      customer: {
        findFirst: async () => ({
          id: 'cust-debt',
          tenantId: 'tenant-1',
          name: 'Ahmed',
          creditBalance: 2500,
          _count: { sales: 0, payments: 0 },
        }),
      },
    });

    await assert.rejects(
      async () => service.remove('tenant-1', 'cust-debt'),
      (err) => err.message.includes('active Khata credit balance of PKR 2,500'),
    );
  });

  test('3. Customer Deletion Guard: Blocks deletion if customer has active advance deposit', async () => {
    const { service } = createMockService({
      customer: {
        findFirst: async () => ({
          id: 'cust-adv',
          tenantId: 'tenant-1',
          name: 'Bilal',
          creditBalance: -1000,
          _count: { sales: 0, payments: 0 },
        }),
      },
    });

    await assert.rejects(
      async () => service.remove('tenant-1', 'cust-adv'),
      (err) => err.message.includes('active advance deposit balance of PKR 1,000'),
    );
  });

  test('4. Customer Deletion Guard: Blocks deletion if payment transaction history exists', async () => {
    const { service } = createMockService({
      customer: {
        findFirst: async () => ({
          id: 'cust-history',
          tenantId: 'tenant-1',
          name: 'Tariq',
          creditBalance: 0,
          _count: { sales: 0, payments: 3 },
        }),
      },
    });

    await assert.rejects(
      async () => service.remove('tenant-1', 'cust-history'),
      (err) => err.message.includes('3 recorded payment transactions'),
    );
  });

  test('5. Ledger Reconciliation: Ingests credit sales, payments, and credit returns into balanced statement', async () => {
    const saleDate = new Date('2026-11-01T10:00:00Z');
    const returnDate = new Date('2026-11-02T11:00:00Z');
    const paymentDate = new Date('2026-11-03T12:00:00Z');

    const { service } = createMockService({
      customer: {
        findFirst: async () => ({
          id: 'cust-1',
          tenantId: 'tenant-1',
          name: 'Farhan',
          phone: '03001234567',
          email: null,
          createdAt: new Date('2026-10-01T00:00:00Z'),
          creditBalance: 200, // 1000 (sale) - 300 (return) - 500 (payment) = 200
        }),
      },
      sale: {
        findMany: async () => [
          {
            id: 'sale-1',
            receiptNumber: 'REC-001',
            createdAt: saleDate,
            totalAmount: 1000,
            store: { name: 'Al-Shifa Branch' },
            saleItems: [{ product: { name: 'Augmentin 625mg' } }],
          },
        ],
      },
      payment: {
        findMany: async () => [
          {
            id: 'pay-1',
            amount: 500,
            saleId: null,
            method: 'CASH',
            gatewayRef: 'PAY-001',
            createdAt: paymentDate,
          },
        ],
      },
      return: {
        findMany: async () => [
          {
            id: 'ret-1',
            returnNumber: 'RET-001',
            refundAmount: 300,
            refundMethod: 'CREDIT',
            createdAt: returnDate,
            sale: { receiptNumber: 'REC-001' },
            returnItems: [{ saleItem: { product: { name: 'Augmentin 625mg' } } }],
          },
        ],
      },
    });

    const ledger = await service.getLedger('tenant-1', 'cust-1');

    assert.equal(ledger.summary.totalDebits, 1000);
    assert.equal(ledger.summary.totalCredits, 800); // 500 (payment) + 300 (credit return)
    assert.equal(ledger.summary.computedBalance, 200);
    assert.equal(ledger.summary.currentBalance, 200);
    assert.equal(ledger.entries.length, 3);

    // Verify chronological order: Sale (debit 1000, bal 1000) -> Return (credit 300, bal 700) -> Payment (credit 500, bal 200)
    assert.equal(ledger.entries[0].type, 'DEBIT_SALE');
    assert.equal(ledger.entries[0].balance, 1000);

    assert.equal(ledger.entries[1].type, 'CREDIT_PAYMENT');
    assert.equal(ledger.entries[1].method, 'CREDIT_NOTE');
    assert.equal(ledger.entries[1].credit, 300);
    assert.equal(ledger.entries[1].balance, 700);

    assert.equal(ledger.entries[2].type, 'CREDIT_PAYMENT');
    assert.equal(ledger.entries[2].credit, 500);
    assert.equal(ledger.entries[2].balance, 200);
  });

  test('6. Record Khata Payment: Atomically records repayment and invalidates summary cache', async () => {
    const { service, invalidatedCacheKeys } = createMockService({
      customer: {
        findFirst: async () => ({
          id: 'cust-1',
          name: 'Farhan',
          creditBalance: 1000,
        }),
      },
    });

    const res = await service.recordKhataPayment('tenant-1', 'cust-1', 'user-1', {
      amount: 500,
      method: 'CASH',
      notes: 'Counter payment',
    });

    assert.equal(res.success, true);
    assert.ok(invalidatedCacheKeys.includes('customers:summary:tenant-1'));
  });
});
