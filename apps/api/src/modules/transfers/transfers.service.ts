import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dtos/create-transfer.dto';
import { DispatchTransferDto } from './dtos/dispatch-transfer.dto';
import { ReceiveTransferDto } from './dtos/receive-transfer.dto';
import { QueryTransfersDto } from './dtos/query-transfers.dto';
import { TransferStatus, Prisma } from '@prisma/client';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateTransferNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `TRF-${dateStr}-`;

    const count = await this.prisma.stockTransfer.count({
      where: {
        tenantId,
        transferNumber: {
          startsWith: prefix,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  async createTransferRequest(
    tenantId: string,
    userId: string,
    dto: CreateTransferDto
  ) {
    if (dto.sourceStoreId === dto.targetStoreId) {
      throw new BadRequestException('Source and target store branches cannot be identical');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one medicine item must be requested');
    }

    // Verify both stores belong to this tenant and exist
    const [sourceStore, targetStore] = await Promise.all([
      this.prisma.store.findFirst({
        where: { id: dto.sourceStoreId, tenantId, isActive: true },
      }),
      this.prisma.store.findFirst({
        where: { id: dto.targetStoreId, tenantId, isActive: true },
      }),
    ]);

    if (!sourceStore) {
      throw new NotFoundException(`Source store branch not found or inactive`);
    }
    if (!targetStore) {
      throw new NotFoundException(`Target store branch not found or inactive`);
    }

    // Verify all products belong to this tenant
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more requested medicines could not be verified in the catalog');
    }

    const transferNumber = await this.generateTransferNumber(tenantId);

    const transfer = await this.prisma.stockTransfer.create({
      data: {
        tenantId,
        transferNumber,
        sourceStoreId: dto.sourceStoreId,
        targetStoreId: dto.targetStoreId,
        requestedByUserId: userId,
        status: TransferStatus.REQUESTED,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantityRequested: item.quantityRequested,
          })),
        },
      },
      include: {
        sourceStore: { select: { id: true, name: true } },
        targetStore: { select: { id: true, name: true } },
        requestedByUser: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, genericName: true, unit: true, category: true } },
          },
        },
      },
    });

    // Record audit log entry
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'STOCK_TRANSFER_REQUESTED',
        entityType: 'StockTransfer',
        entityId: transfer.id,
        metadata: {
          transferNumber,
          sourceStoreId: dto.sourceStoreId,
          targetStoreId: dto.targetStoreId,
          itemCount: dto.items.length,
        },
      },
    });

    return {
      success: true,
      message: `Stock transfer request ${transferNumber} created successfully`,
      data: transfer,
    };
  }

  async findAllTransfers(tenantId: string, query: QueryTransfersDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StockTransferWhereInput = {
      tenantId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.storeId) {
      if (query.direction === 'incoming') {
        where.targetStoreId = query.storeId;
      } else if (query.direction === 'outgoing') {
        where.sourceStoreId = query.storeId;
      } else {
        where.OR = [
          { sourceStoreId: query.storeId },
          { targetStoreId: query.storeId },
        ];
      }
    }

    const [transfers, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sourceStore: { select: { id: true, name: true } },
          targetStore: { select: { id: true, name: true } },
          requestedByUser: { select: { id: true, name: true, email: true } },
          dispatchedByUser: { select: { id: true, name: true } },
          receivedByUser: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, genericName: true, unit: true, category: true } },
              batch: { select: { id: true, batchNumber: true, expiryDate: true } },
            },
          },
        },
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return {
      success: true,
      data: transfers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneTransfer(tenantId: string, transferId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id: transferId, tenantId },
      include: {
        sourceStore: { select: { id: true, name: true, address: true, currency: true } },
        targetStore: { select: { id: true, name: true, address: true, currency: true } },
        requestedByUser: { select: { id: true, name: true, email: true } },
        dispatchedByUser: { select: { id: true, name: true, email: true } },
        receivedByUser: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, genericName: true, unit: true, category: true } },
            batch: { select: { id: true, batchNumber: true, expiryDate: true, costPrice: true, sellPrice: true } },
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException(`Stock transfer #${transferId} not found`);
    }

    return {
      success: true,
      data: transfer,
    };
  }

  async dispatchTransfer(
    tenantId: string,
    userId: string,
    transferId: string,
    dto: DispatchTransferDto
  ) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id: transferId, tenantId },
      include: { items: true },
    });

    if (!transfer) {
      throw new NotFoundException(`Stock transfer #${transferId} not found`);
    }

    if (transfer.status !== TransferStatus.REQUESTED) {
      throw new BadRequestException(
        `Transfer cannot be dispatched because its current status is ${transfer.status}`
      );
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('You must provide batch allocation details for dispatch');
    }

    return await this.prisma.$transaction(async (tx) => {
      for (const dispatchItem of dto.items) {
        const transferItem = transfer.items.find((i) => i.id === dispatchItem.itemId);
        if (!transferItem) {
          throw new BadRequestException(`Transfer item ID ${dispatchItem.itemId} is invalid`);
        }

        // Validate source batch exists and belongs to source store
        const batch = await tx.batch.findFirst({
          where: {
            id: dispatchItem.batchId,
            tenantId,
            storeId: transfer.sourceStoreId,
            productId: transferItem.productId,
          },
        });

        if (!batch) {
          throw new NotFoundException(
            `Selected batch ID ${dispatchItem.batchId} does not exist at source store branch`
          );
        }

        if (batch.quantityRemaining < dispatchItem.quantitySent) {
          throw new BadRequestException(
            `Insufficient stock in batch ${batch.batchNumber}: requested ${dispatchItem.quantitySent}, available ${batch.quantityRemaining}`
          );
        }

        // Deduct quantity from source batch
        await tx.batch.update({
          where: { id: batch.id },
          data: {
            quantityRemaining: {
              decrement: dispatchItem.quantitySent,
            },
          },
        });

        // Update transfer line item with dispatched details
        await tx.stockTransferItem.update({
          where: { id: transferItem.id },
          data: {
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            costPrice: batch.costPrice,
            sellPrice: batch.sellPrice,
            quantitySent: dispatchItem.quantitySent,
          },
        });
      }

      // Update transfer status to DISPATCHED
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.DISPATCHED,
          dispatchedByUserId: userId,
          dispatchedAt: new Date(),
          notes: dto.notes ? `${transfer.notes ? transfer.notes + ' | ' : ''}${dto.notes}` : transfer.notes,
        },
        include: {
          items: {
            include: { product: true, batch: true },
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'STOCK_TRANSFER_DISPATCHED',
          entityType: 'StockTransfer',
          entityId: transfer.id,
          metadata: {
            transferNumber: transfer.transferNumber,
            dispatchedItemCount: dto.items.length,
          },
        },
      });

      return {
        success: true,
        message: `Transfer ${transfer.transferNumber} dispatched and stock deducted from source branch`,
        data: updatedTransfer,
      };
    });
  }

  async receiveTransfer(
    tenantId: string,
    userId: string,
    transferId: string,
    dto: ReceiveTransferDto
  ) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id: transferId, tenantId },
      include: { items: true },
    });

    if (!transfer) {
      throw new NotFoundException(`Stock transfer #${transferId} not found`);
    }

    if (transfer.status !== TransferStatus.DISPATCHED) {
      throw new BadRequestException(
        `Transfer cannot be received because its current status is ${transfer.status}`
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      for (const receiveItem of dto.items) {
        const transferItem = transfer.items.find((i) => i.id === receiveItem.itemId);
        if (!transferItem) {
          throw new BadRequestException(`Transfer item ID ${receiveItem.itemId} is invalid`);
        }

        if (receiveItem.quantityReceived < 0) {
          throw new BadRequestException('Received quantity cannot be negative');
        }

        // Update transfer item with quantity received
        await tx.stockTransferItem.update({
          where: { id: transferItem.id },
          data: {
            quantityReceived: receiveItem.quantityReceived,
          },
        });

        // If items were received, intake into target branch batch
        if (receiveItem.quantityReceived > 0 && transferItem.batchNumber && transferItem.expiryDate) {
          // Check if target store already has this batch number for this product
          const existingTargetBatch = await tx.batch.findFirst({
            where: {
              tenantId,
              storeId: transfer.targetStoreId,
              productId: transferItem.productId,
              batchNumber: transferItem.batchNumber,
            },
          });

          if (existingTargetBatch) {
            await tx.batch.update({
              where: { id: existingTargetBatch.id },
              data: {
                quantityReceived: { increment: receiveItem.quantityReceived },
                quantityRemaining: { increment: receiveItem.quantityReceived },
              },
            });
          } else {
            await tx.batch.create({
              data: {
                tenantId,
                storeId: transfer.targetStoreId,
                productId: transferItem.productId,
                batchNumber: transferItem.batchNumber,
                expiryDate: transferItem.expiryDate,
                costPrice: transferItem.costPrice || 0,
                sellPrice: transferItem.sellPrice || 0,
                quantityReceived: receiveItem.quantityReceived,
                quantityRemaining: receiveItem.quantityReceived,
              },
            });
          }
        }
      }

      // Mark transfer as RECEIVED
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.RECEIVED,
          receivedByUserId: userId,
          receivedAt: new Date(),
          notes: dto.notes ? `${transfer.notes ? transfer.notes + ' | ' : ''}${dto.notes}` : transfer.notes,
        },
        include: {
          items: {
            include: { product: true, batch: true },
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'STOCK_TRANSFER_RECEIVED',
          entityType: 'StockTransfer',
          entityId: transfer.id,
          metadata: {
            transferNumber: transfer.transferNumber,
            targetStoreId: transfer.targetStoreId,
          },
        },
      });

      return {
        success: true,
        message: `Transfer ${transfer.transferNumber} received and stock loaded into destination branch`,
        data: updatedTransfer,
      };
    });
  }

  async cancelTransfer(
    tenantId: string,
    userId: string,
    transferId: string,
    reason?: string
  ) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id: transferId, tenantId },
      include: { items: true },
    });

    if (!transfer) {
      throw new NotFoundException(`Stock transfer #${transferId} not found`);
    }

    if (transfer.status === TransferStatus.RECEIVED) {
      throw new BadRequestException('A completed transfer that has already been received cannot be cancelled');
    }

    if (transfer.status === TransferStatus.CANCELLED) {
      throw new BadRequestException('This stock transfer is already cancelled');
    }

    return await this.prisma.$transaction(async (tx) => {
      // If transfer was already dispatched, restore deducted stock to source batches!
      if (transfer.status === TransferStatus.DISPATCHED) {
        for (const item of transfer.items) {
          if (item.batchId && item.quantitySent && item.quantitySent > 0) {
            await tx.batch.update({
              where: { id: item.batchId },
              data: {
                quantityRemaining: {
                  increment: item.quantitySent,
                },
              },
            });
          }
        }
      }

      const updated = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.CANCELLED,
          notes: reason ? `${transfer.notes ? transfer.notes + ' | ' : ''}Cancellation: ${reason}` : transfer.notes,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'STOCK_TRANSFER_CANCELLED',
          entityType: 'StockTransfer',
          entityId: transfer.id,
          metadata: {
            transferNumber: transfer.transferNumber,
            previousStatus: transfer.status,
            restoredStock: transfer.status === TransferStatus.DISPATCHED,
            reason,
          },
        },
      });

      return {
        success: true,
        message: `Transfer ${transfer.transferNumber} cancelled${transfer.status === TransferStatus.DISPATCHED ? ' and stock restored to source branch' : ''}`,
        data: updated,
      };
    });
  }
}
