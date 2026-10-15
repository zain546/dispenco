import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { CustomerQueryDto } from './dtos/customer-query.dto';
import { RecordKhataPaymentDto } from './dtos/record-payment.dto';
import { Prisma, PaymentStatus, SaleStatus } from '@prisma/client';

export interface LedgerEntry {
  id: string;
  type: 'DEBIT_SALE' | 'CREDIT_PAYMENT';
  date: string;
  reference: string;
  description: string;
  debit: number; // Increases debt
  credit: number; // Decreases debt
  balance: number; // Running balance after this entry
  method?: string;
  receiptNumber?: string;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCustomerDto) {
    const cleanName = dto.name.trim();
    const cleanPhone = dto.phone?.trim() || null;
    const cleanEmail = dto.email?.trim().toLowerCase() || null;
    const cleanAddress = dto.address?.trim() || null;
    const initialBalance = dto.initialCreditBalance ? Number(dto.initialCreditBalance) : 0;

    return this.prisma.customer.create({
      data: {
        tenantId,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        address: cleanAddress,
        creditBalance: new Prisma.Decimal(initialBalance),
      },
    });
  }

  async findAll(tenantId: string, query: CustomerQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = { tenantId };

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.hasBalance === 'true') {
      where.creditBalance = { gt: new Prisma.Decimal(0) };
    } else if (query.hasBalance === 'false') {
      where.creditBalance = { lte: new Prisma.Decimal(0) };
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ creditBalance: 'desc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { sales: true, payments: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    // Aggregate summary metrics across all tenant customers
    const [allCustomersCount, creditSumResult, debtorsCount] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.aggregate({
        where: { tenantId, creditBalance: { gt: new Prisma.Decimal(0) } },
        _sum: { creditBalance: true },
      }),
      this.prisma.customer.count({
        where: { tenantId, creditBalance: { gt: new Prisma.Decimal(0) } },
      }),
    ]);

    return {
      data: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        creditBalance: Number(c.creditBalance),
        totalSalesCount: c._count.sales,
        totalPaymentsCount: c._count.payments,
        createdAt: c.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalCustomers: allCustomersCount,
        totalCreditOutstanding: Number(creditSumResult._sum.creditBalance || 0),
        customersWithBalanceCount: debtorsCount,
      },
    };
  }

  async search(tenantId: string, term?: string) {
    if (!term || !term.trim()) {
      const topCustomers = await this.prisma.customer.findMany({
        where: { tenantId },
        take: 10,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          phone: true,
          creditBalance: true,
          address: true,
        },
      });
      return topCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        creditBalance: Number(c.creditBalance),
      }));
    }

    const cleanTerm = term.trim();
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: cleanTerm, mode: 'insensitive' } },
          { phone: { contains: cleanTerm } },
        ],
      },
      take: 10,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        creditBalance: true,
      },
    });

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address,
      creditBalance: Number(c.creditBalance),
    }));
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        sales: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            store: { select: { id: true, name: true } },
            saleItems: {
              include: {
                product: { select: { name: true, unit: true } },
              },
            },
          },
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { sales: true, payments: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    // Calculate total spend
    const salesAggregate = await this.prisma.sale.aggregate({
      where: { customerId: id, tenantId, status: { not: SaleStatus.VOIDED } },
      _sum: { totalAmount: true },
    });

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      creditBalance: Number(customer.creditBalance),
      totalSpent: Number(salesAggregate._sum.totalAmount || 0),
      totalSalesCount: customer._count.sales,
      totalPaymentsCount: customer._count.payments,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      recentSales: customer.sales.map((s) => ({
        id: s.id,
        receiptNumber: s.receiptNumber,
        totalAmount: Number(s.totalAmount),
        status: s.status,
        storeName: s.store.name,
        itemsCount: s.saleItems.length,
        createdAt: s.createdAt.toISOString(),
      })),
      recentPayments: customer.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        saleId: p.saleId,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        phone: dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
        email: dto.email !== undefined ? dto.email?.trim().toLowerCase() || null : undefined,
        address: dto.address !== undefined ? dto.address?.trim() || null : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    if (Number(customer.creditBalance) > 0) {
      throw new BadRequestException(
        `Cannot delete customer with an active Khata credit balance of PKR ${Number(customer.creditBalance).toLocaleString()}. Settle the account first.`,
      );
    }

    if (customer._count.sales > 0) {
      throw new BadRequestException(
        `Cannot delete customer with ${customer._count.sales} associated billing receipts. Customer records are preserved for audit compliance.`,
      );
    }

    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async getLedger(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${customerId}" not found`);
    }

    // 1. Fetch all Credit Sales
    const creditSales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        customerId,
        status: SaleStatus.ON_CREDIT,
      },
      include: {
        store: { select: { name: true } },
        saleItems: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Fetch all Payments recorded for this customer
    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        customerId,
        status: PaymentStatus.COMPLETED,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 3. Unify into chronological timeline entries
    const rawEntries: Array<{
      id: string;
      type: 'DEBIT_SALE' | 'CREDIT_PAYMENT';
      date: Date;
      reference: string;
      description: string;
      debit: number;
      credit: number;
      method?: string;
      receiptNumber?: string;
    }> = [];

    // Credit Sales are debits (add to debt)
    for (const sale of creditSales) {
      const itemsSummary = sale.saleItems
        .map((si) => si.product.name)
        .slice(0, 3)
        .join(', ');
      const moreCount = sale.saleItems.length > 3 ? ` +${sale.saleItems.length - 3} more` : '';

      rawEntries.push({
        id: `sale-${sale.id}`,
        type: 'DEBIT_SALE',
        date: sale.createdAt,
        reference: sale.receiptNumber || `SALE-${sale.id.slice(0, 8)}`,
        description: `POS Credit Sale (${sale.store.name}) - ${itemsSummary}${moreCount}`,
        debit: Number(sale.totalAmount),
        credit: 0,
        receiptNumber: sale.receiptNumber || undefined,
      });
    }

    // Khata repayments (settlements where saleId is null or payment method was CASH/DIGITAL towards balance)
    for (const payment of payments) {
      // If payment has a saleId that was already marked COMPLETED, it was paid on the spot and didn't touch credit balance.
      // Standalone debt repayments (saleId === null) decrement the customer's balance.
      if (!payment.saleId) {
        rawEntries.push({
          id: `pay-${payment.id}`,
          type: 'CREDIT_PAYMENT',
          date: payment.createdAt,
          reference: payment.gatewayRef || `PAY-${payment.id.slice(0, 8)}`,
          description: `Khata Debt Repayment (${payment.method})`,
          debit: 0,
          credit: Number(payment.amount),
          method: payment.method,
        });
      }
    }

    // Sort all entries chronologically
    rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    const totalDebits = rawEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredits = rawEntries.reduce((sum, e) => sum + e.credit, 0);
    const openingBalance = Math.round((Number(customer.creditBalance) + totalCredits - totalDebits) * 100) / 100;

    const entries: LedgerEntry[] = [];
    let runningBalance = 0;

    // If an initial balance was recorded at customer creation that wasn't generated by a sale in the system
    if (openingBalance > 0) {
      runningBalance = openingBalance;
      entries.push({
        id: `opening-${customer.id}`,
        type: 'DEBIT_SALE',
        date: customer.createdAt.toISOString(),
        reference: 'OPENING-BALANCE',
        description: 'Opening / Migrated Khata Balance',
        debit: openingBalance,
        credit: 0,
        balance: openingBalance,
      });
    }

    for (const e of rawEntries) {
      runningBalance = runningBalance + e.debit - e.credit;
      entries.push({
        id: e.id,
        type: e.type,
        date: e.date.toISOString(),
        reference: e.reference,
        description: e.description,
        debit: e.debit,
        credit: e.credit,
        balance: Math.round(runningBalance * 100) / 100,
        method: e.method,
        receiptNumber: e.receiptNumber,
      });
    }

    const grandTotalDebits = totalDebits + (openingBalance > 0 ? openingBalance : 0);

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        currentCreditBalance: Number(customer.creditBalance),
      },
      summary: {
        openingBalance: openingBalance > 0 ? openingBalance : 0,
        totalDebits: grandTotalDebits,
        totalCredits,
        computedBalance: Math.round((grandTotalDebits - totalCredits) * 100) / 100,
        currentBalance: Number(customer.creditBalance),
      },
      entries,
    };
  }

  async recordKhataPayment(
    tenantId: string,
    customerId: string,
    userId: string,
    dto: RecordKhataPaymentDto,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${customerId}" not found`);
    }

    const paymentAmount = Number(dto.amount);
    if (paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create standalone Payment record
      const payment = await tx.payment.create({
        data: {
          tenantId,
          customerId,
          saleId: null,
          amount: new Prisma.Decimal(paymentAmount),
          method: dto.method,
          status: PaymentStatus.COMPLETED,
          gatewayRef: dto.gatewayRef || `KHATA-${Date.now().toString().slice(-6)}`,
        },
      });

      // 2. Decrement customer creditBalance
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          creditBalance: {
            decrement: new Prisma.Decimal(paymentAmount),
          },
        },
      });

      // 3. Write AuditLog entry
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'KHATA_PAYMENT_RECORDED',
          entityType: 'Customer',
          entityId: customerId,
          metadata: {
            paymentId: payment.id,
            amount: paymentAmount,
            method: dto.method,
            previousBalance: Number(customer.creditBalance),
            newBalance: Number(updatedCustomer.creditBalance),
            notes: dto.notes,
          },
        },
      });

      return {
        success: true,
        message: `Payment of PKR ${paymentAmount.toLocaleString()} recorded successfully for ${customer.name}`,
        payment: {
          id: payment.id,
          amount: Number(payment.amount),
          method: payment.method,
          reference: payment.gatewayRef,
          createdAt: payment.createdAt.toISOString(),
        },
        newCreditBalance: Number(updatedCustomer.creditBalance),
      };
    });
  }
}
