import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateSaleDto } from './dtos/create-sale.dto';
import { CreateReturnDto } from './dtos/create-return.dto';
import { QueryReturnsDto } from './dtos/query-returns.dto';
import { Prisma, DiscountType, PaymentMethod, PaymentStatus, SaleStatus } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async createSale(tenantId: string, userId: string, dto: CreateSaleDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Sale cart must contain at least one medicine item');
    }

    // Determine target store
    let targetStoreId = dto.storeId;
    if (targetStoreId) {
      const storeExists = await this.prisma.store.findFirst({
        where: { id: targetStoreId, tenantId, isActive: true },
      });
      if (!storeExists) {
        throw new NotFoundException(`Active store with ID "${targetStoreId}" not found for this tenant`);
      }
    } else {
      const defaultStore = await this.prisma.store.findFirst({
        where: { tenantId, isActive: true },
      });
      if (!defaultStore) {
        throw new NotFoundException('No active store found for this tenant');
      }
      targetStoreId = defaultStore.id;
    }

    // Execute atomic transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Customer linkage / creation if customer details provided
      let customerId = dto.customerId;
      if (!customerId && dto.customerName) {
        let existingCustomer = dto.customerPhone
          ? await tx.customer.findFirst({
              where: { tenantId, phone: dto.customerPhone.trim() },
            })
          : null;

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const newCust = await tx.customer.create({
            data: {
              tenantId,
              name: dto.customerName.trim(),
              phone: dto.customerPhone?.trim() || null,
            },
          });
          customerId = newCust.id;
        }
      }

      // 2. Generate unique human-readable Receipt Number per tenant
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const daySalesCount = await tx.sale.count({
        where: { tenantId },
      });
      const receiptSeq = (daySalesCount + 1).toString().padStart(4, '0');
      const receiptNumber = `REC-${todayStr}-${receiptSeq}`;

      let runningSubtotal = 0;
      let runningTaxTotal = 0;
      let runningDiscountTotal = 0;

      interface PreparedSaleItem {
        productId: string;
        batchId: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        discount: Prisma.Decimal;
        discountType: DiscountType;
        taxRate: Prisma.Decimal;
        taxApplied: Prisma.Decimal;
      }

      const preparedSaleItems: PreparedSaleItem[] = [];

      // 3. Process each item in cart via FEFO batch allocation
      for (const item of dto.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId },
        });

        if (!product) {
          throw new NotFoundException(`Medicine product with ID "${item.productId}" not found`);
        }

        // Determine effective tax rate percent for product from taxCode or item override
        let effectiveTaxRatePercent = item.taxRatePercent ?? 0;
        if (effectiveTaxRatePercent === 0 && product.taxCode) {
          const cleanCode = product.taxCode.toUpperCase().trim();
          const taxRateRecord = await tx.taxRate.findUnique({
            where: {
              tenantId_code: {
                tenantId,
                code: cleanCode,
              },
            },
          });

          if (taxRateRecord) {
            effectiveTaxRatePercent = Number(taxRateRecord.ratePercent);
          } else {
            switch (cleanCode) {
              case 'EXEMPT':
              case 'ZERO':
                effectiveTaxRatePercent = 0;
                break;
              case 'REDUCED_5':
              case 'REDUCED':
                effectiveTaxRatePercent = 5;
                break;
              case 'STANDARD':
              case 'GST_18':
              case 'DEFAULT':
                effectiveTaxRatePercent = 18;
                break;
              default:
                effectiveTaxRatePercent = 0;
            }
          }
        }

        const packSize = Number((product.attributes as Record<string, unknown>)?.packSize) || 1;
        const isSingleUnit = item.unitType === 'UNIT';
        const stockQuantityToDeduct = isSingleUnit
          ? Math.max(1, Math.ceil(item.quantity / packSize))
          : Math.max(1, Math.ceil(item.quantity));

        // FEFO batch allocation using current transaction client
        const fefoResult = await this.inventoryService.selectBatchesForSale(
          tenantId,
          item.productId,
          stockQuantityToDeduct,
          targetStoreId,
          false,
          tx,
        );

        // Deduct from selected FEFO batches
        for (const alloc of fefoResult.allocations) {
          // Decrement batch quantityRemaining
          await tx.batch.update({
            where: { id: alloc.batchId },
            data: {
              quantityRemaining: {
                decrement: alloc.quantityToDeduct,
              },
            },
          });

          // Determine item price (provided unitPrice or batch sell price converted for unit)
          const defaultBasePrice = isSingleUnit && packSize > 1 ? alloc.sellPrice / packSize : alloc.sellPrice;
          const unitPrice = item.unitPrice !== undefined ? item.unitPrice : defaultBasePrice;
          const itemSubtotal = unitPrice * item.quantity;

          // Item-level discount calculation
          let itemDiscount = 0;
          if (item.discount && item.discount > 0) {
            if (item.discountType === DiscountType.PERCENT) {
              itemDiscount = (itemSubtotal * item.discount) / 100;
            } else {
              // Flat discount split proportionally across allocations
              itemDiscount = Math.min(itemSubtotal, (item.discount / item.quantity) * alloc.quantityToDeduct);
            }
          }

          // Item-level tax calculation
          let itemTax = 0;
          if (effectiveTaxRatePercent > 0) {
            const taxableAmount = Math.max(0, itemSubtotal - itemDiscount);
            itemTax = (taxableAmount * effectiveTaxRatePercent) / 100;
          }

          runningSubtotal += itemSubtotal;
          runningDiscountTotal += itemDiscount;
          runningTaxTotal += itemTax;

          preparedSaleItems.push({
            productId: item.productId,
            batchId: alloc.batchId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(unitPrice),
            discount: new Prisma.Decimal(itemDiscount),
            discountType: item.discountType || DiscountType.FLAT,
            taxRate: new Prisma.Decimal(effectiveTaxRatePercent),
            taxApplied: new Prisma.Decimal(itemTax),
          });
        }
      }

      // Overall Sale level discount
      if (dto.overallDiscount && dto.overallDiscount > 0) {
        if (dto.overallDiscountType === DiscountType.PERCENT) {
          const addlDiscount = (runningSubtotal * dto.overallDiscount) / 100;
          runningDiscountTotal += addlDiscount;
        } else {
          runningDiscountTotal += dto.overallDiscount;
        }
      }

      const totalAmount = Math.max(0, runningSubtotal - runningDiscountTotal + runningTaxTotal);

      const paymentMethod = dto.paymentMethod || PaymentMethod.CASH;
      const isOnCredit = paymentMethod === PaymentMethod.CREDIT;

      if (isOnCredit && !customerId) {
        throw new BadRequestException('A registered customer must be selected to complete a sale on credit (Khata).');
      }

      // 4. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          tenantId,
          storeId: targetStoreId,
          userId,
          customerId,
          receiptNumber,
          totalAmount: new Prisma.Decimal(totalAmount),
          discountAmount: new Prisma.Decimal(runningDiscountTotal),
          taxAmount: new Prisma.Decimal(runningTaxTotal),
          status: isOnCredit ? SaleStatus.ON_CREDIT : SaleStatus.COMPLETED,
          saleItems: {
            create: preparedSaleItems,
          },
        },
        include: {
          saleItems: {
            include: {
              product: true,
              batch: true,
            },
          },
          customer: true,
          store: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 5. Update Customer Khata balance if sale is on credit
      if (isOnCredit && customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            creditBalance: {
              increment: new Prisma.Decimal(totalAmount),
            },
          },
        });
      }

      // 6. Create Payment Record if payment method provided
      await tx.payment.create({
        data: {
          tenantId,
          saleId: sale.id,
          customerId,
          amount: new Prisma.Decimal(totalAmount),
          method: paymentMethod,
          status: PaymentStatus.COMPLETED,
        },
      });

      return {
        success: true,
        message: `Sale completed successfully. Receipt: ${receiptNumber}`,
        sale: {
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          totalAmount: Number(sale.totalAmount),
          discountAmount: Number(sale.discountAmount),
          taxAmount: Number(sale.taxAmount),
          subtotal: Number(runningSubtotal),
          status: sale.status,
          createdAt: sale.createdAt.toISOString(),
          customerName: sale.customer?.name || null,
          paymentMethod,
          itemsCount: sale.saleItems.length,
          items: sale.saleItems.map((si) => ({
            id: si.id,
            productId: si.productId,
            productName: si.product.name,
            unit: si.product.unit,
            batchNumber: si.batch.batchNumber,
            quantity: si.quantity,
            unitPrice: Number(si.unitPrice),
            discount: Number(si.discount),
            taxApplied: Number(si.taxApplied),
            lineTotal: Number(si.unitPrice) * si.quantity - Number(si.discount) + Number(si.taxApplied),
          })),
        },
      };
    });
  }

  async getSaleById(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        tenantId,
        OR: [{ id: saleId }, { receiptNumber: saleId }],
      },
      include: {
        saleItems: {
          include: {
            product: true,
            batch: true,
            returnItems: true,
          },
        },
        customer: true,
        store: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        payments: true,
        returns: {
          include: {
            returnItems: {
              include: {
                saleItem: {
                  include: {
                    product: { select: { id: true, name: true } },
                  },
                },
              },
            },
            processedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID/Receipt "${saleId}" not found`);
    }

    return {
      success: true,
      sale: {
        id: sale.id,
        receiptNumber: sale.receiptNumber,
        totalAmount: Number(sale.totalAmount),
        discountAmount: Number(sale.discountAmount),
        taxAmount: Number(sale.taxAmount),
        status: sale.status,
        createdAt: sale.createdAt.toISOString(),
        customer: sale.customer
          ? {
              id: sale.customer.id,
              name: sale.customer.name,
              phone: sale.customer.phone,
            }
          : null,
        user: sale.user,
        store: {
          id: sale.store.id,
          name: sale.store.name,
          address: sale.store.address,
          currency: sale.store.currency,
          receiptFooter: sale.store.receiptFooter,
        },
        payment: sale.payments[0]
          ? {
              method: sale.payments[0].method,
              amount: Number(sale.payments[0].amount),
              status: sale.payments[0].status,
            }
          : null,
        returns: sale.returns.map((ret) => ({
          id: ret.id,
          returnNumber: ret.returnNumber,
          reason: ret.reason,
          notes: ret.notes,
          refundAmount: Number(ret.refundAmount),
          refundMethod: ret.refundMethod,
          createdAt: ret.createdAt.toISOString(),
          processedBy: ret.processedByUser?.name || 'Staff',
          itemsCount: ret.returnItems.length,
        })),
        items: sale.saleItems.map((si) => {
          const returnedQuantity = si.returnItems.reduce((acc, ri) => acc + ri.quantity, 0);
          const maxReturnable = Math.max(0, si.quantity - returnedQuantity);
          return {
            id: si.id,
            productId: si.productId,
            productName: si.product.name,
            unit: si.product.unit,
            batchNumber: si.batch.batchNumber,
            expiryDate: si.batch.expiryDate.toISOString(),
            quantity: si.quantity,
            returnedQuantity,
            maxReturnable,
            unitPrice: Number(si.unitPrice),
            discount: Number(si.discount),
            taxApplied: Number(si.taxApplied),
            lineTotal: Number(si.unitPrice) * si.quantity - Number(si.discount) + Number(si.taxApplied),
          };
        }),
      },
    };
  }

  async getRecentSales(tenantId: string, limit: number = 20, storeId?: string) {
    const effectiveStoreId = storeId && storeId !== 'all' ? storeId : undefined;
    if (effectiveStoreId) {
      const store = await this.prisma.store.findFirst({
        where: { id: effectiveStoreId, tenantId, isActive: true },
      });
      if (!store) {
        throw new NotFoundException(`Active store with ID "${effectiveStoreId}" not found for this tenant`);
      }
    }

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        user: { select: { name: true } },
        saleItems: { select: { id: true } },
        payments: { select: { method: true } },
      },
    });

    return {
      success: true,
      data: sales.map((s) => ({
        id: s.id,
        receiptNumber: s.receiptNumber,
        totalAmount: Number(s.totalAmount),
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        customerName: s.customer?.name || 'Walk-in Customer',
        cashierName: s.user?.name || 'Staff',
        itemsCount: s.saleItems.length,
        paymentMethod: s.payments[0]?.method || 'CASH',
      })),
    };
  }

  async voidSale(tenantId: string, userId: string, saleId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, tenantId },
        include: {
          saleItems: true,
        },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID "${saleId}" not found`);
      }

      if (sale.status === SaleStatus.VOIDED) {
        throw new BadRequestException(`Sale #${sale.receiptNumber} is already voided`);
      }

      // Restore quantityRemaining for each batch affected
      for (const item of sale.saleItems) {
        await tx.batch.update({
          where: { id: item.batchId },
          data: {
            quantityRemaining: {
              increment: item.quantity,
            },
          },
        });
      }

      // Revert customer credit balance if sale was on credit
      if (sale.status === SaleStatus.ON_CREDIT && sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            creditBalance: {
              decrement: sale.totalAmount,
            },
          },
        });
      }

      // Mark sale as VOIDED
      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: SaleStatus.VOIDED,
        },
      });

      // Write AuditLog entry
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'SALE_VOIDED',
          entityType: 'Sale',
          entityId: sale.id,
          metadata: {
            receiptNumber: sale.receiptNumber,
            totalAmount: Number(sale.totalAmount),
            reason: reason?.trim() || 'Voided by staff',
            voidedAt: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: `Sale #${sale.receiptNumber} has been successfully voided and inventory stock was restored.`,
        saleId: updatedSale.id,
        status: updatedSale.status,
      };
    });
  }

  /**
   * Step 3.8 — Return processing [transactional]
   * Atomically records Return and ReturnItems, increments batch inventory stock,
   * enforces return limits, calculates proportional refunds, reverts credit ledger,
   * and creates an AuditLog entry.
   */
  async createReturn(tenantId: string, userId: string, dto: CreateReturnDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item must be selected for return');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch sale with existing returns and items
      const sale = await tx.sale.findFirst({
        where: { id: dto.saleId, tenantId },
        include: {
          saleItems: {
            include: {
              returnItems: true,
              product: { select: { id: true, name: true, barcode: true, genericName: true } },
              batch: { select: { id: true, batchNumber: true } },
            },
          },
          customer: true,
        },
      });

      if (!sale) {
        throw new NotFoundException(`Sale transaction with ID "${dto.saleId}" not found`);
      }

      if (sale.status === SaleStatus.VOIDED) {
        throw new BadRequestException('Cannot process returns against a voided sale');
      }

      // 2. Validate return quantities and calculate proportional refund per item
      let totalRefund = 0;
      const preparedReturnItems: {
        saleItemId: string;
        batchId: string;
        quantity: number;
        unitPrice: number;
        refundAmount: number;
      }[] = [];

      for (const reqItem of dto.items) {
        const saleItem = sale.saleItems.find((si) => si.id === reqItem.saleItemId);
        if (!saleItem) {
          throw new BadRequestException(
            `Item "${reqItem.saleItemId}" does not belong to receipt #${sale.receiptNumber}`,
          );
        }

        const previouslyReturned = saleItem.returnItems.reduce(
          (acc, ri) => acc + ri.quantity,
          0,
        );
        const remainingReturnable = saleItem.quantity - previouslyReturned;

        if (reqItem.quantity > remainingReturnable) {
          throw new BadRequestException(
            `Cannot return ${reqItem.quantity} units of ${saleItem.product.name}. Max returnable: ${remainingReturnable} (Purchased: ${saleItem.quantity}, Already returned: ${previouslyReturned})`,
          );
        }

        // Proportional refund math: (unitPrice * quantity - discount + taxApplied) * (reqItem.quantity / originalQuantity)
        const lineGross = Number(saleItem.unitPrice) * saleItem.quantity;
        const lineDiscount = Number(saleItem.discount);
        const lineTax = Number(saleItem.taxApplied);
        const lineEffectiveTotal = Math.max(0, lineGross - lineDiscount + lineTax);

        const refundAmount =
          Math.round((lineEffectiveTotal * (reqItem.quantity / saleItem.quantity)) * 100) / 100;
        const unitRefund =
          reqItem.quantity > 0
            ? Math.round((refundAmount / reqItem.quantity) * 100) / 100
            : 0;

        totalRefund += refundAmount;

        preparedReturnItems.push({
          saleItemId: saleItem.id,
          batchId: saleItem.batchId,
          quantity: reqItem.quantity,
          unitPrice: unitRefund,
          refundAmount,
        });
      }

      totalRefund = Math.round(totalRefund * 100) / 100;

      // 3. Generate human-readable Return number
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const dayReturnsCount = await tx.return.count({
        where: { tenantId },
      });
      const returnSeq = (dayReturnsCount + 1).toString().padStart(4, '0');
      const returnNumber = `RET-${todayStr}-${returnSeq}`;

      const refundMethod =
        dto.refundMethod?.toUpperCase().trim() ||
        (sale.status === SaleStatus.ON_CREDIT ? 'CREDIT' : 'CASH');

      // 4. Create Return and ReturnItems
      const createdReturn = await tx.return.create({
        data: {
          tenantId,
          saleId: sale.id,
          processedByUserId: userId,
          returnNumber,
          reason: dto.reason.trim(),
          notes: dto.notes?.trim() || null,
          refundAmount: new Prisma.Decimal(totalRefund),
          refundMethod,
          returnItems: {
            create: preparedReturnItems.map((item) => ({
              saleItemId: item.saleItemId,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              refundAmount: new Prisma.Decimal(item.refundAmount),
            })),
          },
        },
        include: {
          returnItems: {
            include: {
              saleItem: {
                include: {
                  product: { select: { id: true, name: true, barcode: true, genericName: true } },
                  batch: { select: { id: true, batchNumber: true, expiryDate: true } },
                },
              },
            },
          },
          sale: {
            select: {
              id: true,
              receiptNumber: true,
              customerId: true,
              customer: true,
            },
          },
          processedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // 5. Restore batch stock quantity atomically
      for (const item of preparedReturnItems) {
        await tx.batch.update({
          where: { id: item.batchId },
          data: {
            quantityRemaining: {
              increment: item.quantity,
            },
          },
        });
      }

      // 6. Adjust customer credit balance if sale was on credit or refundMethod is CREDIT
      if (
        (sale.status === SaleStatus.ON_CREDIT || refundMethod === 'CREDIT') &&
        sale.customerId
      ) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            creditBalance: {
              decrement: new Prisma.Decimal(totalRefund),
            },
          },
        });
      }

      // 7. Write AuditLog entry
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'SALE_RETURN_PROCESSED',
          entityType: 'Return',
          entityId: createdReturn.id,
          metadata: {
            returnNumber,
            saleId: sale.id,
            receiptNumber: sale.receiptNumber,
            refundAmount: totalRefund,
            refundMethod,
            itemsCount: preparedReturnItems.length,
            reason: dto.reason,
          },
        },
      });

      return createdReturn;
    });
  }

  /**
   * Query return transactions with pagination, store filter, and search
   */
  async getReturns(tenantId: string, query: QueryReturnsDto) {
    const { storeId, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReturnWhereInput = {
      tenantId,
      ...(storeId && {
        sale: {
          storeId,
        },
      }),
      ...(search && {
        OR: [
          { returnNumber: { contains: search, mode: 'insensitive' } },
          { sale: { receiptNumber: { contains: search, mode: 'insensitive' } } },
          { sale: { customer: { name: { contains: search, mode: 'insensitive' } } } },
          { sale: { customer: { phone: { contains: search, mode: 'insensitive' } } } },
          { reason: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [returns, total] = await Promise.all([
      this.prisma.return.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sale: {
            select: {
              id: true,
              receiptNumber: true,
              totalAmount: true,
              createdAt: true,
              customer: {
                select: { id: true, name: true, phone: true },
              },
              store: {
                select: { id: true, name: true },
              },
            },
          },
          processedByUser: {
            select: { id: true, name: true, email: true },
          },
          returnItems: {
            include: {
              saleItem: {
                include: {
                  product: { select: { id: true, name: true, barcode: true, genericName: true } },
                  batch: { select: { id: true, batchNumber: true, expiryDate: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.return.count({ where }),
    ]);

    return {
      data: returns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get return details by ID
   */
  async getReturnById(tenantId: string, id: string) {
    const returnRecord = await this.prisma.return.findFirst({
      where: { id, tenantId },
      include: {
        sale: {
          include: {
            customer: true,
            store: true,
            saleItems: {
              include: {
                product: true,
                batch: true,
              },
            },
          },
        },
        processedByUser: {
          select: { id: true, name: true, email: true },
        },
        returnItems: {
          include: {
            saleItem: {
              include: {
                product: { select: { id: true, name: true, barcode: true, genericName: true } },
                batch: { select: { id: true, batchNumber: true, expiryDate: true } },
              },
            },
          },
        },
      },
    });

    if (!returnRecord) {
      throw new NotFoundException(`Return transaction with ID "${id}" not found`);
    }

    return returnRecord;
  }
}

