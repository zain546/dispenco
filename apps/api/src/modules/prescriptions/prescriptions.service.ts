import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dtos/create-prescription.dto';
import {
  UpdatePrescriptionDto,
  DispensePrescriptionDto,
} from './dtos/update-prescription.dto';
import { PrescriptionStatus } from '@prisma/client';

export interface GetPrescriptionsParams {
  storeId?: string;
  status?: PrescriptionStatus;
  search?: string;
  isControlledOnly?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new verified prescription record
   */
  async create(tenantId: string, dto: CreatePrescriptionDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Prescription must contain at least one prescribed medicine item');
    }

    // Verify store belongs to tenant
    const store = await this.prisma.store.findFirst({
      where: { id: dto.storeId, tenantId },
    });
    if (!store) {
      throw new BadRequestException('Invalid store selected for prescription');
    }

    // Generate prescription number
    const count = await this.prisma.prescription.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    const prescriptionNumber = `RX-${year}-${String(count + 1).padStart(4, '0')}`;

    const rxDate = dto.prescriptionDate ? new Date(dto.prescriptionDate) : new Date();
    const expiry = dto.expiryDate
      ? new Date(dto.expiryDate)
      : new Date(rxDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const prescription = await this.prisma.prescription.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        prescriptionNumber,
        patientName: dto.patientName,
        patientPhone: dto.patientPhone || null,
        patientAge: dto.patientAge || null,
        patientGender: dto.patientGender || null,
        patientCnic: dto.patientCnic || null,
        doctorName: dto.doctorName,
        doctorLicenseNumber: dto.doctorLicenseNumber || null,
        doctorHospital: dto.doctorHospital || null,
        prescriptionDate: rxDate,
        expiryDate: expiry,
        imageReference: dto.imageReference || null,
        diagnosis: dto.diagnosis || null,
        notes: dto.notes || null,
        status: dto.status || PrescriptionStatus.ACTIVE,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            dosage: item.dosage || null,
            frequency: item.frequency || null,
            durationDays: item.durationDays || null,
            quantityPrescribed: item.quantityPrescribed,
            quantityDispensed: 0,
            instructions: item.instructions || null,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                genericName: true,
                category: true,
                unit: true,
                isControlledSubstance: true,
              },
            },
          },
        },
        store: { select: { id: true, name: true } },
      },
    });

    return {
      success: true,
      message: 'Prescription recorded successfully',
      data: prescription,
    };
  }

  /**
   * List prescriptions with filters
   */
  async findAll(tenantId: string, params: GetPrescriptionsParams = {}) {
    const page = params.page ? Math.max(1, Number(params.page)) : 1;
    const limit = params.limit ? Math.min(100, Math.max(1, Number(params.limit))) : 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.storeId) where.storeId = params.storeId;
    if (params.status) where.status = params.status;

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { prescriptionNumber: { contains: q, mode: 'insensitive' } },
        { patientName: { contains: q, mode: 'insensitive' } },
        { patientPhone: { contains: q, mode: 'insensitive' } },
        { patientCnic: { contains: q, mode: 'insensitive' } },
        { doctorName: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params.isControlledOnly) {
      where.items = {
        some: {
          product: { isControlledSubstance: true },
        },
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.prescription.count({ where }),
      this.prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  genericName: true,
                  category: true,
                  unit: true,
                  isControlledSubstance: true,
                },
              },
            },
          },
          store: { select: { id: true, name: true } },
          sale: { select: { id: true, receiptNumber: true, totalAmount: true } },
        },
      }),
    ]);

    return {
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single prescription by ID
   */
  async findOne(tenantId: string, id: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                genericName: true,
                category: true,
                unit: true,
                isControlledSubstance: true,
                barcode: true,
              },
            },
          },
        },
        store: { select: { id: true, name: true, address: true } },
        sale: {
          select: {
            id: true,
            receiptNumber: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription not found`);
    }

    return {
      success: true,
      data: prescription,
    };
  }

  /**
   * Update prescription details
   */
  async update(tenantId: string, id: string, dto: UpdatePrescriptionDto) {
    await this.findOne(tenantId, id);

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        patientName: dto.patientName,
        patientPhone: dto.patientPhone,
        patientAge: dto.patientAge,
        patientGender: dto.patientGender,
        patientCnic: dto.patientCnic,
        doctorName: dto.doctorName,
        doctorLicenseNumber: dto.doctorLicenseNumber,
        doctorHospital: dto.doctorHospital,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        imageReference: dto.imageReference,
        diagnosis: dto.diagnosis,
        notes: dto.notes,
        status: dto.status,
        saleId: dto.saleId,
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, isControlledSubstance: true },
            },
          },
        },
      },
    });

    return {
      success: true,
      message: 'Prescription updated successfully',
      data: updated,
    };
  }

  /**
   * Dispense prescription: marks dispensed quantities and links to a sale transaction
   */
  async dispense(tenantId: string, id: string, dto: DispensePrescriptionDto) {
    const rx = await this.findOne(tenantId, id);
    const existing = rx.data;

    let allFullyDispensed = true;
    let anyDispensed = false;

    // Update item quantities
    if (dto.items && dto.items.length > 0) {
      for (const it of dto.items) {
        await this.prisma.prescriptionItem.update({
          where: { id: it.itemId },
          data: { quantityDispensed: it.quantityDispensed },
        });
      }
    }

    // Check overall dispense state
    const refreshed = await this.prisma.prescription.findUnique({
      where: { id },
      include: { items: true },
    });

    refreshed?.items.forEach((it) => {
      if (it.quantityDispensed >= it.quantityPrescribed) {
        anyDispensed = true;
      } else if (it.quantityDispensed > 0) {
        anyDispensed = true;
        allFullyDispensed = false;
      } else {
        allFullyDispensed = false;
      }
    });

    const newStatus = allFullyDispensed
      ? PrescriptionStatus.DISPENSED
      : anyDispensed
      ? PrescriptionStatus.PARTIALLY_DISPENSED
      : existing.status;

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        status: newStatus,
        saleId: dto.saleId || existing.saleId,
        notes: dto.notes ? `${existing.notes ? existing.notes + ' | ' : ''}${dto.notes}` : existing.notes,
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, isControlledSubstance: true } },
          },
        },
      },
    });

    return {
      success: true,
      message: `Prescription marked as ${newStatus}`,
      data: updated,
    };
  }
}
