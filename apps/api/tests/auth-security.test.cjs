// Execute real Nest guards and controllers over HTTP with an in-memory DB fixture.
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true }, fileName: filename,
}).outputText, filename);
require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { Test } = require('@nestjs/testing');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { ConfigService } = require('@nestjs/config');
const { PassportModule } = require('@nestjs/passport');
const { AuthController } = require('../src/modules/auth/auth.controller.ts');
const { AuthService } = require('../src/modules/auth/auth.service.ts');
const { JwtStrategy } = require('../src/modules/auth/strategies/jwt.strategy.ts');
const { PrismaService } = require('../src/modules/prisma/prisma.service.ts');
const { InventoryController } = require('../src/modules/inventory/inventory.controller.ts');
const { InventoryService } = require('../src/modules/inventory/inventory.service.ts');
const { TaxRatesController } = require('../src/modules/tax-rates/tax-rates.controller.ts');
const { TaxRatesService } = require('../src/modules/tax-rates/tax-rates.service.ts');
const { SafepayService } = require('../src/modules/billing/safepay.service.ts');
const { envValidationSchema } = require('../src/common/config/env.schema.ts');
const accessSecret = 'test-access-secret-at-least-thirty-two-characters';
const refreshSecret = 'different-test-refresh-secret-thirty-two-characters';
let app, base, jwt, user;
const permission = (name) => ({ permission: { name } });
const role = (name, permissions, tenantId = 'tenant-1') => ({ role: { name, tenantId, rolePermissions: permissions.map(permission) } });
const payload = (extra = {}) => ({ sub: 'user-1', email: 'test@example.invalid', tenantId: 'tenant-1', tokenVersion: user.tokenVersion, role: 'Owner', permissions: ['settings:manage'], tokenUse: 'access', ...extra });
const token = (extra = {}, options = {}) => jwt.sign(payload(extra), { expiresIn: '15m', ...options });
const send = (path, bearer, method = 'GET', body) => fetch(`${base}/${path}`, { method, headers: { ...(bearer && { Authorization: `Bearer ${bearer}` }), 'Content-Type': 'application/json' }, ...(body && { body: JSON.stringify(body) }) });
before(async () => {
  user = { id: 'user-1', name: 'Test User', email: 'test@example.invalid', tenantId: 'tenant-1', tokenVersion: 1, isActive: true, passwordHash: await bcrypt.hash('test-password-only', 4), tenant: { stores: [{ id: 'store-1', name: 'Main Branch' }] }, userRoles: [role('Staff', ['inventory:read'])] };
  const module = await Test.createTestingModule({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret: accessSecret })],
    controllers: [AuthController, InventoryController, TaxRatesController],
    providers: [AuthService, JwtStrategy,
      { provide: ConfigService, useValue: new ConfigService({ JWT_SECRET: accessSecret, REFRESH_TOKEN_SECRET: refreshSecret }) },
      { provide: PrismaService, useValue: { user: { findUnique: async () => user, findFirst: async () => user, update: async () => { user.tokenVersion++; return user; } } } },
      { provide: InventoryService, useValue: { getInventoryAggregation: () => ({ success: true }), updateBatch: () => ({ success: true }) } },
      { provide: TaxRatesService, useValue: { create: () => ({ success: true }) } },
    ],
  }).compile();
  app = module.createNestApplication({ logger: false });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  jwt = module.get(JwtService);
});
after(async () => { await app?.close(); });

