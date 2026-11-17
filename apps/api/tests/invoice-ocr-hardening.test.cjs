const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ocrModalPath = path.join(
  __dirname,
  '../../web/src/features/purchases/components/ocr-invoice-modal.tsx'
);
const invoiceOcrServicePath = path.join(
  __dirname,
  '../src/modules/purchases/services/invoice-ocr.service.ts'
);

test('OcrInvoiceModal implements native drag-and-drop file ingestion', () => {
  const source = fs.readFileSync(ocrModalPath, 'utf8');

  assert.match(
    source,
    /onDragOver=\{handleDragOver\}/,
    'Must attach onDragOver handler to upload dropzone'
  );
  assert.match(
    source,
    /onDragLeave=\{handleDragLeave\}/,
    'Must attach onDragLeave handler to upload dropzone'
  );
  assert.match(
    source,
    /onDrop=\{handleDrop\}/,
    'Must attach onDrop handler to process dropped invoices'
  );
  assert.match(
    source,
    /25\s*\*\s*1024\s*\*\s*1024/,
    'Must enforce 25MB file size limit guardrail'
  );
});

test('OcrInvoiceModal supports dual actions: Load into Draft PO and Direct 1-Click PO Creation', () => {
  const source = fs.readFileSync(ocrModalPath, 'utf8');

  assert.match(
    source,
    /handleConfirmToDraft/,
    'Must provide handler to load extracted invoice items into PO creation draft'
  );
  assert.match(
    source,
    /handleDirectCreate/,
    'Must provide 1-click direct PO creation handler'
  );
  assert.match(
    source,
    /onDirectCreatePo/,
    'Must support direct PO creation prop'
  );
});

test('OcrInvoiceModal supports document preview toggling in review mode', () => {
  const source = fs.readFileSync(ocrModalPath, 'utf8');

  assert.match(
    source,
    /showDocumentPreview/,
    'Must have state for toggling document preview in review step'
  );
  assert.match(
    source,
    /Original Document Preview:/,
    'Must render document preview banner when toggled'
  );
});

test('InvoiceOcrService includes Postgres ILIKE fallback for robust catalog matching', () => {
  const source = fs.readFileSync(invoiceOcrServicePath, 'utf8');

  assert.match(
    source,
    /this\.prisma\.product\.findFirst\(\{/,
    'Must query PostgreSQL when Meilisearch does not find a match'
  );
  assert.match(
    source,
    /mode:\s*'insensitive'\s*as\s*const/,
    'Must use case-insensitive query mode'
  );
});

test('OcrInvoiceModal adheres to Dispenco design tokens with zero raw color utilities', () => {
  const source = fs.readFileSync(ocrModalPath, 'utf8');

  const rawColors = source.match(/(emerald|amber|rose|cyan)-[0-9]{2,3}/g);
  assert.equal(
    rawColors,
    null,
    `OcrInvoiceModal must not contain raw color classes, found: ${rawColors ? rawColors.join(', ') : 'none'}`
  );
});
