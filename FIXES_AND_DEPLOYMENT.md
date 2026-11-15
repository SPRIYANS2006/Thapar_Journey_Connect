# Audit fixes and deployment handoff

The original findings are recorded in WEBSITE_AUDIT.md; it is a historical audit, not the current status.

## Implemented

- Removed tracked database credentials and the fallback connection string. Production requires a configured database, session secret, Google client ID and exact app origin. Database failures stop startup; database readiness returns HTTP 503.
- Transactional ride/community mutations now commit membership, capacity and user reservations together. Notifications and socket eviction run only after commit; transient transaction retries do not send false successes. Tests run on a temporary replica set, matching Atlas transaction support.
- Existing sockets are evicted on group departure; logout and password changes disconnect sessions. Socket expiry is enforced. Train/bus and community ownership follows administrator succession.
- Reschedule failures roll back both bookings. Companions must be removed before changing slots. Community ride reschedule controls are disabled with an explanation until a dedicated city flow exists. Return availability and mutations preserve direction; penalty preview failures block confirmation.
- Invalid dates, times, off-grid slots, closed ride joins and completed-ride cancellation penalties are rejected. Outward/return slot comparisons include direction. Public slot lists optionally authenticate for accurate membership.
- Dashboard uses actual API fare/capacity/status fields and excludes departed slots; unknown journey fares are displayed as unavailable. Profile fields and preferences persist, saves await success, defaults no longer fabricate personal information, and pickup submission uses the selected hostel.
- Browser-readable persistent tokens were removed from localStorage. HttpOnly cookies restore sessions after reload; the frontend retains only an in-memory token for authenticated API/socket use.
- Added safety/privacy information before and after login, a private report/appeal/deletion-request inbox, admin review controls, and account-level message muting. No guaranteed monitoring or response time is claimed. Unverified campus emergency contacts and inaccurate encryption claims were removed. Speculative carbon savings are no longer reported as measured facts.
- Inferred departure history is labelled unverified and does not increment completed-trip counts. Added modal keyboard focus/Escape handling, independent authentication limits and per-account mutation limits. Known demo accounts are disabled in production.

## Validation

Validation completed: **78/78 automated tests passed**, lint passed, and the production build passed. Run `npm run lint`, `npm run build`, and `npm test` to repeat. The acceptance suite uses an isolated MongoMemoryReplSet and must be allowed to start a local process and connect over loopback. Sandbox EACCES errors are environmental failures.

Browser smoke checks used a separate temporary database and headless Edge: cookie restoration after reload, empty journeys, profile save, report submission, mobile overflow and page errors. Live socket checks verify baseline delivery, loss of private messages after departure and session disconnection on logout. No production database was used.

## Required before deployment

1. **Rotate the exposed Atlas credential.** The old credential remains exposed through Git history. Removing it from the working tree does not revoke it. Check database access logs and restrict database/network privileges. History cleanup requires deliberate coordination with repository collaborators; do not force-push blindly.
2. In Render, replace `MONGODB_URI` with the newly rotated secret. Set a stable random `SESSION_SECRET` (at least 32 characters), `GOOGLE_CLIENT_ID`, `APP_ORIGIN` to the actual HTTPS application origin, and `NODE_ENV=production`. Existing dashboard values must be replaced explicitly; changing the blueprint does not revoke old credentials.
3. Use MongoDB Atlas or a local replica set. Standalone MongoDB is no longer sufficient for ride writes. Back up existing data and validate a staging deployment before routing students to it.
4. Configure Google's authorized JavaScript origins for the real application origin and test institutional sign-in there. Real Google OAuth/domain configuration was not tested against the production account.
5. Provision a real verified administrator through the database/account operator. Known demo administrator credentials are disabled. Someone must review the Safety & privacy inbox and process appeals/deletion requests; the app does not promise this happens automatically.
6. Configure Render to build with `npm ci --include=dev && npm run build`, start with `npm start`, and use `/api/health`. Verify HTTP 200 with database connected, real sign-in, two-user ride joining/chat, departure/revocation and logout on the deployed URL.

## Deliberate limits

This release does not supply monitored SOS dispatch, verified drivers, vehicle reservations, automatic legal compliance, automatic retention/deletion, or verified safe arrival. Message mute is a display control, not a guarantee that another group member cannot see previously shared information. Fare amounts remain estimates. Campus contact numbers require direct institutional verification before publication. Further performance/load testing and broader assistive-technology/device coverage are still appropriate before large-scale rollout.

No deployment or credential rotation was performed as part of these local fixes.
