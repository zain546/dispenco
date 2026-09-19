import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all staff members for tenant with role assignments
   */
  async findAll(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => {
      const primaryRole = u.userRoles[0]?.role;
      const roleName = primaryRole?.name || 'Staff';
      const roleId = primaryRole?.id || null;
      const isOwner = roleName.toLowerCase() === 'owner';

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        isActive: u.isActive,
        role: roleName,
        roleId,
        isOwner,
        createdAt: u.createdAt.toISOString(),
      };
    });
  }

  /**
   * Find single user by ID
   */
  async findOne(tenantId: string, userId: string) {
    const u = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!u) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const primaryRole = u.userRoles[0]?.role;
    const roleName = primaryRole?.name || 'Staff';

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      role: roleName,
      roleId: primaryRole?.id || null,
      isOwner: roleName.toLowerCase() === 'owner',
      createdAt: u.createdAt.toISOString(),
    };
  }

  /**
   * Create / Invite a new staff team member
   */
  async createUser(tenantId: string, dto: CreateUserDto) {
    const cleanEmail = dto.email.toLowerCase().trim();

    // Check if email is already taken
    const existing = await this.prisma.user.findFirst({
      where: { email: cleanEmail },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    // Verify role belongs to tenant
    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Selected role was not found in this workspace');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const created = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          email: cleanEmail,
          phone: dto.phone?.trim() || null,
          passwordHash,
          isActive: true,
          tokenVersion: 1,
        },
      });

      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: role.id,
        },
      });

      return newUser;
    });

    return this.findOne(tenantId, created.id);
  }

  /**
   * Update an existing staff member's profile, role, or active status
   */
  async updateUser(
    tenantId: string,
    userId: string,
    currentUserId: string,
    dto: UpdateUserDto
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const isTargetOwner = user.userRoles.some(
      (ur) => ur.role?.name.toLowerCase() === 'owner'
    );

    // Safety guard: cannot deactivate self
    if (userId === currentUserId && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    // Safety guard: cannot deactivate or remove Owner role from last active owner
    if (isTargetOwner) {
      const isDeactivating = dto.isActive === false;
      const isDemoting = dto.roleId && !user.userRoles.some((ur) => ur.roleId === dto.roleId);

      if (isDeactivating || isDemoting) {
        const activeOwnersCount = await this.prisma.user.count({
          where: {
            tenantId,
            isActive: true,
            userRoles: {
              some: {
                role: { name: 'Owner' },
              },
            },
          },
        });

        if (activeOwnersCount <= 1) {
          throw new BadRequestException(
            'Cannot deactivate or change the role of the last active Owner account'
          );
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Role update
      if (dto.roleId) {
        const newRole = await tx.role.findFirst({
          where: { id: dto.roleId, tenantId },
        });

        if (!newRole) {
          throw new NotFoundException('Selected role not found');
        }

        await tx.userRole.deleteMany({
          where: { userId },
        });

        await tx.userRole.create({
          data: {
            userId,
            roleId: newRole.id,
          },
        });

        // Invalidate current user tokens so permissions immediately update on next request
        await tx.user.update({
          where: { id: userId },
          data: { tokenVersion: { increment: 1 } },
        });
      }

      // 2. User profile & active state update
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    });

    return this.findOne(tenantId, userId);
  }

  /**
   * Deactivate a staff member
   */
  async deleteUser(tenantId: string, userId: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new BadRequestException('You cannot delete or deactivate your own account');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const isTargetOwner = user.userRoles.some(
      (ur) => ur.role?.name.toLowerCase() === 'owner'
    );

    if (isTargetOwner) {
      throw new BadRequestException('Owner accounts cannot be deleted');
    }

    // Soft-deactivate user and revoke all active JWT tokens
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        tokenVersion: { increment: 1 },
      },
    });

    return {
      success: true,
      message: `User account for "${user.name}" was deactivated`,
    };
  }
}
