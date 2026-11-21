import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ADMIN_EMAIL, db, handleFirestoreError, OperationType } from './firebase';
import {
  CoachSession,
  FactCheckRecord,
  FactCheckVerdictStatus,
  SelfTestRecord,
  StudyPlan,
  StudyPlanStatus,
  ThinkEntry,
  UserProfile,
} from './types';

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
}

function clampStr(val: string, max: number): string {
  return (val ?? '').trim().slice(0, max);
}

function clampInt(val: number, min: number, max: number): number {
  const n = Math.round(Number(val) || 0);
  return Math.max(min, Math.min(max, n));
}

export async function ensureUserProfile(params: {
  uid: string;
  displayName: string;
  email: string;
}): Promise<UserProfile> {
  const path = `users/${params.uid}`;
  const ref = doc(db, 'users', params.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    const isAdminEmail = params.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const profile: UserProfile = {
      uid: clampStr(params.uid, 128),
      displayName: clampStr(params.displayName || params.email.split('@')[0] || 'Học sinh', 120),
      email: clampStr(params.email, 180),
      role: isAdminEmail ? 'teacher' : 'student',
      className: isAdminEmail ? 'Giáo viên' : '11A1',
      schoolName: 'Trường PTDTNT THPT Quảng Nam',
    };
    await setDoc(ref, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfileInfo(
  uid: string,
  updates: { displayName: string; className: string; schoolName: string }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: clampStr(updates.displayName || 'Học sinh', 120),
      className: clampStr(updates.className || '11A1', 60),
      schoolName: clampStr(updates.schoolName || 'Trường PTDTNT THPT Quảng Nam', 140),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

function toMillis(val: unknown): number {
  if (!val || typeof val !== 'object') return 0;
  const maybeTs = val as { toMillis?: () => number; seconds?: number };
  if (typeof maybeTs.toMillis === 'function') return maybeTs.toMillis();
  if (typeof maybeTs.seconds === 'number') return maybeTs.seconds * 1000;
  return 0;
}

export function subscribeOwnedCollection<T extends { updatedAt?: unknown }>(
  collectionName: string,
  ownerId: string,
  isAdminView: boolean,
  onData: (items: T[]) => void
) {
  const colRef = collection(db, collectionName);
  const q = isAdminView
    ? query(colRef, orderBy('updatedAt', 'desc'))
    : query(colRef, where('ownerId', '==', ownerId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown as T);
      items.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  );
}

// 01. Study Plans
export async function createStudyPlan(
  ownerId: string,
  ownerName: string,
  input: {
    subject: string;
    title: string;
    goal: string;
    targetMinutes: number;
    dueDate: string;
  }
): Promise<string> {
  const id = makeSafeId('plan');
  const path = `studyPlans/${id}`;
  try {
    await setDoc(doc(db, 'studyPlans', id), {
      id,
      ownerId: clampStr(ownerId, 128),
      ownerName: clampStr(ownerName || 'Học sinh', 120),
      subject: clampStr(input.subject || 'Toán học', 80),
      title: clampStr(input.title, 180),
      goal: clampStr(input.goal || 'Hoàn thành bài tự học đúng tiến độ', 400),
      targetMinutes: clampInt(input.targetMinutes, 1, 600),
      actualMinutes: 0,
      dueDate: clampStr(input.dueDate || new Date().toISOString().slice(0, 10), 30),
      status: 'planned' as StudyPlanStatus,
      reflection: '',
      sheetUrl: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateStudyPlanProgress(
  id: string,
  updates: {
    status: StudyPlanStatus;
    actualMinutes: number;
    reflection: string;
  }
): Promise<void> {
  const path = `studyPlans/${id}`;
  try {
    await updateDoc(doc(db, 'studyPlans', id), {
      status: updates.status,
      actualMinutes: clampInt(updates.actualMinutes, 0, 1200),
      reflection: clampStr(updates.reflection, 800),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function attachStudyPlanSheetUrl(id: string, sheetUrl: string): Promise<void> {
  const path = `studyPlans/${id}`;
  try {
    await updateDoc(doc(db, 'studyPlans', id), {
      sheetUrl: clampStr(sheetUrl, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStudyPlan(id: string): Promise<void> {
  const path = `studyPlans/${id}`;
  try {
    await deleteDoc(doc(db, 'studyPlans', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 02. Think First
export async function saveThinkEntry(
  ownerId: string,
  ownerName: string,
  input: {
    subject: string;
    topic: string;
    initialAnswer: string;
    keyArguments: string;
    confidence: number;
    aiFeedback: string;
    unlockedCoach: boolean;
  }
): Promise<string> {
  const id = makeSafeId('think');
  const path = `thinkEntries/${id}`;
  try {
    await setDoc(doc(db, 'thinkEntries', id), {
      id,
      ownerId: clampStr(ownerId, 128),
      ownerName: clampStr(ownerName || 'Học sinh', 120),
      subject: clampStr(input.subject || 'Tổng hợp', 80),
      topic: clampStr(input.topic, 240),
      initialAnswer: clampStr(input.initialAnswer, 3000),
      keyArguments: clampStr(input.keyArguments, 1500),
      confidence: clampInt(input.confidence, 1, 5),
      aiFeedback: clampStr(input.aiFeedback, 2500),
      unlockedCoach: Boolean(input.unlockedCoach),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// 03. AI Coach Sessions
export async function createCoachSession(
  ownerId: string,
  ownerName: string,
  input: {
    rolePersona: string;
    modelUsed: string;
    topic: string;
    messagesCount: number;
    lastMessagePreview: string;
    transcript: string;
  }
): Promise<string> {
  const id = makeSafeId('coach');
  const path = `coachSessions/${id}`;
  try {
    await setDoc(doc(db, 'coachSessions', id), {
      id,
      ownerId: clampStr(ownerId, 128),
      ownerName: clampStr(ownerName || 'Học sinh', 120),
      rolePersona: clampStr(input.rolePersona, 100),
      modelUsed: clampStr(input.modelUsed, 80),
      topic: clampStr(input.topic, 240),
      messagesCount: clampInt(input.messagesCount, 0, 200),
      lastMessagePreview: clampStr(input.lastMessagePreview, 500),
      transcript: clampStr(input.transcript, 15000),
      docUrl: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCoachSession(
  id: string,
  updates: {
    modelUsed: string;
    messagesCount: number;
    lastMessagePreview: string;
    transcript: string;
  }
): Promise<void> {
  const path = `coachSessions/${id}`;
  try {
    await updateDoc(doc(db, 'coachSessions', id), {
      modelUsed: clampStr(updates.modelUsed, 80),
      messagesCount: clampInt(updates.messagesCount, 0, 200),
      lastMessagePreview: clampStr(updates.lastMessagePreview, 500),
      transcript: clampStr(updates.transcript, 15000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function attachCoachDocUrl(id: string, docUrl: string): Promise<void> {
  const path = `coachSessions/${id}`;
  try {
    await updateDoc(doc(db, 'coachSessions', id), {
      docUrl: clampStr(docUrl, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 04. Fact Checks
export async function createFactCheckRecord(
  ownerId: string,
  ownerName: string,
  input: {
    claim: string;
    textbookSource: string;
    aiVerdict: string;
    sourcesCount: number;
    studentConclusion: string;
    verdictStatus: FactCheckVerdictStatus;
  }
): Promise<string> {
  const id = makeSafeId('fact');
  const path = `factChecks/${id}`;
  try {
    await setDoc(doc(db, 'factChecks', id), {
      id,
      ownerId: clampStr(ownerId, 128),
      ownerName: clampStr(ownerName || 'Học sinh', 120),
      claim: clampStr(input.claim, 2000),
      textbookSource: clampStr(input.textbookSource, 300),
      aiVerdict: clampStr(input.aiVerdict, 4000),
      sourcesCount: clampInt(input.sourcesCount, 0, 30),
      studentConclusion: clampStr(input.studentConclusion, 2000),
      verdictStatus: input.verdictStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFactCheckConclusion(
  id: string,
  updates: {
    textbookSource: string;
    studentConclusion: string;
    verdictStatus: FactCheckVerdictStatus;
  }
): Promise<void> {
  const path = `factChecks/${id}`;
  try {
    await updateDoc(doc(db, 'factChecks', id), {
      textbookSource: clampStr(updates.textbookSource, 300),
      studentConclusion: clampStr(updates.studentConclusion, 2000),
      verdictStatus: updates.verdictStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 05. Self Tests
export async function saveSubmittedSelfTest(
  ownerId: string,
  ownerName: string,
  input: {
    subject: string;
    topic: string;
    question: string;
    studentExplanation: string;
    appliedScenario: string;
    score: number;
    rubricFeedback: string;
    durationSeconds: number;
    formUrl?: string;
  }
): Promise<string> {
  const id = makeSafeId('selftest');
  const path = `selfTests/${id}`;
  try {
    await setDoc(doc(db, 'selfTests', id), {
      id,
      ownerId: clampStr(ownerId, 128),
      ownerName: clampStr(ownerName || 'Học sinh', 120),
      subject: clampStr(input.subject || 'Tổng hợp', 80),
      topic: clampStr(input.topic, 240),
      question: clampStr(input.question, 2000),
      studentExplanation: clampStr(input.studentExplanation, 4000),
      appliedScenario: clampStr(input.appliedScenario, 3000),
      score: clampInt(input.score, 0, 100),
      rubricFeedback: clampStr(input.rubricFeedback, 3000),
      durationSeconds: clampInt(input.durationSeconds, 0, 7200),
      formUrl: clampStr(input.formUrl || '', 500),
      status: 'submitted',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function attachSelfTestFormUrl(id: string, formUrl: string): Promise<void> {
  const path = `selfTests/${id}`;
  try {
    await updateDoc(doc(db, 'selfTests', id), {
      formUrl: clampStr(formUrl, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export type {
  CoachSession,
  FactCheckRecord,
  SelfTestRecord,
  StudyPlan,
  ThinkEntry,
};
