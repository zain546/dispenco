// Unit tests for pharmacy COGS & margin calculation across pack, loose unit, and catalog mismatch scenarios.
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

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { computeEffectiveUnitCost, computeSaleItemCost } = require('../src/common/utils/cogs.util.ts');

describe('COGS Accounting Guardrails (computeEffectiveUnitCost & computeSaleItemCost)', () => {
  test('1. Explicit loose UNIT sale divides batch pack cost by packSize', () => {
    const cost = computeSaleItemCost({
      quantity: 10,
      unitType: 'UNIT',
      stockDeducted: 1,
      unitPrice: 8,
      batch: { costPrice: 328, sellPrice: 400 },
      product: { unit: 'Box', attributes: { packSize: 50 } },
    });
    assert.equal(cost, 65.6); // 328 / 50 * 10 = 65.60
  });

  test('2. Explicit full BOX sale uses full batch cost even when discounted', () => {
    const cost = computeSaleItemCost({
      quantity: 2,
      unitType: 'BOX',
      stockDeducted: 2,
      unitPrice: 120, // heavily discounted box price
      batch: { costPrice: 200, sellPrice: 300 },
      product: { unit: 'Box', attributes: { packSize: 10 } },
    });
    assert.equal(cost, 400); // 2 full boxes * 200 = 400
  });

  test('3. Legacy PACK sale (stockDeducted=0) infers loose units when unitPrice matches 1/packSize MRP', () => {
    // Matches real production Bakin sale (packSize=30, batchCost=492, batchSell=600, sold 14 @ 20)
    const cost = computeSaleItemCost({
      quantity: 14,
      unitType: 'PACK',
      stockDeducted: 0,
      unitPrice: 20,
      batch: { costPrice: 492, sellPrice: 600 },
      product: { unit: 'Box', attributes: { packSize: 30 } },
    });
    assert.equal(cost, 229.6); // 492 / 30 * 14 = 229.60 (not 6,888!)
  });

  test('4. Pack-vs-Piece mismatch guardrail fixes box prices stored on Piece products (Dicloran 50mg & Inderal 10mg)', () => {
    // Real production case 1: tab Dicloran 50mg (packSize=1, batchCost=369, batchSell=450, sold 14 @ 15)
    const dicloranCost = computeSaleItemCost({
      quantity: 14,
      unitType: 'PACK',
      stockDeducted: 0,
      unitPrice: 15,
      batch: { costPrice: 369, sellPrice: 450 },
      product: { unit: 'Piece', attributes: { packSize: 1, dosageForm: 'Tablet' } },
    });
    assert.equal(dicloranCost, 172.2); // 369 / 30 * 14 = 172.20 (instead of 5,166.00!)

    // Real production case 2: Tab Inderal 10mg (packSize=1, batchCost=205, batchSell=250, sold 14 @ 5)
    const inderalCost = computeSaleItemCost({
      quantity: 14,
      unitType: 'BOX',
      stockDeducted: 14,
      unitPrice: 5,
      batch: { costPrice: 205, sellPrice: 250 },
      product: { unit: 'Piece', attributes: { packSize: 1, dosageForm: 'Tablet' } },
    });
    assert.equal(inderalCost, 57.4); // 205 / 50 * 14 = 57.40 (instead of 2,870.00!)
  });

  test('5. Preserves genuine below-cost or discounted single-item sales without false division', () => {
    // Real production case: syrup Mucaine (batchCost=226, batchSell=265, sold 1 @ 212)
    const mucaineUnitCost = computeEffectiveUnitCost({
      quantity: 1,
      unitType: 'PACK',
      unitPrice: 212,
      batch: { costPrice: 226, sellPrice: 265 },
      product: { unit: 'Bottle', attributes: { packSize: 1 } },
    });
    assert.equal(mucaineUnitCost, 226);

    // Real production case: syringe 3cc (batchCost=16.40, batchSell=20, sold 1 @ 10 — 50% discount, ratio=2 < 4)
    const syringeUnitCost = computeEffectiveUnitCost({
      quantity: 1,
      unitType: 'PACK',
      unitPrice: 10,
      batch: { costPrice: 16.4, sellPrice: 20 },
      product: { unit: 'Piece', attributes: { packSize: 1 } },
    });
    assert.equal(syringeUnitCost, 16.4);
  });
});