test('anonymous, forged, expired, refresh, and wrong-tenant tokens cannot access API data', async () => {
  for (const value of [undefined, 'forged', token({}, { expiresIn: -1 }), token({ tokenUse: 'refresh' }), token({ tenantId: 'other-tenant' }), token({ tokenUse: undefined })]) {
    assert.equal((await send('auth/me', value)).status, 401);
  }
  const refresh = jwt.sign(payload({ tokenUse: 'refresh' }), { secret: refreshSecret });
  assert.equal((await send('auth/me', refresh)).status, 401);
});
test('server profile uses current DB roles, not the Owner claim in an old JWT', async () => {
  const bearer = token();
  const response = await send('auth/me', bearer);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.user.id, 'user-1');
  assert.equal(data.user.storeName, 'Main Branch');
  assert.equal(data.user.role, 'Staff');
  assert.deepEqual(data.user.permissions, ['inventory:read']);
  assert.equal(data.user.tokenVersion, undefined);
  assert.equal((await send('auth/settings-check', bearer)).status, 403);
  user.userRoles = [role('Manager', ['settings:manage'])];
  assert.equal((await send('auth/settings-check', bearer)).status, 200);
  user.userRoles = [role('Staff', ['inventory:read'])];
});
test('stock and tax mutations reject authenticated users without explicit permissions', async () => {
  assert.equal((await send('inventory', token())).status, 200);
  assert.equal((await send('inventory/batches/batch-1', token(), 'PATCH', {})).status, 403);
  assert.equal((await send('tax-rates', token(), 'POST', {})).status, 403);
});
test('inactive users and cross-tenant role assignments cannot gain access', async () => {
  user.isActive = false;
  assert.equal((await send('auth/me', token())).status, 401);
  user.isActive = true;
  user.userRoles = [role('Owner', ['settings:manage'], 'other-tenant')];
  assert.equal((await send('auth/settings-check', token())).status, 403);
  user.userRoles = [role('Staff', ['inventory:read'])];
});
test('login issues separate access and refresh tokens in HttpOnly cookies', async () => {
  const response = await send('auth/login', undefined, 'POST', { email: user.email, password: 'test-password-only' });
  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(jwt.verify(data.accessToken).tokenUse, 'access');
  const cookies = response.headers.getSetCookie();
  assert.ok(cookies.every((cookie) => cookie.includes('HttpOnly')));
  const refresh = cookies.find((cookie) => cookie.startsWith('refresh_token=')).split(';')[0].slice('refresh_token='.length);
  assert.equal(jwt.verify(refresh, { secret: refreshSecret }).tokenUse, 'refresh');
  assert.throws(() => jwt.verify(refresh));
  assert.equal((await send('auth/refresh', undefined, 'POST', { refreshToken: data.accessToken })).status, 401);
  assert.equal((await send('auth/refresh', undefined, 'POST', { refreshToken: refresh })).status, 201);
});
test('logout revokes both existing access and refresh tokens', async () => {
  const bearer = token();
  const refresh = jwt.sign(payload({ tokenUse: 'refresh' }), { secret: refreshSecret });
  assert.equal((await send('auth/logout', bearer, 'POST')).status, 201);
  assert.equal((await send('auth/me', bearer)).status, 401);
  assert.equal((await send('auth/refresh', undefined, 'POST', { refreshToken: refresh })).status, 401);
});

test('a browser payment tracker cannot settle or extend an unpaid invoice', async () => {
  let status = 'PENDING';
  const service = new SafepayService(new ConfigService({}), { subscriptionInvoice: { findUnique: async () => ({ tenantId: 'tenant-1', status }) } }, { getTenantSubscription: async () => ({ status: 'ACTIVE' }) });
  await assert.rejects(service.verifySession('', 'tenant-1'), /tracker is required/);
  await assert.rejects(service.verifySession('tracker-1', 'other-tenant'), /Payment not found/);
  await assert.rejects(service.verifySession('tracker-1', 'tenant-1'), /pending/);
  status = 'PAID';
  assert.deepEqual(await service.verifySession('tracker-1', 'tenant-1'), { status: 'ACTIVE' });
});
test('production rejects weak/shared JWT secrets and wildcard HTTP origins', () => {
  const config = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://test', REDIS_URL: 'redis://test', JWT_SECRET: accessSecret, REFRESH_TOKEN_SECRET: refreshSecret, CLIENT_URL: 'https://dispenco.test' };
  assert.equal(envValidationSchema.validate(config).error, undefined);
  for (const bad of [{ JWT_SECRET: 'weak' }, { REFRESH_TOKEN_SECRET: accessSecret }, { CLIENT_URL: '*' }, { CLIENT_URL: 'http://dispenco.test' }]) assert.ok(envValidationSchema.validate({ ...config, ...bad }).error);
});
