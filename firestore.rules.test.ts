/**
 * Security Rule Verification Matrix for EDU SMART Firestore Rules.
 * Covers the "Dirty Dozen" adversarial payloads defined in security_spec.md.
 * Run with @firebase/rules-unit-testing against the Firebase Emulator when available.
 */

export const DIRTY_DOZEN_PAYLOADS = [
  {
    name: '01. Unauthenticated studyPlan create',
    collection: 'studyPlans',
    auth: null,
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '02. Unverified email studyPlan create',
    collection: 'studyPlans',
    auth: { uid: 'u1', email_verified: false },
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '03. Identity spoofing ownerId mismatch',
    collection: 'studyPlans',
    auth: { uid: 'attacker', email_verified: true },
    payload: { ownerId: 'victim' },
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '04. Self-assigned teacher role on user create',
    collection: 'users',
    auth: { uid: 'student1', email: 'hs@example.com', email_verified: true },
    payload: { role: 'teacher' },
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '05. Role escalation on user update',
    collection: 'users',
    auth: { uid: 'student1', email: 'hs@example.com', email_verified: true },
    payload: { role: 'teacher' },
    operation: 'update',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '06. Shadow ghost field injection',
    collection: 'thinkEntries',
    auth: { uid: 'student1', email_verified: true },
    payload: { ghostFlag: true },
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '07. PII read on another student profile',
    collection: 'users',
    docId: 'student2',
    auth: { uid: 'student1', email_verified: true },
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '08. Unscoped list query on studyPlans',
    collection: 'studyPlans',
    auth: { uid: 'student1', email_verified: true },
    operation: 'list',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '09. Path ID poisoning with invalid characters',
    collection: 'factChecks',
    docId: 'invalid$id$123',
    auth: { uid: 'student1', email_verified: true },
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Client timestamp forgery instead of request.time',
    collection: 'selfTests',
    auth: { uid: 'student1', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Terminal state score tampering after submitted',
    collection: 'selfTests',
    auth: { uid: 'student1', email_verified: true },
    existingStatus: 'submitted',
    payload: { score: 100 },
    operation: 'update',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Value poisoning out-of-bounds integer or string',
    collection: 'studyPlans',
    auth: { uid: 'student1', email_verified: true },
    payload: { targetMinutes: 999999 },
    operation: 'update',
    expected: 'PERMISSION_DENIED',
  },
];
