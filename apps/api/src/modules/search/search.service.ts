import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meilisearch, Index } from 'meilisearch';
import { PrismaService } from '../prisma/prisma.service';
import { PHARMA_SYNONYMS } from './synonyms.constants';

export interface IndexedProductDoc {
  id: string;
  tenantId: string;
  name: string;
  genericName: string | null;
  category: string;
  unit: string;
  barcode: string | null;
  isControlledSubstance: boolean;
  isActive: boolean;
  lowStockThreshold: number;
  createdAt: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: Meilisearch | null = null;
  private productsIndex: Index<IndexedProductDoc> | null = null;
  private isConnected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.initMeilisearch();
  }

  /**
   * Initializes the Meilisearch client, configures index attributes, typo-tolerance, and synonyms
   */
  async initMeilisearch() {
    const host =
      this.configService.get<string>('MEILISEARCH_HOST') ||
      process.env.MEILISEARCH_HOST ||
      'http://localhost:7700';

    const apiKey =
      this.configService.get<string>('MEILISEARCH_API_KEY') ||
      process.env.MEILISEARCH_API_KEY ||
      'dispenco_master_key_must_be_at_least_16_bytes';

    try {
      this.client = new Meilisearch({ host, apiKey });
      const health = await this.client.health();

      if (health.status === 'available') {
        this.isConnected = true;
        this.logger.log(`Meilisearch connected successfully at ${host}`);

        // Get or create products index with 'id' primary key
        this.productsIndex = this.client.index<IndexedProductDoc>('products');

        // Apply index settings (searchable, filterable, typo tolerance, and pharma synonyms)
        await this.productsIndex.updateSettings({
          searchableAttributes: ['name', 'genericName', 'barcode', 'category'],
          filterableAttributes: ['tenantId', 'isActive', 'category', 'isControlledSubstance'],
          sortableAttributes: ['name', 'createdAt'],
          typoTolerance: {
            enabled: true,
            minWordSizeForTypos: {
              oneTypo: 4,
              twoTypos: 8,
            },
          },
          synonyms: PHARMA_SYNONYMS,
        });

        this.logger.log('Meilisearch settings & pharma synonyms dictionary configured');

        // Sync existing products from database in background
        this.syncAllProducts().catch((err) => {
          this.logger.warn(`Initial Meilisearch background sync error: ${err.message}`);
        });
      }
    } catch (err: unknown) {
      this.isConnected = false;
      this.logger.warn(
        `Meilisearch unavailable at ${host} (${(err as Error).message}). Search will use Postgres fallback.`,
      );
    }
  }

  /**
   * Check if Meilisearch search engine is active and reachable
   */
  get isEngineAvailable(): boolean {
    return this.isConnected && this.productsIndex !== null;
  }

  /**
   * Search for matching product IDs using typo-tolerant fuzzy search and synonyms
   */
  async searchProductIds(
    tenantId: string,
    query: string,
    options?: {
      category?: string;
      limit?: number;
    },
  ): Promise<{ productIds: string[]; isAvailable: boolean }> {
    if (!this.isEngineAvailable || !this.productsIndex || !query.trim()) {
      return { productIds: [], isAvailable: false };
    }

    try {
      const filters: string[] = [`tenantId = "${tenantId}"`, 'isActive = true'];
      if (options?.category) {
        filters.push(`category = "${options.category}"`);
      }

      const searchRes = await this.productsIndex.search(query.trim(), {
        filter: filters.join(' AND '),
        limit: options?.limit || 100,
        attributesToRetrieve: ['id'],
      });

      const productIds = searchRes.hits.map((h: any) => h.id as string);
      return { productIds, isAvailable: true };
    } catch (err: unknown) {
      this.logger.warn(`Meilisearch query failed: ${(err as Error).message}. Falling back to Postgres.`);
      return { productIds: [], isAvailable: false };
    }
  }

  /**
   * Index or update a single product document in Meilisearch
   */
  async indexProduct(product: {
    id: string;
    tenantId: string;
    name: string;
    genericName?: string | null;
    category: string;
    unit: string;
    barcode?: string | null;
    isControlledSubstance?: boolean;
    isActive?: boolean;
    lowStockThreshold?: number;
    createdAt?: Date | string;
  }) {
    if (!this.isEngineAvailable || !this.productsIndex) return;

    try {
      const doc: IndexedProductDoc = {
        id: product.id,
        tenantId: product.tenantId,
        name: product.name,
        genericName: product.genericName || null,
        category: product.category,
        unit: product.unit,
        barcode: product.barcode || null,
        isControlledSubstance: Boolean(product.isControlledSubstance),
        isActive: product.isActive !== undefined ? Boolean(product.isActive) : true,
        lowStockThreshold: product.lowStockThreshold ?? 10,
        createdAt: product.createdAt ? new Date(product.createdAt).getTime() : Date.now(),
      };

      await this.productsIndex.addDocuments([doc], { primaryKey: 'id' });
    } catch (err: unknown) {
      this.logger.warn(`Failed to index product ${product.id} in Meilisearch: ${(err as Error).message}`);
    }
  }

  /**
   * Delete product document from Meilisearch
   */
  async removeProduct(productId: string) {
    if (!this.isEngineAvailable || !this.productsIndex) return;

    try {
      await this.productsIndex.deleteDocument(productId);
    } catch (err: unknown) {
      this.logger.warn(`Failed to remove product ${productId} from Meilisearch: ${(err as Error).message}`);
    }
  }

  /**
   * Sync all products from database into Meilisearch
   */
  async syncAllProducts(tenantId?: string) {
    if (!this.isEngineAvailable || !this.productsIndex) {
      await this.initMeilisearch();
      if (!this.isEngineAvailable || !this.productsIndex) {
        return { success: false, message: 'Meilisearch engine is not reachable' };
      }
    }

    try {
      const products = await this.prisma.product.findMany({
        where: tenantId ? { tenantId } : {},
        select: {
          id: true,
          tenantId: true,
          name: true,
          genericName: true,
          category: true,
          unit: true,
          barcode: true,
          isControlledSubstance: true,
          isActive: true,
          lowStockThreshold: true,
          createdAt: true,
        },
      });

      const docs: IndexedProductDoc[] = products.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        name: p.name,
        genericName: p.genericName || null,
        category: p.category,
        unit: p.unit,
        barcode: p.barcode || null,
        isControlledSubstance: p.isControlledSubstance,
        isActive: p.isActive,
        lowStockThreshold: p.lowStockThreshold,
        createdAt: p.createdAt.getTime(),
      }));

      if (docs.length > 0) {
        await this.productsIndex.addDocuments(docs, { primaryKey: 'id' });
      }

      this.logger.log(`Synced ${docs.length} products to Meilisearch index`);
      return { success: true, count: docs.length };
    } catch (err: unknown) {
      this.logger.error(`Failed to sync products to Meilisearch: ${(err as Error).message}`);
      return { success: false, message: (err as Error).message };
    }
  }
}
