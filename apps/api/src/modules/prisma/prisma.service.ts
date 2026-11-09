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

    const seq = Number(rows[0]?.currentSeq) || 1;
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
