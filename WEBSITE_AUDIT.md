# Website audit — 15 November 2026

## Scope and evidence

Reviewed frontend navigation, authentication, dashboard, journeys, profile, communities, ride services, slot joins and rescheduling, chat/socket authorization, serializers, database bootstrap, deployment configuration, and acceptance coverage. No production database connection or production writes were performed. No application source was modified.

Validation: Oxlint passes; Vite production build passes; all 64 acceptance tests pass using an isolated temporary MongoDB outside the sandbox. Inside the sandbox, MongoDB initially failed with Windows file-rename permission errors, then loopback EACCES after moving the temporary directory. These were environment failures, not 64 application failures. Direct function checks confirmed 96 slots/day, three auto seats, 1430 minutes between same-day 00:05 and 23:55, and the problematic 999-hour sentinel for invalid time.

This is a source and automated-test audit, not a complete browser/device/accessibility or production OAuth certification. Passing tests do not prove every function, race condition, failure recovery, or user flow works.

## Urgent release blockers

1. **Database secret in tracked files.** `server/config/db.js:5` and `render.yaml` contain a database URI with credentials. Treat it as exposed regardless of repository visibility; rotate the database password, restrict that account/network permissions, remove the fallback URI, use a required environment secret, and address Git history after rotation. Do not simply delete the string and keep using the password. Credential validity was deliberately not tested.

2. **Private socket access survives membership/session changes.** `server/index.js` checks membership at room entry and tokens at handshake. Leave routes do not call the existing `evictUserFromRoom` helper; logout/password changes increment token version without disconnecting already-connected sockets. A socket can retain private room subscriptions after leaving, and revoked sessions can continue receiving events. Evict every socket on leave/removal, disconnect revoked sessions, and update train/bus creator authorization when an administrator leaves. Test this with two live socket clients, not only HTTP requests.

3. **One active ride is not atomically enforced in slot flows.** `server/routes/slots.js` and community slot joins first query memberships, then independently mutate groups, then overwrite `active_group_id`. Two simultaneous requests for different slots can both succeed. The atomic seat guard protects an individual group, not the student's membership across groups. Use a shared atomic user reservation and transactional group mutation across every join/create/reschedule path.

4. **City-ride alternate join endpoint bypasses safe joins.** `server/routes/groups.js:226` reads capacity then pushes/saves, with no atomic capacity/status predicate. Concurrent calls can violate membership/capacity consistency, and a non-full completed ride has no explicit status rejection in this branch. Consolidate all city join endpoints into one service with atomic capacity, lifecycle, membership, and user reservation guards.

5. **Rescheduling is not a transaction.** `server/routes/slots.js` joins the target, removes the source member, and updates the user separately. Failure after deleting/saving the source rolls back only target membership, not source membership. Concurrent reschedules can also join different targets. Use a transaction plus conditional user reservation; inject failures at every write in regression tests.

## Functional defects

6. **Companions are stranded on reschedule.** Only the account-holder entry moves; entries with `added_by` remain in the source ride. A companion can inherit source admin status. Move the complete party with a capacity check, or explicitly require companions to be removed before rescheduling. City-ride leave paths also need consistent companion cleanup.

7. **Community rescheduling is offered but unsupported.** My Journeys opens the regular reschedule modal for city rides. The modal calls regular slot preview/reschedule endpoints, whose source lookup uses `Group`, not `CityRide`; this produces a source-group 404. Provide a city-aware flow or disable the action with a clear explanation.

8. **Returning reschedule availability uses outward slots.** `src/components/RescheduleSlotModal.jsx` omits direction when fetching slots. The backend preserves old return direction, so the user selects using the wrong journey's capacity/availability. Include direction in both fetch and mutation and keep route labels consistent.

9. **Penalty-preview failure is shown as no penalty.** The modal catches preview failure and substitutes `willIncurPenalty: false`; the actual reschedule may charge a reliability deduction. Block confirmation until preview succeeds or explicitly show that the penalty is unknown.

10. **Invalid dates/times can pass booking checks.** `getHoursUntilDeparture` returns 999 for unparseable timestamps. Slot joins and reschedules check only whether this is negative. They do not enforce canonical date validity, HH:mm ranges, 15-minute alignment, or the booking horizon. Reject invalid values before calculations; share one validator across regular rides, community rides, train/bus groups, and rescheduling.

11. **Already-member comparison ignores direction.** Regular and city slot joins have fallback comparisons using destination/community, date and time without direction. An outward member selecting the same-time return slot can get an incorrect already-enrolled success. Compare canonical slot identity including direction and vehicle/destination.

12. **Featured cards use the wrong API fields.** `DashboardPage.jsx:177` expects fare/capacity fields different from `estimatedFarePerPerson` and `maxSeats`; cards fall back to ₹350 and four seats. A full three-seat auto can appear joinable, only to fail on the backend. Use API `isFull`, `isPast`, `isJoined`, `maxSeats`, `seatsFilled`, and estimated fare directly. Featured selection can also fall back to midnight/past slots when no slot remains after the selected time.

13. **My Journeys mislabels fares, vehicles and routes.** It uses `vehicle` rather than regular group `transport`, falls back to ₹350 when no fare is provided, always renders Thapar → destination even for returns, and offers reschedule broadly. Model the actual route/status/vehicle/fare contract; unknown fare should be labelled unavailable rather than invented.

14. **Profile save is partly cosmetic and prematurely successful.** `ProfilePage.jsx:62` does not await `onUpdateProfile` and immediately reports saved. Backend profile handling ignores roll number, preferred transport, time window, frequent routes and joinedCommunity. Notification settings are local only. Either persist these fields with validation or remove/label unavailable controls. Parent callback must propagate errors to the form.

