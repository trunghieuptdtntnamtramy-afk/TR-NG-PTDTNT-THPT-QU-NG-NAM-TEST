# EDU SMART Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Ownership**: Every record in `studyPlans`, `thinkEntries`, `coachSessions`, `factChecks`, and `selfTests` MUST belong to an authenticated, email-verified user (`ownerId == request.auth.uid`), with `ownerId` and `createdAt` strictly immutable after creation.
2. **PII Isolation**: User profile records in `/users/{userId}` contain `email` PII; reads and writes are strictly scoped to the document owner (`request.auth.uid == userId`) or verified school administrator (`trunghieuptdtntnamtramy@gmail.com`). Blanket `isSignedIn()` reads or lists on `/users` are forbidden.
3. **Role Escalation Prevention**: Users registering a profile in `/users/{userId}` can only create with `role == 'student'` unless they are the verified bootstrapped administrator; non-admin users cannot mutate their `role` field on update.
4. **Strict Payload Boundaries & Temporal Integrity**: Every document write validates exact allowed keys (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update), type & size bounds on all strings/integers, regex-safe IDs (`^[a-zA-Z0-9_\-]+$`), and server timestamps (`request.time`) for `createdAt`/`updatedAt`.
5. **Terminal State Locking**: Once a `studyPlans` item reaches `status == 'completed'` or a `selfTests` item reaches `status == 'submitted'`, non-admin users cannot overwrite core graded/completed fields or revert the terminal status.

## 2. The "Dirty Dozen" Payloads (Adversarial Test Matrix)
1. **Unauthenticated Write**: `create` on `/studyPlans/plan_1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: `create` on `/studyPlans/plan_1` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing**: `create` on `/studyPlans/plan_2` with `ownerId: "victim_uid"` while authenticated as `"attacker_uid"` -> `PERMISSION_DENIED`.
4. **Self-Assigned Admin/Teacher Role**: `create` on `/users/attacker_uid` with `role: "teacher"` by non-admin -> `PERMISSION_DENIED`.
5. **Privilege Escalation on Update**: `update` on `/users/attacker_uid` changing `role` from `"student"` to `"teacher"` -> `PERMISSION_DENIED`.
6. **Shadow Ghost Field Injection**: `create` on `/thinkEntries/t_1` including extra field `isAdminApproved: true` -> `PERMISSION_DENIED`.
7. **PII Blanket Scrape**: `list` or `get` on `/users` or `/users/other_uid` by a student -> `PERMISSION_DENIED`.
8. **Query Trust Bypass**: `list` on `/studyPlans` without `where('ownerId', '==', uid)` filter by student -> `PERMISSION_DENIED`.
9. **ID Poisoning (1.5KB Junk ID)**: `create` on `/factChecks/<1500_char_id>` or `/factChecks/bad$id` -> `PERMISSION_DENIED`.
10. **Client Timestamp Forgery**: `create` on `/selfTests/st_1` with `createdAt` set to a past client date instead of `request.time` -> `PERMISSION_DENIED`.
11. **Terminal State Tampering**: `update` on a `selfTests` document already in `status: "submitted"` attempting to raise `score` from `65` to `100` -> `PERMISSION_DENIED`.
12. **Type & Value Poisoning**: `update` on `/studyPlans/plan_1` setting `targetMinutes: 999999` or `title: <2000 char string>` -> `PERMISSION_DENIED`.
