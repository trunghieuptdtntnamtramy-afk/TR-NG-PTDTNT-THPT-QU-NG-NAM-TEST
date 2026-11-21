export type UserRole = 'student' | 'teacher';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  className: string;
  schoolName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type StudyPlanStatus = 'planned' | 'in_progress' | 'completed' | 'incomplete';

export interface StudyPlan {
  id: string;
  ownerId: string;
  ownerName: string;
  subject: string;
  title: string;
  goal: string;
  targetMinutes: number;
  actualMinutes: number;
  dueDate: string;
  status: StudyPlanStatus;
  reflection: string;
  sheetUrl: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ThinkEntry {
  id: string;
  ownerId: string;
  ownerName: string;
  subject: string;
  topic: string;
  initialAnswer: string;
  keyArguments: string;
  confidence: number;
  aiFeedback: string;
  unlockedCoach: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CoachMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface CoachSession {
  id: string;
  ownerId: string;
  ownerName: string;
  rolePersona: string;
  modelUsed: string;
  topic: string;
  messagesCount: number;
  lastMessagePreview: string;
  transcript: string;
  docUrl: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type FactCheckVerdictStatus = 'verified' | 'needs_revision' | 'disputed';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface FactCheckRecord {
  id: string;
  ownerId: string;
  ownerName: string;
  claim: string;
  textbookSource: string;
  aiVerdict: string;
  sourcesCount: number;
  studentConclusion: string;
  verdictStatus: FactCheckVerdictStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SelfTestStatus = 'draft' | 'submitted';

export interface SelfTestRecord {
  id: string;
  ownerId: string;
  ownerName: string;
  subject: string;
  topic: string;
  question: string;
  studentExplanation: string;
  appliedScenario: string;
  score: number;
  rubricFeedback: string;
  durationSeconds: number;
  formUrl: string;
  status: SelfTestStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type WorkspaceTab =
  | 'progress'
  | 'study-plan'
  | 'think-first'
  | 'ai-coach'
  | 'fact-check'
  | 'self-test'
  | 'media-studio'
  | 'workspace-hub';

export interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  details?: string[];
  danger?: boolean;
  onConfirm: () => Promise<void>;
}
