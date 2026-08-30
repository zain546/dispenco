import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://dispenco_user:dispenco_password@localhost:5432/dispenco_db?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting Pharmacy Database Seeding for ALL Tenants...');

  // Get all active Tenants in DB
  const tenants = await prisma.tenant.findMany({
    include: { stores: true },
  });

  if (tenants.length === 0) {
    const defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Al-Shifa Pharmacy',
        expiryAlertDays: 90,
        stores: {
          create: {
            name: 'Main Pharmacy Store',
            currency: 'PKR',
          },
        },
      },
      include: { stores: true },
    });
    tenants.push(defaultTenant);
  }

  const dummyProducts = [
    {
      name: 'Panadol Extra 500mg/65mg',
      genericName: 'Paracetamol + Caffeine',
      category: 'TABLET_CAPSULE',
      unit: 'Box',
      barcode: '8901234567891',
      isControlledSubstance: false,
      lowStockThreshold: 15,
      attributes: { dosageForm: 'Tablet', packSize: '10x10', strength: '500mg' },
      stock: 120,
      costPrice: 150.0,
      sellPrice: 180.0,
      expiryMonths: 18,
    },
    {
      name: 'Brufen 400mg Film-Coated',
      genericName: 'Ibuprofen',
      category: 'TABLET_CAPSULE',
      unit: 'Box',
      barcode: '8901234567892',
      isControlledSubstance: false,
      lowStockThreshold: 20,
      attributes: { dosageForm: 'Tablet', packSize: '25x10', strength: '400mg' },
      stock: 8, // Low Stock Trigger
      costPrice: 220.0,
      sellPrice: 260.0,
      expiryMonths: 24,
    },
    {
      name: 'Augmentin 625mg',
      genericName: 'Amoxicillin + Clavulanic Acid',
      category: 'TABLET_CAPSULE',
      unit: 'Pack',
      barcode: '8901234567893',
      isControlledSubstance: true, // Controlled / Rx
      lowStockThreshold: 10,
      attributes: { dosageForm: 'Tablet', packSize: '6x2', strength: '625mg' },
      stock: 45,
      costPrice: 480.0,
      sellPrice: 550.0,
      expiryMonths: 12,
    },
    {
      name: 'Hydryllin Cough Syrup 120ml',
      genericName: 'Aminophylline + Diphenhydramine',
      category: 'SYRUP_LIQUID',
      unit: 'Bottle',
      barcode: '8901234567894',
      isControlledSubstance: false,
      lowStockThreshold: 10,
      attributes: { bottleSize: '120ml', flavor: 'Cherry', requiresRefrigeration: false },
      stock: 30,
      costPrice: 110.0,
      sellPrice: 135.0,
      expiryMonths: 15,
    },
    {
      name: 'Rigix 10mg Anti-Allergic',
      genericName: 'Cetirizine Hydrochloride',
      category: 'TABLET_CAPSULE',
      unit: 'Box',
      barcode: '8901234567895',
      isControlledSubstance: false,
      lowStockThreshold: 12,
      attributes: { dosageForm: 'Tablet', packSize: '10x10', strength: '10mg' },
      stock: 90,
      costPrice: 160.0,
      sellPrice: 195.0,
      expiryMonths: 20,
    },
    {
      name: 'Risek 20mg Capsules',
      genericName: 'Omeprazole',
      category: 'TABLET_CAPSULE',
      unit: 'Box',
      barcode: '8901234567896',
      isControlledSubstance: false,
      lowStockThreshold: 25,
      attributes: { dosageForm: 'Capsule', packSize: '14s', strength: '20mg' },
      stock: 5, // Low Stock Trigger
      costPrice: 320.0,
      sellPrice: 380.0,
      expiryMonths: 16,
    },
    {
      name: 'Lantus SoloStar Pen 100u/ml',
      genericName: 'Insulin Glargine',
      category: 'INJECTION_INFUSION',
      unit: 'Vial',
      barcode: '8901234567897',
      isControlledSubstance: true,
      lowStockThreshold: 5,
      attributes: { vialVolume: '3ml', route: 'Subcutaneous', storageCondition: '2-8°C Refrigerated' },
      stock: 18,
      costPrice: 2100.0,
      sellPrice: 2450.0,
      expiryMonths: 8,
    },
    {
      name: 'Disprin Effervescent 300mg',
      genericName: 'Aspirin',
      category: 'TABLET_CAPSULE',
      unit: 'Box',
      barcode: '8901234567898',
      isControlledSubstance: false,
      lowStockThreshold: 10,
      attributes: { dosageForm: 'Tablet', packSize: '10x10', strength: '300mg' },
      stock: 65,
      costPrice: 75.0,
      sellPrice: 95.0,
      expiryMonths: 24,
    },
    {
      name: 'Digital Blood Pressure Monitor M2',
      genericName: 'Automated Sphygmomanometer',
      category: 'MEDICAL_DEVICE',
      unit: 'Piece',
      barcode: '8901234567899',
      isControlledSubstance: false,
      lowStockThreshold: 3,
      attributes: { deviceModel: 'OMRON M2', warrantyPeriod: '3 Years', powerSource: '4x AA Battery' },
      stock: 8,
      costPrice: 6500.0,
      sellPrice: 7800.0,
      expiryMonths: 60,
    },
    {
      name: 'N95 Respirator Protective Mask',
      genericName: 'Particulate Respirator',
      category: 'GENERAL_ITEM',
      unit: 'Pack',
      barcode: '8901234567900',
      isControlledSubstance: false,
      lowStockThreshold: 50,
      attributes: { material: 'Non-woven Polypropylene', isSterile: false, rackNumber: 'RACK-B4' },
      stock: 0, // Out of Stock Trigger
      costPrice: 45.0,
      sellPrice: 70.0,
      expiryMonths: 36,
    },
    {
      name: 'Normal Saline 0.9% 1000ml',
      genericName: 'Sodium Chloride IV Infusion',
      category: 'INJECTION_INFUSION',
      unit: 'Bottle',
      barcode: '8901234567901',
      isControlledSubstance: false,
      lowStockThreshold: 15,
      attributes: { vialVolume: '1000ml', route: 'Intravenous', storageCondition: 'Room Temp' },
      stock: 40,
      costPrice: 90.0,
      sellPrice: 120.0,
      expiryMonths: 14,
    },
    {
      name: 'Cac-1000 Plus Effervescent',
      genericName: 'Calcium + Vitamin C & D3',
      category: 'GENERAL_ITEM',
      unit: 'Tube',
      barcode: '8901234567902',
      isControlledSubstance: false,
      lowStockThreshold: 10,
      attributes: { packSize: '20 Tablets', flavor: 'Orange' },
      stock: 75,
      costPrice: 280.0,
      sellPrice: 340.0,
      expiryMonths: 22,
    },
  ];

  for (const tenant of tenants) {
    let store = tenant.stores[0];
    if (!store) {
      store = await prisma.store.create({
        data: {
          tenantId: tenant.id,
          name: 'Main Pharmacy Branch',
          currency: 'PKR',
        },
      });
    }

    console.log(` Seeding products for Tenant: ${tenant.name} (${tenant.id})...`);

    for (const item of dummyProducts) {
      let product = await prisma.product.findFirst({
        where: { tenantId: tenant.id, name: item.name },
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            tenantId: tenant.id,
            name: item.name,
            genericName: item.genericName,
            category: item.category,
            unit: item.unit,
            barcode: item.barcode,
            isControlledSubstance: item.isControlledSubstance,
            lowStockThreshold: item.lowStockThreshold,
            attributes: item.attributes as Prisma.InputJsonValue,
          },
        });
        console.log(`   Added Product: ${product.name}`);
      }

      if (product) {
        // Check existing batches count
        const existingBatches = await prisma.batch.count({
          where: { tenantId: tenant.id, productId: product.id },
        });

        // Seed 3 realistic FEFO batches if only 0 or 1 batch exists
        if (existingBatches <= 1) {
          const now = new Date();

          // 1. Near Expiry Batch (Expires in ~40 days)
          const nearExpiryDate = new Date();
          nearExpiryDate.setDate(now.getDate() + 40);

          // 2. Active Healthy Batch (Expires in ~18 months)
          const healthyExpiryDate = new Date();
          healthyExpiryDate.setMonth(now.getMonth() + (item.expiryMonths || 18));

          // 3. Expired Batch (Expired 25 days ago)
          const expiredDate = new Date();
          expiredDate.setDate(now.getDate() - 25);

          const randomSuffix = Math.floor(100 + Math.random() * 900);

          await prisma.batch.createMany({
            data: [
              {
                tenantId: tenant.id,
                storeId: store.id,
                productId: product.id,
                batchNumber: `BN-${randomSuffix}-NEAR`,
                expiryDate: nearExpiryDate,
                costPrice: new Prisma.Decimal(item.costPrice),
                sellPrice: new Prisma.Decimal(item.sellPrice),
                quantityReceived: 50,
                quantityRemaining: 35,
              },
              {
                tenantId: tenant.id,
                storeId: store.id,
                productId: product.id,
                batchNumber: `BN-${randomSuffix}-HLTH`,
                expiryDate: healthyExpiryDate,
                costPrice: new Prisma.Decimal(item.costPrice + 5),
                sellPrice: new Prisma.Decimal(item.sellPrice + 10),
                quantityReceived: 100,
                quantityRemaining: 85,
              },
              {
                tenantId: tenant.id,
                storeId: store.id,
                productId: product.id,
                batchNumber: `BN-${randomSuffix}-EXPD`,
                expiryDate: expiredDate,
                costPrice: new Prisma.Decimal(item.costPrice - 10),
                sellPrice: new Prisma.Decimal(item.sellPrice),
                quantityReceived: 30,
                quantityRemaining: 12,
              },
            ],
          });
          console.log(`   Seeded 3 FEFO Batches (Healthy, Near Expiry, Expired) for: ${product.name}`);
        }
      }
    }
  }

  console.log(' All Tenants Seeded Successfully!');
}

main()
  .catch((e) => {
    console.error(' Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
