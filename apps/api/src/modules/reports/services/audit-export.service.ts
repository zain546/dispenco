import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetAuditLogsDto } from '../dto/get-audit-logs.dto';
import { AuditLogItem, AuditMetricsSummary } from '@dispenco/types';
import * as Papa from 'papaparse';

@Injectable()
export class AuditExportService {
  private readonly logger = new Logger(AuditExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAuditLogs(
    tenantId: string,
    query: GetAuditLogsDto
  ): Promise<{
    items: AuditLogItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause = this.buildWhereClause(tenantId, query);

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userRoles: {
                include: {
                  role: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    const items: AuditLogItem[] = logs.map((log) => this.formatAuditItem(log));

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async generateAuditCsv(
    tenantId: string,
    query: GetAuditLogsDto
  ): Promise<string> {
    const whereClause = this.buildWhereClause(tenantId, query);

    // Fetch up to 10,000 records for export
    const logs = await this.prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userRoles: {
              include: {
                role: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const csvRows = logs.map((log) => {
      const formatted = this.formatAuditItem(log);
      const userRole = log.user?.userRoles[0]?.role?.name || (log.user ? 'Staff' : 'System / Automated');

      return {
        'Log ID': log.id,
        'Timestamp (UTC)': log.createdAt.toISOString(),
        'Local Date': log.createdAt.toLocaleDateString(),
        'Local Time': log.createdAt.toLocaleTimeString(),
        'Action Code': log.action,
        'Severity Level': formatted.severity.toUpperCase(),
        'Entity Scope': log.entityType,
        'Target Entity ID': log.entityId,
        'Actor Name': log.user?.name || 'System Service',
        'Actor Email': log.user?.email || 'system@dispenco.local',
        'Actor Role': userRole,
        'Audit Narrative & Reason': formatted.summaryText,
        'Raw Metadata': JSON.stringify(log.metadata),
      };
    });

    return Papa.unparse(csvRows, {
      quotes: true,
      header: true,
    });
  }

  async getAuditSummary(
    tenantId: string,
    query: GetAuditLogsDto
  ): Promise<AuditMetricsSummary> {
    const whereClause = this.buildWhereClause(tenantId, query);

    const [logs, totalEvents] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        select: {
          action: true,
          userId: true,
          user: { select: { id: true, name: true } },
        },
        take: 5000,
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    let voidsCount = 0;
    let stockAdjustmentsCount = 0;
    let securityEventsCount = 0;
    let transfersCount = 0;
    const actionsBreakdown: Record<string, number> = {};
    const userCounts = new Map<string, { userId: string; name: string; count: number }>();

    for (const log of logs) {
      actionsBreakdown[log.action] = (actionsBreakdown[log.action] || 0) + 1;

      if (log.action.includes('VOID')) voidsCount++;
      if (log.action.includes('ADJUSTMENT')) stockAdjustmentsCount++;
      if (
        log.action.includes('API_KEY') ||
        log.action.includes('ROLE') ||
        log.action.includes('INVITED')
      ) {
        securityEventsCount++;
      }
      if (log.action.includes('TRANSFER')) transfersCount++;

      if (log.userId && log.user) {
        const existing = userCounts.get(log.userId) || {
          userId: log.userId,
          name: log.user.name,
          count: 0,
        };
        existing.count++;
        userCounts.set(log.userId, existing);
      }
    }

    const topUsers = Array.from(userCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEvents,
      voidsCount,
      stockAdjustmentsCount,
      securityEventsCount,
      transfersCount,
      topUsers,
      actionsBreakdown,
    };
  }

  private buildWhereClause(tenantId: string, query: GetAuditLogsDto): any {
    const where: any = { tenantId };

    if (query.category) {
      const cat = query.category.toLowerCase();
      if (cat === 'stock') {
        where.action = { in: ['STOCK_ADJUSTMENT'] };
      } else if (cat === 'sales') {
        where.action = { in: ['SALE_VOIDED', 'SALE_RETURNED'] };
      } else if (cat === 'security') {
        where.action = {
          in: [
            'API_KEY_CREATED',
            'API_KEY_ACTIVATED',
            'API_KEY_DEACTIVATED',
            'API_KEY_REVOKED',
            'STAFF_ROLE_CHANGED',
            'STAFF_INVITED',
          ],
        };
      } else if (cat === 'transfers') {
        where.action = {
          in: [
            'TRANSFER_REQUESTED',
            'TRANSFER_DISPATCHED',
            'TRANSFER_RECEIVED',
            'TRANSFER_CANCELLED',
          ],
        };
      } else if (cat === 'pricing') {
        where.action = { in: ['BULK_PRICE_PUSH', 'BROADCAST_SETTING'] };
      }
    }

    if (query.action && query.action !== 'ALL') {
      where.action = query.action;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private formatAuditItem(log: any): AuditLogItem {
    const meta = (log.metadata as Record<string, any>) || {};
    let summaryText = '';
    let severity: 'info' | 'warning' | 'critical' = 'info';

    switch (log.action) {
      case 'STOCK_ADJUSTMENT':
        severity = 'warning';
        summaryText = `Stock adjustment for batch ${meta.batchNumber || meta.batchId || log.entityId.slice(0, 8)}. Reason: ${meta.reason || 'Inventory count reconciliation'}. Delta: ${meta.quantityChange ?? meta.delta ?? 'N/A'}`;
        break;

      case 'SALE_VOIDED':
        severity = 'critical';
        summaryText = `Voided customer transaction ${meta.saleNumber || meta.saleId || log.entityId.slice(0, 8)}. Reason: ${meta.reason || 'Cashier correction'}. Refunded: PKR ${meta.totalAmount ?? 0}`;
        break;

      case 'SALE_RETURNED':
        severity = 'warning';
        summaryText = `Processed customer product return for sale ${meta.saleId?.slice(0, 8) || log.entityId.slice(0, 8)}. Total items returned: ${meta.itemsCount || 1}`;
        break;

      case 'BULK_PRICE_PUSH':
        severity = 'critical';
        summaryText = `Executed multi-store bulk price adjustment across ${meta.targetStoreCount || 'all'} stores. Products updated: ${meta.updatedProductsCount || meta.productCount || 0}`;
        break;

      case 'BROADCAST_SETTING':
        severity = 'warning';
        summaryText = `Broadcasted global chain setting '${meta.settingKey}' across branches.`;
        break;

      case 'API_KEY_CREATED':
        severity = 'warning';
        summaryText = `Created integration API key '${meta.name}' with prefix ${meta.keyPrefix}. Scopes: [${(meta.permissions || []).join(', ')}]`;
        break;

      case 'API_KEY_REVOKED':
        severity = 'critical';
        summaryText = `Permanently revoked integration API key '${meta.name}' (${meta.keyPrefix}). Access terminated.`;
        break;

      case 'API_KEY_ACTIVATED':
      case 'API_KEY_DEACTIVATED':
        severity = 'warning';
        summaryText = `API key '${meta.name}' status set to ${meta.isActive ? 'ACTIVE' : 'SUSPENDED'}.`;
        break;

      case 'TRANSFER_REQUESTED':
        severity = 'info';
        summaryText = `Requested inter-branch stock transfer ${meta.transferNumber || log.entityId.slice(0, 8)} to ${meta.destinationStoreName || 'destination branch'}.`;
        break;

      case 'TRANSFER_DISPATCHED':
        severity = 'info';
        summaryText = `Dispatched transfer consignment ${meta.transferNumber || log.entityId.slice(0, 8)} in transit.`;
        break;

      case 'TRANSFER_RECEIVED':
        severity = 'info';
        summaryText = `Received transfer consignment ${meta.transferNumber || log.entityId.slice(0, 8)}. Stock merged into shelf batches.`;
        break;

      case 'TRANSFER_CANCELLED':
        severity = 'warning';
        summaryText = `Cancelled transfer request ${meta.transferNumber || log.entityId.slice(0, 8)}. Reason: ${meta.cancelReason || 'Branch declined'}`;
        break;

      case 'CUSTOMER_CREDIT_ADJUSTED':
        severity = 'warning';
        summaryText = `Updated customer credit balance (${meta.customerName || log.entityId.slice(0, 8)}) by PKR ${meta.amount ?? 0}. Current debt: PKR ${meta.newBalance ?? 0}`;
        break;

      default:
        summaryText = `${log.action.replace(/_/g, ' ')} executed on ${log.entityType} (${log.entityId.slice(0, 8)})`;
        severity = 'info';
        break;
    }

    const primaryRole = log.user?.userRoles?.[0]?.role?.name || (log.user ? 'Staff' : undefined);

    return {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: meta,
      createdAt: log.createdAt.toISOString(),
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
            role: primaryRole,
          }
        : null,
      summaryText,
      severity,
    };
  }
}
