require('./load-source.cjs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { NextRequest } = require('next/server');
const { proxy } = require('../src/proxy.ts');
const route = require('../src/app/api/backend/[...path]/route.ts');
const { safeReturnPath, PROTECTED_ROOTS, canAccessPage } = require('../src/lib/auth-policy.ts');
let server;
let outage = false;
const owner = { id: 'user-1', tenantId: 'tenant-1', name: 'Test Owner', role: 'Owner', permissions: [] };
const staff = { ...owner, role: 'Staff', permissions: ['inventory:read'] };

before(async () => {
  server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
    if (outage) return send(503, { message: 'Offline' });
    if (req.url === '/auth/refresh') {
      let body = ''; req.on('data', (chunk) => body += chunk);
      return req.on('end', () => {
        if (JSON.parse(body).refreshToken !== 'valid-refresh') return send(401, {});
        res.setHeader('Set-Cookie', 'refresh_token=valid-refresh; HttpOnly; Path=/');
        send(200, { accessToken: 'valid-access' });
      });
    }
    if (req.url === '/auth/login' || req.url === '/auth/signup') {
      res.setHeader('Set-Cookie', 'refresh_token=valid-refresh; HttpOnly; Path=/');
      return send(200, { accessToken: 'valid-access', user: owner, success: true });
    }
    if (!['Bearer valid-access', 'Bearer staff-access'].includes(req.headers.authorization)) return send(401, {});
    if (req.url === '/auth/me') return send(200, { user: req.headers.authorization === 'Bearer staff-access' ? staff : owner });
    if (req.url === '/auth/logout') return send(200, { success: true });
    return send(200, { success: true });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.API_URL = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));
const request = (path, cookie = '', init = {}) => new NextRequest(`https://dispenco.test${path}`, { ...init, headers: { cookie, ...init.headers } });
const call = (path, cookie = '', init = {}) => route[init.method || 'GET'](request(`/api/backend/${path}`, cookie, init), { params: Promise.resolve({ path: path.split('/') }) });

test('all private route roots and nested routes reject anonymous and forged sessions', async () => {
  for (const root of PROTECTED_ROOTS) {
    for (const suffix of ['', '/nested']) {
      const result = await proxy(request(`/${root}${suffix}?tab=test`));
      assert.equal(result.status, 307);
      assert.equal(new URL(result.headers.get('location')).pathname, '/login');
      assert.equal(new URL(result.headers.get('location')).searchParams.get('next'), `/${root}${suffix}?tab=test`);
    }
  }
  const result = await proxy(request('/dashboard', 'dispenco_access_token=forged'));
  assert.equal(result.status, 307);
  assert.match(result.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await proxy(request('/%64ashboard'))).status, 307);
});
test('every dashboard route group is covered by the shared protection policy', () => {
  const directory = path.resolve(__dirname, '../src/app/(dashboard)');
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) assert.ok(PROTECTED_ROOTS.includes(entry.name), `Missing protection for ${entry.name}`);
  }
});
test('RSC navigation is protected and private HTML is never publicly cached', async () => {
  assert.equal((await proxy(request('/dashboard', '', { headers: { RSC: '1', 'Next-Router-Prefetch': '1' } }))).status, 307);
  const valid = await proxy(request('/dashboard', 'dispenco_access_token=valid-access'));
  assert.equal(valid.headers.get('x-middleware-next'), '1');
  assert.match(valid.headers.get('cache-control'), /private, no-store/);
});
test('expired access refreshes through server cookies; invalid refresh is rejected', async () => {
  const result = await proxy(request('/inventory', 'dispenco_access_token=expired; refresh_token=valid-refresh'));
  assert.equal(result.headers.get('x-middleware-next'), '1');
  assert.match(result.headers.get('set-cookie'), /HttpOnly/);
  assert.equal((await proxy(request('/dashboard', 'refresh_token=invalid'))).status, 307);
});
test('permissions are enforced on the server and shared with client navigation', async () => {
  assert.equal((await proxy(request('/settings', 'dispenco_access_token=staff-access'))).status, 403);
  assert.equal((await proxy(request('/inventory', 'dispenco_access_token=staff-access'))).status, 200);
  assert.equal(canAccessPage('/settings', staff), false);
  assert.equal(canAccessPage('/inventory', staff), true);
});
test('return URLs cannot redirect off site or into an auth loop', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/signup', '/dashboard\n', '/dashboard/../../login']) assert.equal(safeReturnPath(value), '/dashboard');
  assert.equal(safeReturnPath('/inventory?search=panadol'), '/inventory?search=panadol');
});
test('public routes stay public and signed-in guest routes redirect safely', async () => {
  for (const path of ['/', '/contact', '/support', '/privacy', '/terms']) assert.equal((await proxy(request(path))).status, 200);
  const result = await proxy(request('/login?next=https://evil.test', 'dispenco_access_token=valid-access'));
  assert.equal(result.headers.get('location'), 'https://dispenco.test/dashboard');
});
test('same-origin login sets HttpOnly credentials without exposing the JWT', async () => {
  const result = await call('auth/login', '', { method: 'POST', headers: { origin: 'https://dispenco.test', 'content-type': 'application/json' }, body: '{}' });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).accessToken, undefined);
  assert.match(result.headers.get('set-cookie'), /dispenco_access_token=valid-access.*HttpOnly/);
  assert.match(result.headers.get('set-cookie'), /SameSite=lax/);
});
test('API rejects anonymous access, untrusted bearer headers, cross-origin writes, and path escapes', async () => {
  assert.equal((await call('inventory')).status, 401);
  assert.equal((await call('inventory', '', { headers: { authorization: 'Bearer valid-access' } })).status, 401);
  assert.equal((await call('auth/login', '', { method: 'POST', headers: { origin: 'https://evil.test' }, body: '{}' })).status, 403);
  assert.equal((await call('auth/logout', 'dispenco_access_token=valid-access', { method: 'POST', headers: { origin: 'https://evil.test' } })).status, 403);
  assert.equal((await call('inventory/%2e%2e')).status, 400);
  assert.equal((await call('auth/refresh', '', { method: 'POST', headers: { origin: 'https://dispenco.test' } })).status, 404);
});
test('API silently refreshes and logout clears both cookies', async () => {
  assert.equal((await call('inventory', 'refresh_token=valid-refresh')).status, 200);
  const result = await call('auth/logout', 'dispenco_access_token=valid-access', { method: 'POST', headers: { origin: 'https://dispenco.test' } });
  assert.equal(result.status, 200);
  assert.match(result.headers.get('set-cookie'), /dispenco_access_token=;.*Max-Age=0/);
  assert.match(result.headers.get('set-cookie'), /refresh_token=;.*Max-Age=0/);
});
test('backend failures fail closed without destroying a potentially valid session', async () => {
  outage = true;
  try {
    const result = await proxy(request('/dashboard', 'dispenco_access_token=valid-access'));
    assert.equal(result.status, 503);
    assert.equal(result.headers.get('set-cookie'), null);
    assert.equal((await call('inventory', 'dispenco_access_token=valid-access')).status, 503);
  } finally { outage = false; }
});
test('offline databases are isolated across accounts and locked after sign out without deleting queues', () => {
  const { setSessionIdentity } = require('../src/lib/session-identity.ts');
  const { getPosDatabase, assertActivePosDatabase } = require('../src/features/pos/db/pos-db.ts');
  assert.throws(getPosDatabase, /verified session/);
  setSessionIdentity({ id: 'owner-1', tenantId: 'pharmacy-1' });
  const first = getPosDatabase();
  assert.notEqual(first.name, 'DispencoPosDatabase');
  setSessionIdentity({ id: 'owner-2', tenantId: 'pharmacy-1' });
  const second = getPosDatabase();
  assert.notEqual(first.name, second.name);
  assert.throws(() => assertActivePosDatabase(first), /session changed/);
  setSessionIdentity({ id: 'owner-1', tenantId: 'pharmacy-2' });
  assert.notEqual(first.name, getPosDatabase().name);
  setSessionIdentity(null);
  assert.throws(getPosDatabase, /verified session/);
  setSessionIdentity({ id: 'owner-1', tenantId: 'pharmacy-1' });
  assert.equal(getPosDatabase(), first);
  setSessionIdentity(null);
});
