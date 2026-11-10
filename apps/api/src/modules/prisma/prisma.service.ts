import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://dispenco_user:dispenco_password@localhost:5432/dispenco_db?schema=public';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Generates next sequence number atomically per tenant, type, and date key.
   * Clash-proof under high concurrency using Postgres ON CONFLICT DO UPDATE RETURNING.
   */
  async nextSequence(
    tenantId: string,
    type: 'RECEIPT' | 'RETURN' | 'TRANSFER' | 'PRESCRIPTION',
    dateKey: string = new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    txClient?: Prisma.TransactionClient,
  ): Promise<{ seq: number; formatted: string }> {
    const client = txClient || this;
    const rows = await client.$queryRawUnsafe<Array<{ currentSeq: number }>>(
      `INSERT INTO "DocumentSequence" ("id", "tenantId", "type", "dateKey", "currentSeq", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 1, NOW())
       ON CONFLICT ("tenantId", "type", "dateKey")
       DO UPDATE SET "currentSeq" = "DocumentSequence"."currentSeq" + 1, "updatedAt" = NOW()
       RETURNING "currentSeq";`,
      tenantId,
      type,
      dateKey,
    );

    let seq = Number(rows[0]?.currentSeq) || 1;

    // Cutover safety guard: if this sequence row was newly initialized at 1,
    // verify there isn't an existing legacy document for this dateKey with a >= sequence.
    if (seq === 1) {
      if (type === 'RECEIPT') {
        const existingMax = await client.$queryRawUnsafe<Array<{ maxSeq: number }>>(
          `SELECT COALESCE(MAX(CAST(NULLIF(SUBSTRING("receiptNumber" FROM 14), '') AS INTEGER)), 0) as "maxSeq"
           FROM "Sale"
           WHERE "tenantId" = $1 AND "receiptNumber" LIKE $2;`,
          tenantId,
          `REC-${dateKey}-%`,
        );
        const maxSeq = Number(existingMax[0]?.maxSeq || 0);
        if (maxSeq >= 1) {
          seq = maxSeq + 1;
          await client.$queryRawUnsafe(
            `UPDATE "DocumentSequence"
             SET "currentSeq" = $1, "updatedAt" = NOW()
             WHERE "tenantId" = $2 AND "type" = $3 AND "dateKey" = $4;`,
            seq,
            tenantId,
            type,
            dateKey,
          );
        }
      } else if (type === 'RETURN') {
        const existingMax = await client.$queryRawUnsafe<Array<{ maxSeq: number }>>(
          `SELECT COALESCE(MAX(CAST(NULLIF(SUBSTRING("returnNumber" FROM 14), '') AS INTEGER)), 0) as "maxSeq"
           FROM "Return"
           WHERE "tenantId" = $1 AND "returnNumber" LIKE $2;`,
          tenantId,
          `RET-${dateKey}-%`,
        );
        const maxSeq = Number(existingMax[0]?.maxSeq || 0);
        if (maxSeq >= 1) {
          seq = maxSeq + 1;
          await client.$queryRawUnsafe(
            `UPDATE "DocumentSequence"
             SET "currentSeq" = $1, "updatedAt" = NOW()
             WHERE "tenantId" = $2 AND "type" = $3 AND "dateKey" = $4;`,
            seq,
            tenantId,
            type,
            dateKey,
          );
        }
      }
    }

    const prefixMap: Record<string, string> = {
      RECEIPT: 'REC',
      RETURN: 'RET',
      TRANSFER: 'TRF',
      PRESCRIPTION: 'RX',
    };
    const prefix = prefixMap[type] || type;
    const pad = seq.toString().padStart(4, '0');
    return {
      seq,
      formatted: `${prefix}-${dateKey}-${pad}`,
    };
  }
}
