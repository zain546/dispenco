import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dtos/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dtos/receive-purchase-order.dto';
import { PurchaseOrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

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
      where: { id: dto.storeId, tenantId },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID "${dto.storeId}" not found`);
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

    return this.prisma.$transaction(async (tx) => {
      for (const itemDto of dto.items) {
        const item = order.purchaseItems.find(
          (i) => i.id === itemDto.purchaseItemId,
        );

        if (!item) {
          throw new BadRequestException(
            `Item ID "${itemDto.purchaseItemId}" does not belong to Purchase Order "${orderId}"`,
          );
        }

        const newReceivedQty = item.receivedQuantity + item.receivedQuantity;
        const sellPrice = itemDto.sellPrice ?? Number(item.unitCost) * 1.25;

        // Create inventory batch if stock was received
        let batchId: string | null = null;
        if (itemDto.receivedQuantity > 0) {
          const batch = await tx.batch.create({
            data: {
              tenantId,
              storeId: order.storeId,
              productId: item.productId,
              batchNumber: itemDto.batchNumber.trim(),
              expiryDate: new Date(itemDto.expiryDate),
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

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          notes: dto.notes ? `${order.notes || ''}\n${dto.notes}`.trim() : order.notes,
        },
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
  }

  async findAll(tenantId: string, storeId?: string, status?: string) {
    const where: any = { tenantId };
    if (storeId) where.storeId = storeId;
    if (status && status in PurchaseOrderStatus) {
      where.status = status as PurchaseOrderStatus;
    }

    const orders = await this.prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
}
