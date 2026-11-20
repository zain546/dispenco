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

const productBatchesModalPath = path.join(
  __dirname,
  '../../web/src/features/inventory/components/product-batches-modal.tsx'
);

const posTerminalPath = path.join(
  __dirname,
  '../../web/src/features/pos/components/pos-terminal.tsx'
);

test('ProductsService partitions active stock batches into non-expired sellable vs expired stock and prioritizes non-expired FEFO batch', () => {
  const source = fs.readFileSync(productsServicePath, 'utf8');

  assert.match(
    source,
    /nonExpiredBatches\s*=\s*activeStockBatches\.filter/,
    'nonExpiredBatches must be computed from activeStockBatches to exclude sold-out and expired batches'
  );
  assert.match(
    source,
    /expiredBatches\s*=\s*activeStockBatches\.filter/,
    'expiredBatches must be computed from activeStockBatches to avoid counting sold-out batches'
  );
  assert.match(
    source,
    /fefoBatch\s*=\s*nonExpiredBatches\[0\]\s*\|\|\s*activeStockBatches\[0\]/,
    'fefoBatch must prioritize earliest non-expired batch before falling back to expired stock'
  );
  assert.match(
    source,
    /sellableStock/,
    'ProductsService must expose sellableStock separately from totalStock'
  );
  assert.match(
    source,
    /expiredStock/,
    'ProductsService must expose expiredStock separately from totalStock'
  );
});

test('POSTerminal enforces hard dispensing lock for 100%-expired products and uses sellableStock', () => {
  const source = fs.readFileSync(posTerminalPath, 'utf8');

  assert.match(
    source,
    /checkDispenseBlocked/,
    'POSTerminal must define a centralized checkDispenseBlocked guard'
  );
  assert.match(
    source,
    /<span>Expired Stock<\/span>/,
    'POSTerminal must replace action buttons with a locked Expired Stock badge when all stock is expired'
  );
  assert.match(
    source,
    /expired on shelf/,
    'POSTerminal must surface a subtle shelf note when mixed-batch products have expired units excluded'
  );
});

test('ProductBatchesModal implements active vs depleted tabs, instant search, table view, pagination, and 1-click audited expired write-off', () => {
  const source = fs.readFileSync(productBatchesModalPath, 'utf8');

  assert.match(
    source,
    /stockTab.*active.*depleted/,
    'ProductBatchesModal must partition batches between active stock and depleted history'
  );
  assert.match(
    source,
    /viewMode.*cards.*table/,
    'ProductBatchesModal must support dual view modes (cards and high-density table)'
  );
  assert.match(
    source,
    /searchQuery/,
    'ProductBatchesModal must provide in-modal search across batch numbers, racks, and vendors'
  );
  assert.match(
    source,
    /pageSize\s*=\s*10/,
    'ProductBatchesModal must paginate batches to handle high-volume inventory lots'
  );
  assert.match(
    source,
    /<EditBatchModal/,
    'ProductBatchesModal must support inline batch editing without navigating away'
  );
  assert.match(
    source,
    /EXPIRED_WRITEOFF/,
    'ProductBatchesModal must support audited EXPIRED_WRITEOFF via adjustBatchStock'
  );
});
