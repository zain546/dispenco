const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const productsServicePath = path.join(
  __dirname,
  '../src/modules/products/products.service.ts'
);
const queryKeysPath = path.join(
  __dirname,
  '../../web/src/lib/query-keys.ts'
);
const useInventoryQueriesPath = path.join(
  __dirname,
  '../../web/src/features/inventory/hooks/use-inventory-queries.ts'
);
const inventoryDashboardPath = path.join(
  __dirname,
  '../../web/src/features/inventory/components/inventory-dashboard.tsx'
);

test('ProductsService injects RedisCacheService and invalidates store inventory cache on mutations', () => {
  const source = fs.readFileSync(productsServicePath, 'utf8');

  assert.match(
    source,
    /private readonly cache: RedisCacheService/,
    'ProductsService must inject RedisCacheService'
  );

  const invalidationMatches = source.match(/this\.cache\.invalidateStoreInventory\(/g) || [];
  assert.ok(
    invalidationMatches.length >= 4,
    `Expected at least 4 cache invalidation calls (create, update, delete, confirmCsvImport), found ${invalidationMatches.length}`
  );
});

test('QueryKey factory includes filter params in inventory.aggregation and inventory.expiryRisk', () => {
  const source = fs.readFileSync(queryKeysPath, 'utf8');

  assert.match(
    source,
    /aggregation:\s*\(storeId\?:\s*string,\s*params\?:\s*Record<string,\s*unknown>\)\s*=>/,
    'queryKeys.inventory.aggregation must accept params to prevent tab cache key collisions'
  );

  assert.match(
    source,
    /expiryRisk:\s*\(storeId\?:\s*string,\s*params\?:\s*Record<string,\s*unknown>\s*\|\s*number\)\s*=>/,
    'queryKeys.inventory.expiryRisk must accept filter params'
  );
});

test('useInventoryAggregation and useExpiryRisk use keepPreviousData and pass filterParams to queryKeys', () => {
  const source = fs.readFileSync(useInventoryQueriesPath, 'utf8');

  assert.match(
    source,
    /queryKeys\.inventory\.aggregation\(storeId,\s*filterParams\)/,
    'useInventoryAggregation must pass filterParams to queryKeys.inventory.aggregation'
  );
  assert.match(
    source,
    /placeholderData:\s*keepPreviousData/,
    'Inventory query hooks must configure keepPreviousData for flicker-free tab switching'
  );
});

test('InventoryDashboard uses declarative useInventoryAggregation and contains zero raw color utilities', () => {
  const source = fs.readFileSync(inventoryDashboardPath, 'utf8');

  assert.match(
    source,
    /useInventoryAggregation\(/,
    'InventoryDashboard must use declarative useInventoryAggregation hook'
  );

  const rawColors = source.match(/(amber|rose|emerald|cyan)-[0-9]{2,3}/g);
  assert.equal(
    rawColors,
    null,
    `InventoryDashboard must not contain raw color classes, found: ${rawColors ? rawColors.join(', ') : 'none'}`
  );
});
