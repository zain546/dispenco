import {
  Injectable,
  Optional,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { CreatePurchaseOrderDto } from './dtos/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dtos/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dtos/receive-purchase-order.dto';
import { PurchaseOrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly cache?: RedisCacheService,
  ) {}

  private generateOrderNumber(): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PO-${dateStr}-${rand}`;
  }

  async createOrder(tenantId: string, dto: CreatePurchaseOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Purchase order must contain at least one product item');
    }

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${dto.supplierId}" not found`);
    }

    const store = await this.prisma.store.findFirst({
      where: { id: dto.storeId, tenantId, isActive: true },
    });

    if (!store) {
      throw new NotFoundException(`Active store with ID "${dto.storeId}" not found for this tenant`);
    }

    // Verify all items belong to this tenant to prevent cross-tenant IDOR
    const productIds = dto.items.map((i) => i.productId).filter(Boolean);
    if (productIds.length > 0) {
      const validProductsCount = await this.prisma.product.count({
        where: { id: { in: productIds }, tenantId },
      });
      if (validProductsCount !== productIds.length) {
        throw new BadRequestException('One or more selected products are invalid or belong to another organization');
      }
    }

    const totalCost = dto.items.reduce(
      (acc, item) => acc + item.expectedQuantity * item.unitCost,
      0,
    );

    const orderNumber = this.generateOrderNumber();

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        supplierId: dto.supplierId,
        orderNumber,
        status: PurchaseOrderStatus.PENDING,
        totalCost: new Prisma.Decimal(totalCost),
        notes: dto.notes || null,
        purchaseItems: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            expectedQuantity: item.expectedQuantity,
            unitCost: new Prisma.Decimal(item.unitCost),
          })),
        },
      },
      include: {
        supplier: true,
        store: true,
        purchaseItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (this.cache) {
      await this.cache.delByPattern(`purchases:${tenantId}:reorder:*`);
    }

    return {
      success: true,
      message: `Purchase Order ${orderNumber} created successfully`,
      data: purchaseOrder,
    };
  }

  async receiveOrder(
    tenantId: string,
    orderId: string,
    dto: ReceivePurchaseOrderDto,
  ) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        purchaseItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Purchase Order "${orderId}" not found`);
    }

    if (order.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('This purchase order has already been fully received');
    }

    if (order.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot receive stock against a cancelled purchase order');
    }

    const targetStoreId = order.storeId;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const result = await this.prisma.$transaction(async (tx) => {
      for (const itemDto of dto.items) {
        const item = order.purchaseItems.find(
          (i) => i.id === itemDto.purchaseItemId,
        );

        if (!item) {
          throw new BadRequestException(
            `Item ID "${itemDto.purchaseItemId}" does not belong to Purchase Order "${orderId}"`,
          );
        }

        const sellPrice = itemDto.sellPrice ?? Number(item.unitCost) * 1.25;

        // Create inventory batch if stock was received
        let batchId: string | null = null;
        if (itemDto.receivedQuantity > 0) {
          if (!itemDto.expiryDate) {
            throw new BadRequestException(
              `Expiry date is required for incoming stock intake`,
            );
          }
          const parsedExpiry = new Date(itemDto.expiryDate);
          if (isNaN(parsedExpiry.getTime())) {
            throw new BadRequestException(
              `Invalid expiry date format for item "${itemDto.purchaseItemId}"`,
            );
          }
          // Validate calendar-day validity (e.g. reject Feb 30 which normalizes to March 2)
          const dateParts = itemDto.expiryDate.split('T')[0].split('-');
          if (dateParts.length === 3) {
            const [y, m, d] = dateParts.map(Number);
            if (
              parsedExpiry.getUTCFullYear() !== y ||
              parsedExpiry.getUTCMonth() + 1 !== m ||
              parsedExpiry.getUTCDate() !== d
            ) {
              throw new BadRequestException(
                `Invalid calendar date "${itemDto.expiryDate}" for item "${itemDto.purchaseItemId}"`,
              );
            }
          }
          if (parsedExpiry < today) {
            throw new BadRequestException(
              `Expiry date cannot be in the past for incoming stock intake`,
            );
          }

          const batch = await tx.batch.create({
            data: {
              tenantId,
              storeId: order.storeId,
              productId: item.productId,
              batchNumber: itemDto.batchNumber.trim(),
              expiryDate: parsedExpiry,
              costPrice: item.unitCost,
              sellPrice: new Prisma.Decimal(sellPrice),
              quantityReceived: itemDto.receivedQuantity,
              quantityRemaining: itemDto.receivedQuantity,
            },
          });
          batchId = batch.id;
        }

        // Update purchase item record
        await tx.purchaseItem.update({
          where: { id: item.id },
          data: {
            receivedQuantity: { increment: itemDto.receivedQuantity },
            ...(batchId && { batchId }),
          },
        });
      }

      // Check updated items state to set status
      const updatedItems = await tx.purchaseItem.findMany({
        where: { purchaseOrderId: orderId },
      });

      const totalExpected = updatedItems.reduce(
        (acc, i) => acc + i.expectedQuantity,
        0,
      );
      const totalReceived = updatedItems.reduce(
        (acc, i) => acc + i.receivedQuantity,
        0,
      );

      let newStatus: PurchaseOrderStatus = PurchaseOrderStatus.PENDING;
      if (totalReceived >= totalExpected) {
        newStatus = PurchaseOrderStatus.RECEIVED;
      } else if (totalReceived > 0) {
        newStatus = PurchaseOrderStatus.PARTIAL;
      }

      const statusRes = await tx.purchaseOrder.updateMany({
        where: {
          id: orderId,
          tenantId,
          status: { in: [PurchaseOrderStatus.PENDING, PurchaseOrderStatus.PARTIAL] },
        },
        data: {
          status: newStatus,
          notes: dto.notes ? `${order.notes || ''}\n${dto.notes}`.trim() : order.notes,
        },
      });

      if (statusRes.count === 0) {
        throw new BadRequestException(
          'Cannot receive stock: Purchase order is no longer in PENDING or PARTIAL status',
        );
      }

      const updatedOrder = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          supplier: true,
          store: true,
          purchaseItems: {
            include: {
              product: true,
              batch: true,
            },
          },
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'PURCHASE_ORDER_RECEIVED',
          entityType: 'PurchaseOrder',
          entityId: orderId,
          metadata: {
            orderNumber: order.orderNumber,
            newStatus,
            totalReceived,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: `Shipment received for Purchase Order ${order.orderNumber}. Status updated to ${newStatus}.`,
        data: updatedOrder,
      };
    });

    if (this.cache) {
      await this.cache.invalidateStoreInventory(tenantId, targetStoreId);
      await this.cache.delByPattern(`purchases:${tenantId}:reorder:*`);
    }

    return result;
  }

  async findAll(tenantId: string, storeId?: string, status?: string, page?: number, limit?: number) {
    const where: any = { tenantId };
    const effectiveStoreId = storeId && storeId !== 'all' ? storeId : undefined;
    if (effectiveStoreId) {
      const store = await this.prisma.store.findFirst({
        where: { id: effectiveStoreId, tenantId, isActive: true },
      });
      if (!store) {
        throw new NotFoundException(`Active store with ID "${effectiveStoreId}" not found for this tenant`);
      }
      where.storeId = effectiveStoreId;
    }
    if (status && status in PurchaseOrderStatus) {
      where.status = status as PurchaseOrderStatus;
    }

    const take = limit ? Math.max(1, Math.min(200, Number(limit))) : 100;
    const skip = page ? (Math.max(1, Number(page)) - 1) * take : 0;

    const [total, orders] = await Promise.all([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          store: true,
          purchaseItems: {
            select: { id: true },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalCost: Number(o.totalCost),
        supplierName: o.supplier.name,
        storeName: o.store.name,
        itemCount: o.purchaseItems.length,
        notes: o.notes,
        createdAt: o.createdAt.toISOString(),
      })),
      meta: {
        total,
        page: page ? Number(page) : 1,
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  }

  async findOne(tenantId: string, orderId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        supplier: true,
        store: true,
        purchaseItems: {
          include: {
            product: true,
            batch: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Purchase Order "${orderId}" not found`);
    }

    return {
      success: true,
      data: order,
    };
  }

  async updateOrder(
    tenantId: string,
    orderId: string,
    dto: UpdatePurchaseOrderDto,
  ) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        purchaseItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Purchase Order "${orderId}" not found`);
    }

    if (order.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException(
        `Only PENDING purchase orders can be modified. This order is ${order.status}`,
      );
    }

    if (dto.items && dto.items.length === 0) {
      throw new BadRequestException(
        'Purchase order must contain at least one line item',
      );
    }

    // Verify tenant ownership to prevent cross-tenant IDOR
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });
      if (!supplier) {
        throw new NotFoundException(`Supplier with ID "${dto.supplierId}" not found`);
      }
    }

    if (dto.storeId) {
      const store = await this.prisma.store.findFirst({
        where: { id: dto.storeId, tenantId, isActive: true },
      });
      if (!store) {
        throw new NotFoundException(`Active store with ID "${dto.storeId}" not found for this tenant`);
      }
    }

    if (dto.items && dto.items.length > 0) {
      const productIds = dto.items.map((i) => i.productId).filter(Boolean);
      if (productIds.length > 0) {
        const validProductsCount = await this.prisma.product.count({
          where: { id: { in: productIds }, tenantId, isActive: true },
        });
        if (validProductsCount !== productIds.length) {
          throw new BadRequestException(
            'One or more selected products are invalid, inactive, or belong to another organization',
          );
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let newTotalCost = order.totalCost;

      if (dto.items && dto.items.length > 0) {
        const total = dto.items.reduce(
          (acc, item) => acc + item.expectedQuantity * item.unitCost,
          0,
        );
        newTotalCost = new Prisma.Decimal(total);
      }

      // Atomic row lock & status check: only proceed if status is still PENDING
      const lockRes = await tx.purchaseOrder.updateMany({
        where: { id: orderId, tenantId, status: PurchaseOrderStatus.PENDING },
        data: {
          ...(dto.storeId && { storeId: dto.storeId }),
          ...(dto.supplierId && { supplierId: dto.supplierId }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          totalCost: newTotalCost,
        },
      });

      if (lockRes.count === 0) {
        throw new BadRequestException(
          'Only PENDING purchase orders can be modified. This order status changed concurrently.',
        );
      }

      if (dto.items && dto.items.length > 0) {
        await tx.purchaseItem.deleteMany({
          where: { purchaseOrderId: orderId },
        });

        await tx.purchaseItem.createMany({
          data: dto.items.map((item) => ({
            purchaseOrderId: orderId,
            productId: item.productId,
            expectedQuantity: item.expectedQuantity,
            unitCost: new Prisma.Decimal(item.unitCost),
          })),
        });
      }

      return tx.purchaseOrder.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          supplier: true,
          store: true,
          purchaseItems: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    if (this.cache) {
      await this.cache.delByPattern(`purchases:${tenantId}:reorder:*`);
    }

    return {
      success: true,
      message: `Purchase Order ${order.orderNumber} updated successfully`,
      data: updated,
    };
  }

  async cancelOrder(tenantId: string, orderId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      throw new NotFoundException(`Purchase Order "${orderId}" not found`);
    }

    if (order.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException(
        `Only PENDING purchase orders can be cancelled. Current status is ${order.status}`,
      );
    }

    // Atomic update checking status === PENDING
    const updateRes = await this.prisma.purchaseOrder.updateMany({
      where: {
        id: orderId,
        tenantId,
        status: PurchaseOrderStatus.PENDING,
      },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
      },
    });

    if (updateRes.count === 0) {
      throw new BadRequestException(
        'Only PENDING purchase orders can be cancelled. Order status changed concurrently.',
      );
    }

    const cancelledOrder = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        supplier: true,
        store: true,
      },
    });

    if (this.cache) {
      await this.cache.delByPattern(`purchases:${tenantId}:reorder:*`);
    }

    return {
      success: true,
      message: `Purchase Order ${order.orderNumber} cancelled successfully`,
      data: cancelledOrder,
    };
  }

  /**
   * Step 4.2 — Smart Reorder Suggestions
   * Calculates dynamic reorder point, days until stockout, suggested order quantities,
   * and timing based on sales velocity, current stock, and supplier lead time.
   */
  async getReorderSuggestions(
    tenantId: string,
    options?: {
      storeId?: string;
      timeframeDays?: number;
      urgencyFilter?: string;
      search?: string;
      limit?: number;
    },
  ) {
    const effectiveStoreId = options?.storeId && options?.storeId !== 'all' ? options.storeId : undefined;
    const timeframeDays = Math.max(7, Math.min(180, Number(options?.timeframeDays) || 30));
    const search = options?.search?.trim()?.toLowerCase();
    const urgencyFilter = options?.urgencyFilter?.toUpperCase();
    const limit = Math.max(1, Math.min(500, Number(options?.limit) || 100));

    const searchKey = search ? encodeURIComponent(search) : 'null';
    const cacheKey = `purchases:${tenantId}:reorder:${effectiveStoreId || 'all'}:${timeframeDays}:${urgencyFilter || 'ALL'}:${searchKey}:${limit}`;

    const compute = async () => {
      // 1. Fetch active products
      const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { genericName: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        genericName: true,
        category: true,
        unit: true,
        barcode: true,
        lowStockThreshold: true,
        attributes: true,
      },
      orderBy: { name: 'asc' },
    });

    if (products.length === 0) {
      return {
        timeframeDays,
        summary: {
          totalProductsAnalyzed: 0,
          outOfStockCount: 0,
          criticalReordersCount: 0,
          reorderSoonCount: 0,
          upcomingCount: 0,
          adequateCount: 0,
          totalUnitsToOrder: 0,
          totalEstimatedCost: 0,
        },
        suggestions: [],
      };
    }

    const productIds = products.map((p) => p.id);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    // Parallelize independent data fetches across active batches, sales velocity, suppliers, and purchase history
    const [batches, salesAgg, activeSuppliers, recentPurchaseItems] = await Promise.all([
      // 2. Fetch active batches stock grouped by product
      this.prisma.batch.findMany({
        where: {
          tenantId,
          ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
          productId: { in: productIds },
          quantityRemaining: { gt: 0 },
        },
        select: {
          productId: true,
          costPrice: true,
          sellPrice: true,
          quantityRemaining: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // 3. Sales velocity over past timeframeDays
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          productId: { in: productIds },
          sale: {
            tenantId,
            ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
            status: { not: 'VOIDED' },
            createdAt: { gte: cutoffDate },
          },
        },
        _sum: {
          quantity: true,
        },
      }),
      // 4. Fetch default and active suppliers
      this.prisma.supplier.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          name: true,
          contactPhone: true,
          contactEmail: true,
          leadTimeDays: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      // 5. Fetch most recent purchase item per product using distinct to avoid scanning entire history
      this.prisma.purchaseItem.findMany({
        where: {
          productId: { in: productIds },
          purchaseOrder: { tenantId },
        },
        distinct: ['productId'],
        select: {
          productId: true,
          unitCost: true,
          purchaseOrder: {
            select: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                  contactPhone: true,
                  contactEmail: true,
                  leadTimeDays: true,
                },
              },
              createdAt: true,
            },
          },
        },
        orderBy: {
          purchaseOrder: {
            createdAt: 'desc',
          },
        },
      }),
    ]);

    const stockMap = new Map<string, number>();
    const latestCostMap = new Map<string, number>();
    const latestSellMap = new Map<string, number>();

    for (const b of batches) {
      const existingStock = stockMap.get(b.productId) || 0;
      stockMap.set(b.productId, existingStock + b.quantityRemaining);

      if (!latestCostMap.has(b.productId)) {
        latestCostMap.set(b.productId, Number(b.costPrice));
      }
      if (!latestSellMap.has(b.productId)) {
        latestSellMap.set(b.productId, Number(b.sellPrice));
      }
    }

    const salesMap = new Map<string, number>();
    for (const item of salesAgg) {
      salesMap.set(item.productId, item._sum.quantity || 0);
    }

    const defaultSupplier = activeSuppliers[0] || null;

    const supplierMap = new Map<
      string,
      { id: string; name: string; contactPhone: string | null; contactEmail: string | null; leadTimeDays: number; lastUnitCost: number }
    >();

    for (const pi of recentPurchaseItems) {
      if (!supplierMap.has(pi.productId) && pi.purchaseOrder.supplier) {
        supplierMap.set(pi.productId, {
          ...pi.purchaseOrder.supplier,
          lastUnitCost: Number(pi.unitCost),
        });
      }
    }

    // 5. Calculate Reorder Suggestions for every product
    const now = new Date();
    const safetyStockDays = 7;
    const targetCoverageDays = 14;

    const suggestions = products.map((product) => {
      const currentStock = stockMap.get(product.id) || 0;
      const totalUnitsSold = salesMap.get(product.id) || 0;
      const rawVelocity = totalUnitsSold / timeframeDays;
      const dailySalesVelocity = Math.round(rawVelocity * 100) / 100;

      const matchedSupplier = supplierMap.get(product.id) || defaultSupplier;
      const supplierId = matchedSupplier?.id || null;
      const supplierName = matchedSupplier?.name || 'Default Supplier';
      const supplierLeadTimeDays = matchedSupplier?.leadTimeDays ?? 3;

      const estimatedUnitCost =
        latestCostMap.get(product.id) ??
        supplierMap.get(product.id)?.lastUnitCost ??
        0;
      const estimatedUnitSellPrice = latestSellMap.get(product.id) ?? 0;

      const leadTimeDays = supplierLeadTimeDays;
      let daysUntilStockout: number;
      let estimatedStockoutDate: string | null = null;

      if (currentStock === 0) {
        daysUntilStockout = 0;
        estimatedStockoutDate = now.toISOString();
      } else if (dailySalesVelocity > 0) {
        daysUntilStockout = Math.floor(currentStock / dailySalesVelocity);
        const stockoutD = new Date();
        stockoutD.setDate(stockoutD.getDate() + daysUntilStockout);
        estimatedStockoutDate = stockoutD.toISOString();
      } else {
        daysUntilStockout = 999;
        estimatedStockoutDate = null;
      }

      // Dynamic Reorder Point
      const velocityReorderPoint = Math.ceil((leadTimeDays + safetyStockDays) * dailySalesVelocity);
      const reorderPoint = Math.max(product.lowStockThreshold, velocityReorderPoint);

      // Target Stock Level
      const velocityTargetStock = Math.ceil((targetCoverageDays + leadTimeDays) * dailySalesVelocity);
      const targetStockLevel = Math.max(product.lowStockThreshold * 2, velocityTargetStock);

      let suggestedQuantity = 0;
      if (currentStock <= reorderPoint) {
        suggestedQuantity = Math.max(0, targetStockLevel - currentStock);
        if (suggestedQuantity === 0 && currentStock === 0) {
          suggestedQuantity = Math.max(product.lowStockThreshold, 10);
        }
      }

      // Urgency Classification
      let urgencyLevel: 'OUT_OF_STOCK' | 'CRITICAL_REORDER' | 'REORDER_SOON' | 'UPCOMING' | 'ADEQUATE';
      let urgencyScore: number;
      let actionTitle: string;
      let reason: string;
      let recommendedOrderDate: string;

      if (currentStock === 0) {
        urgencyLevel = 'OUT_OF_STOCK';
        urgencyScore = 100;
        actionTitle = 'Immediate PO Placement';
        reason = `Completely out of stock! Lost revenue occurring daily. Supplier lead time is ${leadTimeDays} days.`;
        recommendedOrderDate = now.toISOString();
      } else if (daysUntilStockout <= leadTimeDays) {
        urgencyLevel = 'CRITICAL_REORDER';
        urgencyScore = 90;
        actionTitle = 'Critical Reorder (Stockout Imminent)';
        reason = `Stock will run out in ~${daysUntilStockout} days, which is less than supplier lead time (${leadTimeDays}d). Stockout will occur before delivery arrives unless ordered immediately!`;
        recommendedOrderDate = now.toISOString();
      } else if (currentStock <= reorderPoint) {
        urgencyLevel = 'REORDER_SOON';
        urgencyScore = 75;
        actionTitle = 'Place Purchase Order Now';
        reason = `Stock is at or below reorder threshold (${currentStock} <= ${reorderPoint}). Sells out in ~${daysUntilStockout} days.`;
        recommendedOrderDate = now.toISOString();
      } else if (currentStock <= Math.ceil(reorderPoint * 1.4)) {
        urgencyLevel = 'UPCOMING';
        urgencyScore = 40;
        actionTitle = 'Prepare Upcoming Order';
        const bufferDays = Math.max(1, daysUntilStockout - leadTimeDays);
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() + bufferDays);
        recommendedOrderDate = orderDate.toISOString();
        reason = `Stock healthy for now (~${daysUntilStockout}d). Recommended to place order around ${orderDate.toLocaleDateString()}.`;
      } else {
        urgencyLevel = 'ADEQUATE';
        urgencyScore = 10;
        actionTitle = 'Stock Level Adequate';
        reason = `Sufficient stock on hand (~${daysUntilStockout}d coverage). No replenishment needed at this time.`;
        const farDate = new Date();
        farDate.setDate(farDate.getDate() + Math.min(365, daysUntilStockout));
        recommendedOrderDate = farDate.toISOString();
      }

      const estimatedOrderCost = Math.round(suggestedQuantity * estimatedUnitCost * 100) / 100;

      return {
        productId: product.id,
        productName: product.name,
        genericName: product.genericName,
        category: product.category,
        unit: product.unit,
        barcode: product.barcode,
        lowStockThreshold: product.lowStockThreshold,
        currentStock,
        dailySalesVelocity,
        totalUnitsSoldInTimeframe: totalUnitsSold,
        timeframeDays,
        daysUntilStockout,
        estimatedStockoutDate,
        reorderPoint,
        targetStockLevel,
        suggestedQuantity,
        estimatedUnitCost,
        estimatedUnitSellPrice,
        estimatedOrderCost,
        urgencyLevel,
        urgencyScore,
        actionTitle,
        reason,
        recommendedOrderDate,
        supplier: {
          id: supplierId,
          name: supplierName,
          leadTimeDays,
          contactPhone: matchedSupplier?.contactPhone || null,
          contactEmail: matchedSupplier?.contactEmail || null,
        },
      };
    });

    // Summary metrics
    const summary = {
      totalProductsAnalyzed: suggestions.length,
      outOfStockCount: suggestions.filter((s) => s.urgencyLevel === 'OUT_OF_STOCK').length,
      criticalReordersCount: suggestions.filter(
        (s) => s.urgencyLevel === 'OUT_OF_STOCK' || s.urgencyLevel === 'CRITICAL_REORDER',
      ).length,
      reorderSoonCount: suggestions.filter((s) => s.urgencyLevel === 'REORDER_SOON').length,
      upcomingCount: suggestions.filter((s) => s.urgencyLevel === 'UPCOMING').length,
      adequateCount: suggestions.filter((s) => s.urgencyLevel === 'ADEQUATE').length,
      totalUnitsToOrder: suggestions
        .filter((s) => s.urgencyLevel !== 'ADEQUATE')
        .reduce((sum, s) => sum + s.suggestedQuantity, 0),
      totalEstimatedCost: Math.round(
        suggestions
          .filter((s) => s.urgencyLevel !== 'ADEQUATE')
          .reduce((sum, s) => sum + s.estimatedOrderCost, 0) * 100,
      ) / 100,
    };

    // Filter by urgency tier
    let filtered = suggestions;
    if (urgencyFilter && urgencyFilter !== 'ALL') {
      if (urgencyFilter === 'CRITICAL') {
        filtered = filtered.filter(
          (s) => s.urgencyLevel === 'OUT_OF_STOCK' || s.urgencyLevel === 'CRITICAL_REORDER',
        );
      } else if (urgencyFilter === 'REORDER_NEEDED' || urgencyFilter === 'ACTION_REQUIRED') {
        filtered = filtered.filter(
          (s) =>
            s.urgencyLevel === 'OUT_OF_STOCK' ||
            s.urgencyLevel === 'CRITICAL_REORDER' ||
            s.urgencyLevel === 'REORDER_SOON',
        );
      } else if (urgencyFilter === 'REORDER_SOON') {
        filtered = filtered.filter((s) => s.urgencyLevel === 'REORDER_SOON');
      } else if (urgencyFilter === 'UPCOMING') {
        filtered = filtered.filter((s) => s.urgencyLevel === 'UPCOMING');
      } else if (urgencyFilter === 'ADEQUATE') {
        filtered = filtered.filter((s) => s.urgencyLevel === 'ADEQUATE');
      }
    }

    // Sort by urgencyScore DESC, then daysUntilStockout ASC
    filtered.sort((a, b) => {
      if (b.urgencyScore !== a.urgencyScore) {
        return b.urgencyScore - a.urgencyScore;
      }
      return a.daysUntilStockout - b.daysUntilStockout;
    });

      return {
        timeframeDays,
        summary,
        suggestions: filtered.slice(0, limit),
      };
    };

    // Only cache if no dynamic search filter is applied to prevent cache key explosion
    if (this.cache && !search) {
      return this.cache.wrap(cacheKey, 120, compute);
    }
    return compute();
  }
}
