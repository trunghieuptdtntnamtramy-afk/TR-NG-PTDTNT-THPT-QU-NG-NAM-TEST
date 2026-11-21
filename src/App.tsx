import { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './components/LandingPage';
import { WorkspaceShell } from './components/WorkspaceShell';
import {
  ADMIN_EMAIL,
  googleSignIn,
  initAuth,
  logout,
  testConnection,
} from './lib/firebase';
import {
  ensureUserProfile,
  subscribeOwnedCollection,
} from './lib/firestoreService';
import {
  CoachSession,
  FactCheckRecord,
  SelfTestRecord,
  StudyPlan,
  ThinkEntry,
  UserProfile,
} from './lib/types';

function EduSmartApp() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [isTeacherView, setIsTeacherView] = useState(false);

  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [thinkEntries, setThinkEntries] = useState<ThinkEntry[]>([]);
  const [coachSessions, setCoachSessions] = useState<CoachSession[]>([]);
  const [factChecks, setFactChecks] = useState<FactCheckRecord[]>([]);
  const [selfTests, setSelfTests] = useState<SelfTestRecord[]>([]);

  useEffect(() => {
    void testConnection();
  }, []);

  const syncUserProfile = useCallback(async (user: User) => {
    if (!user.email) {
      setAuthError('Tài khoản Google không cung cấp địa chỉ email hợp lệ.');
      return;
    }
    try {
      const loaded = await ensureUserProfile({
        uid: user.uid,
        displayName: user.displayName || user.email.split('@')[0] || 'Học sinh',
        email: user.email,
      });
      setProfile(loaded);
      setIsTeacherView(user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
      setAuthError(null);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Không thể khởi tạo hồ sơ học tập trên Firestore.'
      );
    }
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth((user, token) => {
      setFirebaseUser(user);
      setAccessToken(token);
      setAuthReady(true);

      if (user) {
        void syncUserProfile(user);
      } else {
        setProfile(null);
        setShowWorkspace(false);
        setIsTeacherView(false);
        setStudyPlans([]);
        setThinkEntries([]);
        setCoachSessions([]);
        setFactChecks([]);
        setSelfTests([]);
      }
    });
    return () => unsubscribe();
  }, [syncUserProfile]);

  // Subscribe to Firestore collections only when authenticated user + profile exist
  useEffect(() => {
    if (!firebaseUser || !profile) return;

    const teacherMode =
      isTeacherView &&
      profile.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const unsubPlans = subscribeOwnedCollection<StudyPlan>(
      'studyPlans',
      firebaseUser.uid,
      teacherMode,
      setStudyPlans
    );
    const unsubThink = subscribeOwnedCollection<ThinkEntry>(
      'thinkEntries',
      firebaseUser.uid,
      teacherMode,
      setThinkEntries
    );
    const unsubCoach = subscribeOwnedCollection<CoachSession>(
      'coachSessions',
      firebaseUser.uid,
      teacherMode,
      setCoachSessions
    );
    const unsubFact = subscribeOwnedCollection<FactCheckRecord>(
      'factChecks',
      firebaseUser.uid,
      teacherMode,
      setFactChecks
    );
    const unsubSelf = subscribeOwnedCollection<SelfTestRecord>(
      'selfTests',
      firebaseUser.uid,
      teacherMode,
      setSelfTests
    );

    return () => {
      unsubPlans();
      unsubThink();
      unsubCoach();
      unsubFact();
      unsubSelf();
    };
  }, [firebaseUser, profile, isTeacherView]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const { user, accessToken: token } = await googleSignIn();
      setFirebaseUser(user);
      setAccessToken(token);
      await syncUserProfile(user);
      setShowWorkspace(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập Google thất bại.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleRequestReauth = async (): Promise<string | null> => {
    try {
      const { user, accessToken: token } = await googleSignIn();
      setFirebaseUser(user);
      setAccessToken(token);
      return token;
    } catch {
      return null;
    }
  };

  const handleLogout = async () => {
    await logout();
    setFirebaseUser(null);
    setAccessToken(null);
    setProfile(null);
    setShowWorkspace(false);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-semibold text-slate-600">
          Đang khởi tạo EDU SMART...
        </div>
      </div>
    );
  }

  if (showWorkspace && firebaseUser && profile) {
    return (
      <WorkspaceShell
        profile={profile}
        onProfileUpdated={setProfile}
        accessToken={accessToken}
        onRequestReauth={handleRequestReauth}
        onLogout={handleLogout}
        onBackToLanding={() => setShowWorkspace(false)}
        isTeacherView={isTeacherView}
        onToggleTeacherView={setIsTeacherView}
        studyPlans={studyPlans}
        thinkEntries={thinkEntries}
        coachSessions={coachSessions}
        factChecks={factChecks}
        selfTests={selfTests}
      />
    );
  }

  return (
    <LandingPage
      onSignIn={handleSignIn}
      signingIn={signingIn}
      authError={authError}
      isAuthenticated={Boolean(firebaseUser && profile)}
      onEnterWorkspace={() => setShowWorkspace(true)}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <EduSmartApp />
    </ErrorBoundary>
  );
}