15. **Profile fabricates personal information.** Defaults include a named student, phone, roll number, degree/year and hometown. Saving an incomplete account can persist invented information. Use empty values and placeholders; require only needed details and validate them. Do not rewrite `HA` as a different free-text hostel representation.

16. **Hostel pickup promise differs from campus booking.** Dashboard lets the student select a hostel, but `handleJoinSlot` sends a fixed Main Gate pickup. Align the selection with the submitted payload and explain whether pickup is per rider or shared by the group.

17. **City slot identity ignores selected landmark.** Community slot keys and queries group by city/date/time/direction, not selected destination landmark. Students selecting different drop points can join the same ride without an explicit agreement. Either define citywide grouping and show agreed stops or include the destination in slot identity.

18. **Optional slot personalization never authenticates.** Public GET `/api/slots` reads `req.user`, but the route has no optional authentication middleware. Merely sending a token does not populate it. `isJoined` therefore remains false. Implement optional token verification while keeping anonymous results masked.

19. **Train/bus administrator succession is inconsistent.** Leaving updates the next member's role but retains `creator_id`; socket authorization still accepts the old creator. Update authoritative ownership and revoke old access together.

20. **Date generation mixes UTC and local time.** Dashboard/city date options use UTC `toISOString()` values with local labels, despite IST comments. Early morning IST can label today with yesterday's value. Reschedule uses display labels as values and infers the current year, creating year-boundary errors. Use ISO dates produced in Asia/Kolkata and separate display labels everywhere.

## Fairness, privacy and truthful product claims

21. **Reliability deductions need lifecycle and fairness guards.** Regular leave/reschedule calculates penalties even for negative hours remaining; completed groups are not explicitly excluded by those service entry checks. City leave via generic group routes does not apply the same penalty. Enforce eligible lifecycle, single application, clear advance disclosure, emergency exceptions/appeal, and consistent policy. Do not announce a member's penalty to everybody unless that disclosure is necessary.

22. **Completed rides are inferred at departure.** Cleanup marks confirmed rides completed once departure passes and increments trip counts. This proves scheduling, not arrival or successful travel. Use departed/awaiting-completion states and a completion acknowledgement or clearly label inferred history. Reliability and trip counts should not imply verified safe arrivals.

23. **Verified account is not verified passenger identity.** Google verifies an institutional mailbox, not current enrollment, personal safety, phone ownership or companions. Companion entries are arbitrary names. Explain verification scope, clearly label unverified companions, and avoid safety guarantees or implied institutional endorsement.

24. **SOS claims require authoritative verification.** The SOS component hardcodes campus contact roles/availability and refers to a cab plate matching an app booking even though the app does not book cabs. Official TIET contact pages searched during the audit did not establish those specific security-number/24x7 role claims. Confirm directly with TIET, record source and last-verified date, and change guidance to refer to the booking the student actually made. SOS is currently a list of call links, not monitored emergency dispatch or live tracking.

25. **Security and environmental wording is misleading.** Profile says 'Campus encryption password' and 'bcrypt encrypted'; bcrypt hashes passwords and does not encrypt chat. `/api/stats` returns `activeGroups * 14` as carbon saved, without actual journey/distance evidence. Rename the password control accurately and remove or explicitly label speculative environmental estimates. Describe savings as conditional estimates, not guaranteed outcomes.

26. **Student safety operations are missing.** Add report/block controls, a real moderation/contact process, impersonation/harassment handling, and minimal evidence retention. Define consent for companion details and phone sharing. Publish understandable privacy, retention, deletion and account-removal information. These are product governance recommendations, not a legal compliance certification.

## Operational improvements

27. **Database failure can look healthy.** `connectDB` catches connection errors and returns false while bootstrap continues; `/api/health` always sends HTTP 200. Render can treat a DB-unusable deployment as healthy. Separate liveness from readiness and return 503 for database readiness failures.

28. **Deployment authentication settings are permissive.** Production missing session secret generates an ephemeral value; restarts invalidate sessions and instances disagree. Fail startup on missing required secrets. CORS accepts any `.onrender.com` origin, broader than the configured application. Use exact origins and a verified external APP_ORIGIN. Review token storage: the frontend requires a localStorage token despite also issuing HttpOnly cookies; prefer a coherent session strategy.

29. **Demo account isolation is incomplete.** Bootstrap allows known-password demo accounts, including an admin-labelled account, when demo seeding is enabled. Disabling seeding later does not remove existing accounts. Keep demo databases separate and remove/revoke seeded accounts before production use; never claim those accounts passed Google verification.

30. **Abuse controls and scale.** Auth limiting combines IP and email in one key, allowing rotating email values to create independent buckets. Add independent per-IP/account limits, posting/join throttles, pagination and bounded database queries. Add regression coverage for concurrency, malformed payloads, socket revocation, year boundaries, failure recovery, real empty states and persistence.

31. **Browser/accessibility coverage is outstanding.** Test real Google sign-in/origin setup, mobile widths, keyboard-only navigation, modal focus trapping/Escape/focus restoration, labels and screen readers, reconnection, slow/offline requests, clipboard denial and stale selected-group data. A successful build does not establish these results.

## Recommended sequence

Rotate secrets first. Then fix socket revocation, shared atomic membership/lifecycle rules and transactional rescheduling. Correct API/UI field contracts, profile persistence, dates and pickup/direction semantics. Resolve safety claims and privacy/governance gaps. Add targeted regressions and run browser tests on an isolated staging database before inviting students.
