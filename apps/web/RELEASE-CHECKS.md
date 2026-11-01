# Landing page and authentication release checks

## Session boundary

- Browser API calls use `/api/backend`; access and refresh tokens are HttpOnly,
  SameSite=Lax cookies, with Secure enabled in production. No identity or role is
  restored from local storage. Old cached identities are discarded.
- Set server-only `API_URL` to the API URL reachable from Next.js, including
  `/api/v1`. `NEXT_PUBLIC_API_URL` remains the public integration documentation URL
  and a compatibility fallback. Serve the web app over HTTPS in production.
- `src/proxy.ts` verifies private requests (including RSC navigation) with
  `/auth/me`. Failed authentication redirects to login with a validated local
  return path. Verification outages return 503; they never grant access.
- `ProtectedRoute` waits for API verification and uses the same page permission
  policy as the server. Account changes clear the React Query cache. Focus and
  cross-tab session changes trigger verification.
- Offline caches and sale queues use a separate IndexedDB namespace for each
  verified user and tenant. Logout locks access without deleting pending sales;
  signing in to the same account restores its queue. Background sync checks account
  identity before sending each sale. The old unscoped `DispencoPosDatabase` is
  preserved but never automatically attributed to an account: review/export any
  legacy unsynced sales under their verified owner before upgrading an existing POS.
- Nest verifies signed, unexpired access tokens, active accounts, current token
  versions and tenant identity. Permissions come from current database roles.
  API requests use Bearer authorization; web cookie credentials terminate at Next.
- Access tokens last 15 minutes; refresh tokens last 30 days and use a different
  secret and token purpose. Logout invalidates existing tokens. Deploy API and web
  together: older tokens without a purpose claim require signing in again.
- Production requires distinct JWT secrets of at least 32 characters and explicit
  HTTPS `CLIENT_URL` origins. Configure secrets through the deployment secret store.
- Browser mutations must include the web app's Origin. Do not expose the internal
  API forwarding layer as an unauthenticated third-party API.

## Repeatable validation

From the workspace root:

```powershell
pnpm --filter @dispenco/web test
pnpm --filter @dispenco/api test
pnpm --filter @dispenco/web lint
pnpm --filter @dispenco/web typecheck
pnpm --filter @dispenco/api typecheck
pnpm --filter @dispenco/api build
pnpm --filter @dispenco/web build --webpack
pnpm --filter @dispenco/web test:production
```

Tests use isolated local servers and in-memory API fixtures. They cover anonymous,
forged, expired and revoked sessions, current permissions, tenant mismatch, token
purpose separation, CSRF rejection, safe redirects, cookies and production routing.
These replace the previous scripts that only printed “tests passed.” Existing
legacy Jest spec files are not included in these focused Node test suites.

Browser checks: desktop/mobile menu and its close behavior, both themes, all four
section links, monthly/yearly pricing, all eight FAQ items, signup/login destinations,
contact links, support search/reset/guides, separate privacy and terms pages, and
anonymous Dashboard navigation. AI preview controls intentionally remain disabled
and labelled “Coming soon.” Email and WhatsApp URLs are validated without sending
messages.

## Before a live launch

- Run signup, store onboarding, login, refresh, role changes and logout against the
  deployed API/PostgreSQL/Redis services over HTTPS. Automated fixtures do not prove
  live database migrations, reverse proxy settings or external services are ready.
- Configure ingress rate limiting for login/signup/refresh and monitor failed auth
  attempts. Verify backup/restore, error monitoring and secret management in the
  deployment environment.
- Approve the provisional Privacy Policy and Terms, and replace/approve illustrative
  pricing and example testimonials. See `MARKETING.md`.
- Test Safepay end to end with configured credentials and signed webhooks. A browser
  tracker cannot mark an invoice paid, and a return URL cannot announce success on
  its own. Production simulated renewals are disabled. Webhook retries/concurrency
  and settlement reconciliation still need a dedicated billing review before taking
  real payments; this route audit is not a payment-system certification.
