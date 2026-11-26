// Verify transactional email triggers on signup and Safepay payment settlement.
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true }, fileName: filename,
}).outputText, filename);
require('reflect-metadata');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { JwtService } = require('@nestjs/jwt');
const { AuthService } = require('../src/modules/auth/auth.service.ts');
const { SafepayService } = require('../src/modules/billing/safepay.service.ts');

describe('Transactional Email Triggers', () => {
  test('AuthService.signup dispatches welcome email without blocking response', async () => {
    const sent = [];
    const tx = {
      tenant: { create: async ({ data }) => ({ id: 'tenant-1', ...data }) },
      plan: { findUnique: async () => ({ id: 'plan-1', code: 'STARTER' }) },
      subscription: { create: async () => ({ id: 'sub-1' }) },
      store: { create: async ({ data }) => ({ id: 'store-1', ...data }) },
      role: { create: async ({ data }) => ({ id: `role-${data.name}`, ...data }) },
      permission: { findMany: async () => [] },
      rolePermission: { createMany: async () => ({ count: 0 }) },
      user: { create: async ({ data }) => ({ id: 'user-1', ...data }) },
      userRole: { create: async () => ({}) },
    };
    const prisma = {
      user: { findFirst: async () => null },
      permission: { findMany: async () => [], createMany: async () => ({ count: 0 }), upsert: async () => ({}) },
      $transaction: async (fn) => fn(tx),
    };
    const jwt = new JwtService({ secret: 'test-access-secret-at-least-thirty-two-characters' });
    const config = new ConfigService({
      JWT_SECRET: 'test-access-secret-at-least-thirty-two-characters',
      REFRESH_TOKEN_SECRET: 'different-test-refresh-secret-thirty-two-characters',
    });
    const notifications = {
      sendWelcomeEmail: async (to, ownerName, storeName) => {
        sent.push({ to, ownerName, storeName });
      },
    };
    const res = { cookie: () => {} };

    const auth = new AuthService(prisma, jwt, config, undefined, notifications);
    const result = await auth.signup(
      { email: 'owner@pharmacy.pk', password: 'StrongPassword123!', name: 'Haji Ali', storeName: 'Ali Medical' },
      res,
    );

    assert.equal(result.success, true);
    assert.deepEqual(sent, [{ to: 'owner@pharmacy.pk', ownerName: 'Haji Ali', storeName: 'Ali Medical' }]);
  });

  test('SafepayService.handleWebhook dispatches payment receipt on payment.completed', async () => {
    const receipts = [];
    const periodStart = new Date('2026-12-01T00:00:00Z');
    const periodEnd = new Date('2026-12-31T00:00:00Z');
    const prisma = {
      billingWebhookEvent: {
        findUnique: async () => null,
        upsert: async () => ({}),
        update: async () => ({}),
      },
      subscriptionInvoice: {
        findUnique: async () => ({
          id: 'inv-1',
          tenantId: 'tenant-1',
          invoiceNumber: 'INV-2026-100001',
          amountMinor: 150000,
          periodStart,
          periodEnd,
        }),
        update: async () => ({}),
      },
      user: {
        findFirst: async () => ({
          email: 'owner@pharmacy.pk',
          name: 'Haji Ali',
          tenant: { name: 'Ali Medical' },
        }),
      },
    };
    const subscriptionService = {
      extendSubscriptionPeriod: async () => ({}),
    };
    const notifications = {
      sendPaymentReceiptEmail: async (to, opts) => {
        receipts.push({ to, ...opts });
      },
    };

    const safepay = new SafepayService(new ConfigService({}), prisma, subscriptionService, notifications);
    const res = await safepay.handleWebhook('{}', undefined, {
      event: 'payment.completed',
      data: { tracker: 'track-1', reference: 'ref-1' },
    });
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(res.success, true);
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].to, 'owner@pharmacy.pk');
    assert.equal(receipts[0].invoiceNumber, 'INV-2026-100001');
    assert.equal(receipts[0].amountPkr, 1500);
    assert.equal(receipts[0].storeName, 'Ali Medical');
  });
});
