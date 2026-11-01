import { Prisma } from '@prisma/client';

export const sessionUserInclude = {
  tenant: {
    include: {
      stores: { where: { isActive: true }, orderBy: { createdAt: 'asc' as const }, take: 1 },
    },
  },
  userRoles: {
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
  },
} satisfies Prisma.UserInclude;

export type SessionUser = Prisma.UserGetPayload<{ include: typeof sessionUserInclude }>;

/** Resolve authority from current database assignments, never stale token claims. */
export function sessionProfile(user: SessionUser) {
  const roles = user.userRoles
    .map(({ role }) => role)
    .filter((role) => role.tenantId === user.tenantId);
  const primaryRole = roles.find((role) => role.name.toLowerCase() === 'owner') || roles[0];
  const store = user.tenant.stores[0];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
    storeId: store?.id,
    storeName: store?.name,
    role: primaryRole?.name || 'User',
    permissions: [
      ...new Set(
        roles.flatMap((role) => role.rolePermissions.map(({ permission }) => permission.name)),
      ),
    ],
  };
}
