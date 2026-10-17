import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnomalyType,
  AnomalyStatus,
  AnomalySeverity,
  AnomalyKpiSummary,
} from '@dispenco/types';
import {
  GetAnomaliesDto,
  UpdateAnomalyStatusDto,
  TriggerAnomalyScanDto,
} from '../dto/anomaly.dtos';

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run automated anomaly detection rules across tenant transactions & logs.
   * Frame: "Operational Integrity & Discrepancy Review"
   */
  async runScan(
    tenantId: string,
    dto?: TriggerAnomalyScanDto,
  ): Promise<{ scannedRules: number; newFlagsCreated: number }> {
    this.logger.log(
      `Executing operational integrity scan for tenant ${tenantId} ${
        dto?.storeId ? `(store: ${dto.storeId})` : ''
      }...`,
    );

    let newFlagsCreated = 0;

    // Rule 1: High Void / Cancelled Rate
    newFlagsCreated += await this.detectHighVoidRates(tenantId, dto?.storeId);

    // Rule 2: Excessive Discretionary Discounts
    newFlagsCreated += await this.detectExcessiveDiscounts(tenantId, dto?.storeId);

    // Rule 3: After-Hours Register Sales
    newFlagsCreated += await this.detectAfterHoursSales(tenantId, dto?.storeId);

    // Rule 4: Below-Cost Dispensation
    newFlagsCreated += await this.detectBelowCostSales(tenantId, dto?.storeId);

    // Rule 5: Repetitive Inventory Shrinkage Write-offs
    newFlagsCreated += await this.detectRepetitiveShrinkage(tenantId);

    this.logger.log(
      `Operational integrity scan completed. ${newFlagsCreated} new variance flags generated.`,
    );

    return { scannedRules: 5, newFlagsCreated };
  }

  /**
   * Rule 1: High Void / Cancelled Rate
   * Identifies cashiers with void rates > 2x store average with >= 5 transactions.
   */
  private async detectHighVoidRates(
    tenantId: string,
    storeId?: string,
  ): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        storeId: true,
        userId: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (sales.length < 5) return 0;

    const totalSales = sales.length;
    const totalVoided = sales.filter((s) => s.status === 'VOIDED').length;
    const storeAvgVoidRate = totalVoided / totalSales;

    // Group by cashier
    const userStats = new Map<
      string,
      {
        user: { id: string; name: string; email: string };
        storeId: string;
        total: number;
        voided: number;
      }
    >();

    for (const sale of sales) {
      if (!sale.userId || !sale.user) continue;
      const current = userStats.get(sale.userId) || {
        user: sale.user,
        storeId: sale.storeId,
        total: 0,
        voided: 0,
      };
      current.total += 1;
      if (sale.status === 'VOIDED') {
        current.voided += 1;
      }
      userStats.set(sale.userId, current);
    }

    let createdCount = 0;

    for (const [userId, stats] of userStats.entries()) {
      if (stats.total < 5) continue;
      const userVoidRate = stats.voided / stats.total;
      const baselineThreshold = Math.max(0.08, storeAvgVoidRate * 2.0);

      if (userVoidRate > baselineThreshold && stats.voided >= 2) {
        // Check if an active flag already exists for this user & type
        const existingFlag = await this.prisma.anomalyFlag.findFirst({
          where: {
            tenantId,
            userId,
            type: AnomalyType.HIGH_VOID_RATE,
            status: { in: [AnomalyStatus.FLAGGED, AnomalyStatus.UNDER_REVIEW] },
          },
        });

        if (!existingFlag) {
          const ratio = storeAvgVoidRate > 0 ? userVoidRate / storeAvgVoidRate : 3.0;
          const severity: AnomalySeverity = userVoidRate > 0.25 ? 'CRITICAL' : 'HIGH';

          await this.prisma.anomalyFlag.create({
            data: {
              tenantId,
              storeId: stats.storeId,
              userId,
              type: AnomalyType.HIGH_VOID_RATE,
              severity,
              status: AnomalyStatus.FLAGGED,
              title: `Elevated Void Rate: ${stats.user.name}`,
              description: `User recorded ${stats.voided} voided transactions out of ${stats.total} (${(userVoidRate * 100).toFixed(1)}%), exceeding the baseline average of ${(storeAvgVoidRate * 100).toFixed(1)}%.`,
              statisticalScore: Number(ratio.toFixed(2)),
              metricBaseline: Number((storeAvgVoidRate * 100).toFixed(2)),
              metricObserved: Number((userVoidRate * 100).toFixed(2)),
              metadata: {
                totalTransactions: stats.total,
                voidedTransactions: stats.voided,
                storeAvgRatePercent: (storeAvgVoidRate * 100).toFixed(2),
              },
            },
          });
          createdCount++;
        }
      }
    }

    return createdCount;
  }

  /**
   * Rule 2: Excessive Discretionary Discounts
   * Flags transactions with discounts > 25% or flat discounts > PKR 1,000.
   */
  private async detectExcessiveDiscounts(
    tenantId: string,
    storeId?: string,
  ): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
        createdAt: { gte: sevenDaysAgo },
        discountAmount: { gt: 0 },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    let createdCount = 0;

    for (const sale of sales) {
      const discount = Number(sale.discountAmount);
      const total = Number(sale.totalAmount);
      const gross = total + discount;
      const discountPct = gross > 0 ? (discount / gross) * 100 : 0;

      const isExcessive = discountPct > 25 || discount >= 1000;
      if (isExcessive) {
        const existing = await this.prisma.anomalyFlag.findFirst({
          where: {
            tenantId,
            referenceId: sale.id,
            type: AnomalyType.EXCESSIVE_DISCOUNT,
          },
        });

        if (!existing) {
          const severity: AnomalySeverity = discountPct > 40 || discount >= 3000 ? 'CRITICAL' : 'HIGH';

          await this.prisma.anomalyFlag.create({
            data: {
              tenantId,
              storeId: sale.storeId,
              userId: sale.userId,
              type: AnomalyType.EXCESSIVE_DISCOUNT,
              severity,
              status: AnomalyStatus.FLAGGED,
              title: `High Discretionary Discount: ${sale.receiptNumber || 'POS Sale'}`,
              description: `Transaction discounted by PKR ${discount.toFixed(2)} (${discountPct.toFixed(1)}% of gross PKR ${gross.toFixed(2)}) processed by ${sale.user?.name || 'Staff'}.`,
              referenceId: sale.id,
              statisticalScore: Number((discountPct / 10).toFixed(2)),
              metricBaseline: 5.0, // Standard baseline 5% promotional discount
              metricObserved: Number(discountPct.toFixed(2)),
              metadata: {
                receiptNumber: sale.receiptNumber,
                discountAmount: discount,
                grossAmount: gross,
                discountPercentage: discountPct.toFixed(1),
              },
            },
          });
          createdCount++;
        }
      }
    }

    return createdCount;
  }

  /**
   * Rule 3: After-Hours Sales
   * Flags checkouts completed outside normal retail operating hours (11:00 PM – 06:00 AM local PKT).
   */
  private async detectAfterHoursSales(
    tenantId: string,
    storeId?: string,
  ): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    let createdCount = 0;

    for (const sale of sales) {
      // Calculate PKT hour (UTC + 5)
      const date = new Date(sale.createdAt);
      const pktHour = (date.getUTCHours() + 5) % 24;

      if (pktHour >= 23 || pktHour < 6) {
        const existing = await this.prisma.anomalyFlag.findFirst({
          where: {
            tenantId,
            referenceId: sale.id,
            type: AnomalyType.AFTER_HOURS_SALE,
          },
        });

        if (!existing) {
          const timeFormatted = `${String(pktHour).padStart(2, '0')}:${String(
            date.getUTCMinutes(),
          ).padStart(2, '0')}`;

          await this.prisma.anomalyFlag.create({
            data: {
              tenantId,
              storeId: sale.storeId,
              userId: sale.userId,
              type: AnomalyType.AFTER_HOURS_SALE,
              severity: 'MEDIUM',
              status: AnomalyStatus.FLAGGED,
              title: `After-Hours Register Transaction: ${sale.receiptNumber || 'POS Sale'}`,
              description: `Transaction completed at ${timeFormatted} PKT by ${sale.user?.name || 'Staff'} outside normal operational store hours.`,
              referenceId: sale.id,
              metricBaseline: 18.0, // Midday standard
              metricObserved: pktHour,
              metadata: {
                receiptNumber: sale.receiptNumber,
                checkoutTimePkt: timeFormatted,
                totalAmount: Number(sale.totalAmount),
              },
            },
          });
          createdCount++;
        }
      }
    }

    return createdCount;
  }

  /**
   * Rule 4: Below-Cost Dispensation
   * Flags sale line items where unit price was lower than batch cost price.
   */
  private async detectBelowCostSales(
    tenantId: string,
    storeId?: string,
  ): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          createdAt: { gte: sevenDaysAgo },
        },
      },
      include: {
        sale: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        batch: true,
        product: true,
      },
      take: 300,
      orderBy: { id: 'desc' },
    });

    let createdCount = 0;

    for (const item of saleItems) {
      const unitPrice = Number(item.unitPrice);
      const costPrice = Number(item.batch.costPrice);

      if (costPrice > 0 && unitPrice < costPrice) {
        const marginDeficit = (costPrice - unitPrice) * item.quantity;

        const existing = await this.prisma.anomalyFlag.findFirst({
          where: {
            tenantId,
            referenceId: `${item.saleId}_${item.id}`,
            type: AnomalyType.BELOW_COST_SALE,
          },
        });

        if (!existing) {
          const severity: AnomalySeverity = marginDeficit >= 500 ? 'CRITICAL' : 'HIGH';

          await this.prisma.anomalyFlag.create({
            data: {
              tenantId,
              storeId: item.sale.storeId,
              userId: item.sale.userId,
              type: AnomalyType.BELOW_COST_SALE,
              severity,
              status: AnomalyStatus.FLAGGED,
              title: `Below-Cost Sale: ${item.product.name}`,
              description: `Dispensed at PKR ${unitPrice.toFixed(2)} below batch acquisition cost of PKR ${costPrice.toFixed(2)} on Receipt ${item.sale.receiptNumber || 'POS'} by ${item.sale.user?.name || 'Staff'}. Margin variance: PKR -${marginDeficit.toFixed(2)}.`,
              referenceId: `${item.saleId}_${item.id}`,
              metricBaseline: costPrice,
              metricObserved: unitPrice,
              statisticalScore: Number((costPrice / (unitPrice || 0.1)).toFixed(2)),
              metadata: {
                receiptNumber: item.sale.receiptNumber,
                productName: item.product.name,
                batchNumber: item.batch.batchNumber,
                costPrice,
                unitPrice,
                marginDeficit,
                quantity: item.quantity,
              },
            },
          });
          createdCount++;
        }
      }
    }

    return createdCount;
  }

  /**
   * Rule 5: Repetitive Inventory Shrinkage Write-offs
   * Flags staff members with >= 3 manual inventory write-offs or adjustments within 14 days.
   */
  private async detectRepetitiveShrinkage(tenantId: string): Promise<number> {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        createdAt: { gte: fourteenDaysAgo },
        OR: [
          { action: { contains: 'ADJUST', mode: 'insensitive' } },
          { action: { contains: 'DAMAGE', mode: 'insensitive' } },
          { action: { contains: 'WRITE_OFF', mode: 'insensitive' } },
          { entityType: { in: ['Batch', 'Inventory'] } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (auditLogs.length === 0) return 0;

    // Group adjustments by userId
    const userAdjustments = new Map<
      string,
      {
        user: { id: string; name: string; email: string };
        count: number;
        logIds: string[];
      }
    >();

    for (const log of auditLogs) {
      if (!log.userId || !log.user) continue;
      const current = userAdjustments.get(log.userId) || {
        user: log.user,
        count: 0,
        logIds: [],
      };
      current.count += 1;
      current.logIds.push(log.id);
      userAdjustments.set(log.userId, current);
    }

    let createdCount = 0;

    for (const [userId, item] of userAdjustments.entries()) {
      if (item.count >= 3) {
        const existing = await this.prisma.anomalyFlag.findFirst({
          where: {
            tenantId,
            userId,
            type: AnomalyType.REPETITIVE_SHRINKAGE,
            status: { in: [AnomalyStatus.FLAGGED, AnomalyStatus.UNDER_REVIEW] },
          },
        });

        if (!existing) {
          const severity: AnomalySeverity = item.count >= 6 ? 'CRITICAL' : 'HIGH';

          await this.prisma.anomalyFlag.create({
            data: {
              tenantId,
              userId,
              type: AnomalyType.REPETITIVE_SHRINKAGE,
              severity,
              status: AnomalyStatus.FLAGGED,
              title: `Recurrent Inventory Write-offs: ${item.user.name}`,
              description: `User recorded ${item.count} manual stock write-offs/adjustments in the last 14 days. Managerial discrepancy review recommended.`,
              metricBaseline: 1.0,
              metricObserved: item.count,
              statisticalScore: Number((item.count / 1.0).toFixed(2)),
              metadata: {
                adjustmentCount: item.count,
                sampleAuditIds: item.logIds.slice(0, 5),
              },
            },
          });
          createdCount++;
        }
      }
    }

    return createdCount;
  }

  /**
   * List anomaly flags with filtering and pagination.
   */
  async listFlags(tenantId: string, query: GetAnomaliesDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.type && query.type !== 'ALL') {
      where.type = query.type;
    }
    if (query.severity && query.severity !== 'ALL') {
      where.severity = query.severity;
    }
    if (query.storeId) {
      where.storeId = query.storeId;
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    const [items, total] = await Promise.all([
      this.prisma.anomalyFlag.findMany({
        where,
        include: {
          store: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.anomalyFlag.count({ where }),
    ]);

    const formattedItems = items.map((f) => ({
      id: f.id,
      tenantId: f.tenantId,
      storeId: f.storeId,
      storeName: f.store?.name || null,
      userId: f.userId,
      user: f.user,
      type: f.type,
      severity: f.severity as AnomalySeverity,
      status: f.status,
      title: f.title,
      description: f.description,
      statisticalScore: f.statisticalScore ? Number(f.statisticalScore) : null,
      metricBaseline: f.metricBaseline ? Number(f.metricBaseline) : null,
      metricObserved: f.metricObserved ? Number(f.metricObserved) : null,
      referenceId: f.referenceId,
      metadata: f.metadata as Record<string, unknown>,
      resolutionNote: f.resolutionNote,
      reviewedBy: f.reviewedBy,
      reviewedAt: f.reviewedAt ? f.reviewedAt.toISOString() : null,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Update status of an anomaly variance flag with resolution notes.
   */
  async updateStatus(
    tenantId: string,
    flagId: string,
    reviewerId: string,
    dto: UpdateAnomalyStatusDto,
  ) {
    const existing = await this.prisma.anomalyFlag.findFirst({
      where: { id: flagId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Anomaly flag with ID ${flagId} not found`);
    }

    const updated = await this.prisma.anomalyFlag.update({
      where: { id: flagId },
      data: {
        status: dto.status,
        resolutionNote: dto.resolutionNote ?? existing.resolutionNote,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        store: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Write audit log entry for discrepancy review resolution
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: reviewerId,
          action: `ANOMALY_FLAG_${dto.status}`,
          entityType: 'AnomalyFlag',
          entityId: flagId,
          metadata: {
            previousStatus: existing.status,
            newStatus: dto.status,
            resolutionNote: dto.resolutionNote || null,
            flagType: existing.type,
          },
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to create audit log for anomaly review: ${err.message}`);
    }

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      storeId: updated.storeId,
      storeName: updated.store?.name || null,
      userId: updated.userId,
      user: updated.user,
      type: updated.type,
      severity: updated.severity as AnomalySeverity,
      status: updated.status,
      title: updated.title,
      description: updated.description,
      statisticalScore: updated.statisticalScore ? Number(updated.statisticalScore) : null,
      metricBaseline: updated.metricBaseline ? Number(updated.metricBaseline) : null,
      metricObserved: updated.metricObserved ? Number(updated.metricObserved) : null,
      referenceId: updated.referenceId,
      metadata: updated.metadata as Record<string, unknown>,
      resolutionNote: updated.resolutionNote,
      reviewedBy: updated.reviewedBy,
      reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Get operational integrity KPI metrics and breakdown summary.
   */
  async getKpiSummary(tenantId: string): Promise<AnomalyKpiSummary> {
    const flags = await this.prisma.anomalyFlag.findMany({
      where: { tenantId },
      select: {
        status: true,
        severity: true,
        type: true,
      },
    });

    let pendingReviewCount = 0;
    let investigatingCount = 0;
    let resolvedCount = 0;
    let dismissedCount = 0;
    let criticalSeverityCount = 0;
    let highSeverityCount = 0;
    const breakdownByType: Record<string, number> = {};

    for (const flag of flags) {
      if (flag.status === AnomalyStatus.FLAGGED) pendingReviewCount++;
      else if (flag.status === AnomalyStatus.UNDER_REVIEW) investigatingCount++;
      else if (flag.status === AnomalyStatus.RESOLVED) resolvedCount++;
      else if (flag.status === AnomalyStatus.DISMISSED) dismissedCount++;

      if (flag.severity === 'CRITICAL' && flag.status === AnomalyStatus.FLAGGED) {
        criticalSeverityCount++;
      }
      if (flag.severity === 'HIGH' && flag.status === AnomalyStatus.FLAGGED) {
        highSeverityCount++;
      }

      breakdownByType[flag.type] = (breakdownByType[flag.type] || 0) + 1;
    }

    // Operational Integrity Score calculation:
    // Starts at 100%, deducts points for open discrepancies based on severity
    const penalty = criticalSeverityCount * 15 + highSeverityCount * 8 + (pendingReviewCount - criticalSeverityCount - highSeverityCount) * 3;
    const integrityScorePercent = Math.max(0, Math.min(100, 100 - penalty));

    return {
      totalFlags: flags.length,
      pendingReviewCount,
      investigatingCount,
      resolvedCount,
      dismissedCount,
      criticalSeverityCount,
      highSeverityCount,
      integrityScorePercent,
      breakdownByType,
    };
  }
}
