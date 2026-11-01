// Run after `pnpm --filter @dispenco/web build --webpack`.
// Uses an isolated Next production server and a local fixture API, never a real account.
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const routes = ['dashboard', 'pos', 'inventory', 'transfers', 'purchases', 'suppliers', 'reports', 'chain', 'settings', 'prescriptions', 'customers', 'returns', 'onboarding'];
let child;
let output = '';
const fixture = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const valid = req.headers.authorization === 'Bearer valid-access';
  if (req.url === '/auth/login') {
    res.setHeader('Set-Cookie', 'refresh_token=test-refresh; HttpOnly; Path=/');
    return res.end(JSON.stringify({ success: true, accessToken: 'valid-access', user: { id: 'test-owner', tenantId: 'test-tenant', name: 'Test Owner', role: 'Owner', permissions: [] } }));
  }
  if (req.url === '/auth/me' && valid) return res.end(JSON.stringify({ success: true, user: { id: 'test-owner', tenantId: 'test-tenant', name: 'Test Owner', role: 'Owner', permissions: [] } }));
  res.statusCode = 401; res.end('{}');
});
(async () => {
  await new Promise((resolve) => fixture.listen(0, '127.0.0.1', resolve));
  // Allocate an unused port for this test server.
  const portProbe = http.createServer();
  await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
  const port = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  const base = `http://localhost:${port}`;
  child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', String(port)], {
    cwd: path.resolve(__dirname, '..'), windowsHide: true,
    env: { ...process.env, NODE_ENV: 'production', API_URL: `http://127.0.0.1:${fixture.address().port}` }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => output += chunk);
  child.stderr.on('data', (chunk) => output += chunk);
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch { /* Wait for server startup. */ }
    if (child.exitCode !== null) throw new Error(output);
    await delay(300);
  }
  assert.ok(ready, output);
  for (const route of routes) {
    const response = await fetch(`${base}/${route}`, { redirect: 'manual' });
    assert.equal(response.status, 307, route);
    assert.equal(new URL(response.headers.get('location'), base).pathname, '/login');
  }
  for (const route of ['/', '/login', '/signup', '/contact', '/support', '/privacy', '/terms']) assert.equal((await fetch(base + route)).status, 200, route);
  assert.equal((await fetch(`${base}/dashboard`, { headers: { cookie: 'dispenco_access_token=forged', RSC: '1' }, redirect: 'manual' })).status, 307);
  const valid = await fetch(`${base}/dashboard`, { headers: { cookie: 'dispenco_access_token=valid-access' }, redirect: 'manual' });
  assert.equal(valid.status, 200);
  assert.match(valid.headers.get('cache-control'), /no-store/);
  const login = await fetch(`${base}/api/backend/auth/login`, { method: 'POST', headers: { origin: base, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).accessToken, undefined);
  assert.match(login.headers.get('set-cookie'), /HttpOnly/);
  assert.match(login.headers.get('set-cookie'), /Secure/);
  assert.equal((await fetch(`${base}/api/backend/inventory`)).status, 401);
  assert.equal((await fetch(`${base}/api/backend/auth/login`, { method: 'POST', headers: { origin: 'https://evil.test' }, body: '{}' })).status, 403);
  assert.equal((await fetch(`${base}/support/no-such-guide`)).status, 404);
  assert.equal((await fetch(`${base}/demo`, { redirect: 'manual' })).status, 308);
  console.log('Production smoke passed: all private roots, public pages, RSC rejection, verified access, HttpOnly/Secure login, CSRF, API denial, and legacy redirect.');
})().catch((error) => { console.error(error); console.error(output); process.exitCode = 1; }).finally(async () => {
  child?.kill();
  await new Promise((resolve) => fixture.close(resolve));
});
