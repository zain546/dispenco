// Tenant isolation & cross-store boundary verification test suite
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true }, fileName: filename,
}).outputText, filename);
require('reflect-metadata');

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ProductsService } = require('../src/modules/products/products.service.ts');
const { CustomersService } = require('../src/modules/customers/customers.service.ts');
const { AuditExportService } = require('../src/modules/reports/services/audit-export.service.ts');

describe('Tenant Isolation Guardrails — Cross-Tenant Leakage Prevention', () => {
  const TENANT_A = 'tenant-pharmacy-a';
  const TENANT_B = 'tenant-pharmacy-b';

  test('ProductsService: cannot query, update, or delete products belonging to another tenant', async () => {
    let capturedWhere = null;
    const mockPrisma = {
      product: {
        findFirst: async ({ where }) => {
          capturedWhere = where;
          if (where.tenantId === TENANT_A) {
            return { id: 'prod-1', tenantId: TENANT_A, name: 'Panadol 500mg' };
          }
          return null;
        },
      },
    };

    const mockSearch = { indexProduct: async () => {}, removeProduct: async () => {} };
    const mockCache = { invalidateStoreInventory: async () => {}, get: async () => null, set: async () => {} };

    const service = new ProductsService(mockPrisma, mockSearch, mockCache);

    // Tenant B attempts to fetch Tenant A's product
    await assert.rejects(
      async () => service.getProductById(TENANT_B, 'prod-1'),
      /not found/i
    );
    assert.equal(capturedWhere.tenantId, TENANT_B, 'findFirst must enforce the requesting tenantId');
  });

  test('CustomersService (Khata): queries and statements are strictly isolated to requesting tenant', async () => {
    let capturedWhere = null;
    const mockPrisma = {
      customer: {
        findFirst: async ({ where }) => {
          capturedWhere = where;
          if (where.tenantId === TENANT_A) {
            return { id: 'cust-1', tenantId: TENANT_A, name: 'Ali Medical Customer' };
          }
          return null;
        },
      },
      sale: { findMany: async () => [] },
      payment: { findMany: async () => [] },
      return: { findMany: async () => [] },
    };

    const mockCache = { getOrSet: async (key, fn) => fn(), invalidateKhataCustomer: async () => {} };
    const service = new CustomersService(mockPrisma, mockCache);

    // Tenant B attempts to access Khata statement of Tenant A's customer
    await assert.rejects(
      async () => service.getLedger(TENANT_B, 'cust-1'),
      /not found/i
    );
    assert.equal(capturedWhere.tenantId, TENANT_B, 'Khata lookup must strictly enforce tenantId');
  });

  test('AuditExportService: audit logs cannot be exported or viewed by unauthorized tenant', async () => {
    let capturedTenantId = null;
    const mockPrisma = {
      auditLog: {
        findMany: async ({ where }) => {
          capturedTenantId = where.tenantId;
          return [];
        },
        count: async ({ where }) => {
          assert.equal(where.tenantId, TENANT_B);
          return 0;
        },
      },
    };

    const service = new AuditExportService(mockPrisma);
    await service.getAuditLogs(TENANT_B, { page: 1, limit: 10 });

    assert.equal(capturedTenantId, TENANT_B, 'Audit log queries must scope strictly to tenantId');
  });
});
