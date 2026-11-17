const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const purchasesServicePath = path.join(
  __dirname,
  '../src/modules/purchases/purchases.service.ts'
);
const queryKeysPath = path.join(
  __dirname,
  '../../web/src/lib/query-keys.ts'
);
const usePurchasesQueriesPath = path.join(
  __dirname,
  '../../web/src/features/purchases/hooks/use-purchases-queries.ts'
);
const reorderSuggestionsViewPath = path.join(
  __dirname,
  '../../web/src/features/purchases/components/reorder-suggestions-view.tsx'
);

test('PurchasesService blocks past expiry dates when checking in shipment stock batches', () => {
  const source = fs.readFileSync(purchasesServicePath, 'utf8');

  assert.match(
    source,
    /parsedExpiry\s*<\s*today/,
    'PurchasesService.receiveOrder must validate that incoming batch expiry dates are not in the past'
  );
  assert.match(
    source,
    /Expiry date cannot be in the past for incoming stock intake/,
    'Must throw a clear BadRequestException for past expiry dates'
  );
});

test('PurchasesService wraps getReorderSuggestions in Redis cache with 120s TTL and invalidates on PO create/receive', () => {
  const source = fs.readFileSync(purchasesServicePath, 'utf8');

  assert.match(
    source,
    /cacheKey\s*=\s*`purchases:\${tenantId}:reorder:/,
    'Must construct a scoped Redis cache key for predictive reorder suggestions'
  );
  assert.match(
    source,
    /this\.cache\.wrap\(cacheKey,\s*120,\s*compute\)/,
    'Must wrap reorder calculation in 120s Redis cache'
  );
  assert.match(
    source,
    /this\.cache\.delByPattern\(`purchases:\${tenantId}:reorder:\*`\)/,
    'Must invalidate reorder cache upon PO creation and shipment receipt'
  );
});

test('QueryKey factory includes purchases with hierarchical store scoping', () => {
  const source = fs.readFileSync(queryKeysPath, 'utf8');

  assert.match(
    source,
    /purchases:\s*\{/,
    'queryKeys must declare purchases factory'
  );
  assert.match(
    source,
    /suggestions:\s*\(storeId\?:\s*string,\s*params\?:\s*Record<string,\s*unknown>\)/,
    'queryKeys.purchases.suggestions must accept filter params'
  );
});

test('useReceivePurchaseOrder performs cross-module cache invalidation for inventory and reports', () => {
  const source = fs.readFileSync(usePurchasesQueriesPath, 'utf8');

  assert.match(
    source,
    /queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['purchases'\]\s*\}\)/,
    'Must invalidate purchases cache'
  );
  assert.match(
    source,
    /queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['inventory'\]\s*\}\)/,
    'Must invalidate inventory cache because new batches were added to stock'
  );
  assert.match(
    source,
    /queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['reports'\]\s*\}\)/,
    'Must invalidate reports cache'
  );
});

test('ReorderSuggestionsView contains zero raw Tailwind color utilities', () => {
  const source = fs.readFileSync(reorderSuggestionsViewPath, 'utf8');

  const rawColors = source.match(/(emerald|amber|rose|cyan)-[0-9]{2,3}/g);
  assert.equal(
    rawColors,
    null,
    `ReorderSuggestionsView must not contain raw color classes, found: ${rawColors ? rawColors.join(', ') : 'none'}`
  );
});

test('PurchasesService protects accounting immutability: allows update and cancel on PENDING only', () => {
  const source = fs.readFileSync(purchasesServicePath, 'utf8');

  // updateOrder check: extract updateOrder source independently
  const updateOrderMatch = source.match(/async\s+updateOrder\s*\([\s\S]*?\n\s{2}\}/);
  assert.ok(updateOrderMatch, 'PurchasesService must define updateOrder method');
  const updateOrderSource = updateOrderMatch[0];
  assert.match(
    updateOrderSource,
    /order\.status\s*!==\s*PurchaseOrderStatus\.PENDING/,
    'updateOrder must strictly guard against non-pending orders'
  );
  assert.match(
    updateOrderSource,
    /status:\s*PurchaseOrderStatus\.PENDING/,
    'updateOrder must atomically update only if status is PENDING'
  );

  // cancelOrder check: extract cancelOrder source independently
  const cancelOrderMatch = source.match(/async\s+cancelOrder\s*\([\s\S]*?\n\s{2}\}/);
  assert.ok(cancelOrderMatch, 'PurchasesService must define cancelOrder method');
  const cancelOrderSource = cancelOrderMatch[0];
  assert.match(
    cancelOrderSource,
    /order\.status\s*!==\s*PurchaseOrderStatus\.PENDING/,
    'cancelOrder must strictly guard against non-pending orders'
  );
  assert.match(
    cancelOrderSource,
    /status:\s*PurchaseOrderStatus\.CANCELLED/,
    'cancelOrder must update status to CANCELLED'
  );
});

test('PurchasesController exposes PATCH and POST cancel endpoints guarded with PURCHASES_CREATE permission', () => {
  const controllerPath = path.join(
    __dirname,
    '../src/modules/purchases/purchases.controller.ts'
  );
  const source = fs.readFileSync(controllerPath, 'utf8');

  assert.match(
    source,
    /@Patch\(':id'\)[\s\S]*?@RequirePermissions\(Permission\.PURCHASES_CREATE\)[\s\S]*?updateOrder\(/,
    'PurchasesController must expose PATCH :id guarded with PURCHASES_CREATE'
  );

  assert.match(
    source,
    /@Post\(':id\/cancel'\)[\s\S]*?@RequirePermissions\(Permission\.PURCHASES_CREATE\)[\s\S]*?cancelOrder\(/,
    'PurchasesController must expose POST :id/cancel guarded with PURCHASES_CREATE'
  );
});

test('PurchasesManager uses custom accessible ConfirmDialog rather than native browser window.confirm', () => {
  const purchasesManagerPath = path.join(
    __dirname,
    '../../web/src/features/purchases/components/purchases-manager.tsx'
  );
  const source = fs.readFileSync(purchasesManagerPath, 'utf8');

  assert.doesNotMatch(
    source,
    /window\.confirm/,
    'PurchasesManager must NOT use raw browser window.confirm'
  );

  assert.match(
    source,
    /import\s*\{\s*ConfirmDialog\s*\}\s*from\s*'@\/components\/ui\/confirm-dialog'/,
    'PurchasesManager must import ConfirmDialog'
  );

  assert.match(
    source,
    /<ConfirmDialog[\s\S]*?open=\{Boolean\(orderToCancel\)\}[\s\S]*?variant="destructive"/,
    'PurchasesManager must render ConfirmDialog for cancellation with destructive styling'
  );

  assert.match(
    source,
    /case\s*'CANCELLED':[\s\S]*?variant="destructive"[\s\S]*?CANCELLED/,
    'getStatusBadge must render destructive badge for CANCELLED orders'
  );

  assert.match(
    source,
    /selectedOrder\?\.status\s*===\s*'CANCELLED'[\s\S]*?This purchase order (?:has been|was) cancelled/,
    'PurchasesManager must render cancellation notice banner in details modal'
  );

  assert.match(
    source,
    /selectedOrder\?\.status\s*===\s*'CANCELLED'[\s\S]*?Order Voided/,
    'PurchasesManager must render Order Voided badge for cancelled order line items'
  );
});

test('PurchasesManager decouples Receive Stock and Details button loading states and memoizes order computations', () => {
  const purchasesManagerPath = path.join(
    __dirname,
    '../../web/src/features/purchases/components/purchases-manager.tsx'
  );
  const source = fs.readFileSync(purchasesManagerPath, 'utf8');

  // Verify decoupled loading state with type tag
  assert.match(
    source,
    /fetchingAction\?\.id\s*===\s*po\.id\s*&&\s*fetchingAction\?\.type\s*===\s*'receive'/,
    'Receive button must only show spinner for its own receive action'
  );

  assert.match(
    source,
    /fetchingAction\?\.id\s*===\s*po\.id\s*&&\s*fetchingAction\?\.type\s*===\s*'details'/,
    'Details button must only show spinner for its own details action'
  );

  // Verify computations are memoized
  assert.match(
    source,
    /const\s+calculatedTotalCost\s*=\s*useMemo\(/,
    'calculatedTotalCost must be memoized'
  );

  assert.match(
    source,
    /const\s+\{\s*totalDetailsExpected,\s*totalDetailsReceived,\s*detailsFulfillmentPercent,\s*detailsLineItemCount\s*\}\s*=\s*useMemo\(/,
    'Details fulfillment metrics must be memoized'
  );
});
