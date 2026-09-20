import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALL_PERMISSIONS,
  PERMISSION_CATEGORIES,
  DEFAULT_MANAGER_PERMISSIONS,
  DEFAULT_PHARMACIST_PERMISSIONS,
  DEFAULT_CASHIER_PERMISSIONS,
  Permission,
} from '@dispenco/types';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return metadata and categorizations for all system permissions
   */
  getAvailablePermissions() {
    return {
      categories: PERMISSION_CATEGORIES,
      allPermissions: ALL_PERMISSIONS,
    };
  }

  /**
   * Ensure all system permissions exist in database
   */
  async ensurePermissionsInDatabase() {
    for (const perm of ALL_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { name: perm },
        update: {},
        create: { name: perm },
      });
    }
  }

  /**
   * Seed default standard pharmacy roles for a tenant if not present
   */
  async seedStandardRolesIfMissing(tenantId: string) {
    await this.ensurePermissionsInDatabase();

    const existingRoles = await this.prisma.role.findMany({
      where: { tenantId },
      select: { name: true },
    });
    const existingNames = new Set(existingRoles.map((r) => r.name.toLowerCase()));

    // 1. Manager Role
    if (!existingNames.has('manager')) {
      await this.createPresetRole(
        tenantId,
        'Manager',
        DEFAULT_MANAGER_PERMISSIONS,
        true
      );
    }

    // 2. Pharmacist Role
    if (!existingNames.has('pharmacist')) {
      await this.createPresetRole(
        tenantId,
        'Pharmacist',
        DEFAULT_PHARMACIST_PERMISSIONS,
        true
      );
    }

    // 3. Cashier Role
    if (!existingNames.has('cashier')) {
      await this.createPresetRole(
        tenantId,
        'Cashier',
        DEFAULT_CASHIER_PERMISSIONS,
        true
      );
    }
  }

  private async createPresetRole(
    tenantId: string,
    name: string,
    permissions: Permission[],
    isDefault: boolean
  ) {
    try {
      const permRecords = await this.prisma.permission.findMany({
        where: { name: { in: permissions } },
      });

      const role = await this.prisma.role.create({
        data: {
          tenantId,
          name,
          isDefault,
        },
      });

      await this.prisma.rolePermission.createMany({
        data: permRecords.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      });
    } catch (err) {
      this.logger.warn(`Could not seed preset role "${name}" for tenant ${tenantId}: ${err}`);
    }
  }

  /**
   * List all roles for tenant with permission codes and assigned user counts
   */
  async findAll(tenantId: string) {
    // Ensure standard roles exist so tenant always has standard pharmacy profiles
    await this.seedStandardRolesIfMissing(tenantId);

    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    const standardRoleNames = new Set(['owner', 'manager', 'pharmacist', 'cashier', 'staff']);

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      isDefault: role.isDefault || standardRoleNames.has(role.name.toLowerCase()),
      userCount: role._count.userRoles,
      permissions: role.rolePermissions.map((rp) => rp.permission.name),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    }));
  }

  /**
   * Get single role details with permissions
   */
  async findOne(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found for this tenant`);
    }

    return {
      id: role.id,
      name: role.name,
      isDefault: role.isDefault,
      userCount: role._count.userRoles,
      permissions: role.rolePermissions.map((rp) => rp.permission.name),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }

  /**
   * Create a custom role with selected permissions
   */
  async createRole(tenantId: string, dto: CreateRoleDto) {
    const cleanName = dto.name.trim();

    if (cleanName.toLowerCase() === 'owner') {
      throw new BadRequestException('Role name "Owner" is reserved for the primary account owner');
    }

    // Check duplicate name within tenant
    const existing = await this.prisma.role.findFirst({
      where: {
        tenantId,
        name: { equals: cleanName, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`A role named "${cleanName}" already exists in your workspace`);
    }

    await this.ensurePermissionsInDatabase();

    // Verify requested permissions exist
    const validPermRecords = await this.prisma.permission.findMany({
      where: { name: { in: dto.permissionNames } },
    });

    if (validPermRecords.length === 0) {
      throw new BadRequestException('At least one valid system permission must be selected');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          tenantId,
          name: cleanName,
          isDefault: false,
        },
      });

      await tx.rolePermission.createMany({
        data: validPermRecords.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      });

      return role;
    });

    return this.findOne(tenantId, created.id);
  }

  /**
   * Update an existing custom role's name or permissions
   */
  async updateRole(tenantId: string, roleId: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    if (role.name.toLowerCase() === 'owner') {
      throw new BadRequestException('The primary Owner role cannot be modified');
    }

    let cleanName = role.name;
    if (dto.name && dto.name.trim()) {
      cleanName = dto.name.trim();
      if (cleanName.toLowerCase() === 'owner') {
        throw new BadRequestException('Cannot rename role to "Owner"');
      }

      // Check duplicate name
      const duplicate = await this.prisma.role.findFirst({
        where: {
          tenantId,
          name: { equals: cleanName, mode: 'insensitive' },
          id: { not: roleId },
        },
      });

      if (duplicate) {
        throw new ConflictException(`Another role named "${cleanName}" already exists`);
      }
    }

    await this.ensurePermissionsInDatabase();

    await this.prisma.$transaction(async (tx) => {
      // 1. Update role name
      await tx.role.update({
        where: { id: roleId },
        data: { name: cleanName },
      });

      // 2. Update permissions if provided
      if (dto.permissionNames && dto.permissionNames.length > 0) {
        const validPermRecords = await tx.permission.findMany({
          where: { name: { in: dto.permissionNames } },
        });

        // Delete old rolePermissions
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        // Insert new rolePermissions
        await tx.rolePermission.createMany({
          data: validPermRecords.map((p) => ({
            roleId,
            permissionId: p.id,
          })),
        });
      }
    });

    return this.findOne(tenantId, roleId);
  }

  /**
   * Delete a custom role
   */
  async deleteRole(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    if (role.name.toLowerCase() === 'owner') {
      throw new BadRequestException('The primary Owner role cannot be deleted');
    }

    if (role.isDefault) {
      throw new BadRequestException('System default roles cannot be deleted');
    }

    if (role._count.userRoles > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}": ${role._count.userRoles} staff member(s) are currently assigned to it. Reassign them first.`
      );
    }

    await this.prisma.role.delete({
      where: { id: roleId },
    });

    return {
      success: true,
      message: `Role "${role.name}" was successfully removed`,
    };
  }
}
