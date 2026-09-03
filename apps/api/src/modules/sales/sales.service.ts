import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateSaleDto } from './dtos/create-sale.dto';
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
    if (!targetStoreId) {
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

        // FEFO batch allocation using current transaction client
        const fefoResult = await this.inventoryService.selectBatchesForSale(
          tenantId,
          item.productId,
          item.quantity,
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

          // Determine item price (provided unitPrice or batch sell price)
          const unitPrice = item.unitPrice !== undefined ? item.unitPrice : alloc.sellPrice;
          const itemSubtotal = unitPrice * alloc.quantityToDeduct;

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
            quantity: alloc.quantityToDeduct,
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
          status: SaleStatus.COMPLETED,
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

      // 5. Create Payment Record if payment method provided
      const paymentMethod = dto.paymentMethod || PaymentMethod.CASH;
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
      where: { id: saleId, tenantId },
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
        payments: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID "${saleId}" not found`);
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
        items: sale.saleItems.map((si) => ({
          id: si.id,
          productId: si.productId,
          productName: si.product.name,
          unit: si.product.unit,
          batchNumber: si.batch.batchNumber,
          expiryDate: si.batch.expiryDate.toISOString(),
          quantity: si.quantity,
          unitPrice: Number(si.unitPrice),
          discount: Number(si.discount),
          taxApplied: Number(si.taxApplied),
          lineTotal: Number(si.unitPrice) * si.quantity - Number(si.discount) + Number(si.taxApplied),
        })),
      },
    };
  }

  async getRecentSales(tenantId: string, limit: number = 20) {
    const sales = await this.prisma.sale.findMany({
      where: { tenantId },
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
}
