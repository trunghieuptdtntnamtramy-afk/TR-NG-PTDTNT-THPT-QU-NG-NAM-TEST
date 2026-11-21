import React, { useState } from 'react';
import {
  BarChart3,
  Bot,
  CalendarDays,
  ClipboardCheck,
  Film,
  FolderKanban,
  GraduationCap,
  Home,
  Lightbulb,
  LogOut,
  Menu,
  RefreshCw,
  SearchCheck,
  Shield,
  X,
} from 'lucide-react';
import { ADMIN_EMAIL } from '../lib/firebase';
import {
  CoachSession,
  FactCheckRecord,
  PendingConfirmation,
  SelfTestRecord,
  StudyPlan,
  ThinkEntry,
  UserProfile,
  WorkspaceTab,
} from '../lib/types';
import { ConfirmWorkspaceModal } from './ConfirmWorkspaceModal';
import { AiCoachModule } from './modules/AiCoachModule';
import { FactCheckModule } from './modules/FactCheckModule';
import { LearningProgressView } from './modules/LearningProgressView';
import { MediaStudioModule } from './modules/MediaStudioModule';
import { SelfTestModule } from './modules/SelfTestModule';
import { StudyPlanModule } from './modules/StudyPlanModule';
import { ThinkFirstModule } from './modules/ThinkFirstModule';
import { WorkspaceHubView } from './modules/WorkspaceHubView';

interface WorkspaceShellProps {
  profile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  accessToken: string | null;
  onRequestReauth: () => Promise<string | null>;
  onLogout: () => Promise<void>;
  onBackToLanding: () => void;
  isTeacherView: boolean;
  onToggleTeacherView: (next: boolean) => void;
  studyPlans: StudyPlan[];
  thinkEntries: ThinkEntry[];
  coachSessions: CoachSession[];
  factChecks: FactCheckRecord[];
  selfTests: SelfTestRecord[];
}

interface NavItem {
  id: WorkspaceTab;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  profile,
  onProfileUpdated,
  accessToken,
  onRequestReauth,
  onLogout,
  onBackToLanding,
  isTeacherView,
  onToggleTeacherView,
  studyPlans,
  thinkEntries,
  coachSessions,
  factChecks,
  selfTests,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('progress');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const [coachInitialContext, setCoachInitialContext] = useState<{
    subject: string;
    topic: string;
    initialAnswer: string;
  } | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const canUseTeacherView = profile.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const navItems: NavItem[] = [
    {
      id: 'progress',
      label: 'Tiến độ học tập',
      subtitle: 'Tổng hợp năng lực 05 phân hệ & hồ sơ',
      icon: BarChart3,
    },
    {
      id: 'study-plan',
      label: '01. STUDY PLAN',
      subtitle: 'Lập kế hoạch, đồng hồ tự học & Google Sheets',
      icon: CalendarDays,
      count: studyPlans.length,
    },
    {
      id: 'think-first',
      label: '02. THINK FIRST',
      subtitle: 'Suy nghĩ độc lập trước khi mở khóa AI Coach',
      icon: Lightbulb,
      count: thinkEntries.length,
    },
    {
      id: 'ai-coach',
      label: '03. AI COACH',
      subtitle: 'Đối thoại Socratic & xuất Google Docs / Slides',
      icon: Bot,
      count: coachSessions.length,
    },
    {
      id: 'fact-check',
      label: '04. FACT CHECK',
      subtitle: 'Kiểm chứng Google Search & đối chiếu SGK',
      icon: SearchCheck,
      count: factChecks.length,
    },
    {
      id: 'self-test',
      label: '05. SELF TEST',
      subtitle: 'Tự kiểm tra không AI & tạo Google Forms',
      icon: ClipboardCheck,
      count: selfTests.length,
    },
    {
      id: 'media-studio',
      label: 'Học liệu Ảnh & Video',
      subtitle: 'Minh họa bài học & video giáo dục',
      icon: Film,
    },
    {
      id: 'workspace-hub',
      label: 'Google Workspace Hub',
      subtitle: 'Drive, Sheets, Docs, Slides, Forms, Gmail, Chat, Contacts',
      icon: FolderKanban,
    },
  ];

  const currentNav = navItems.find((n) => n.id === activeTab) || navItems[0];

  const handleProceedToCoach = (context: {
    subject: string;
    topic: string;
    initialAnswer: string;
  }) => {
    setCoachInitialContext(context);
    setActiveTab('ai-coach');
  };

  const handleReconnectWorkspace = async () => {
    setReconnecting(true);
    try {
      await onRequestReauth();
    } finally {
      setReconnecting(false);
    }
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onBackToLanding}
          className="flex items-center gap-2.5 text-sky-700 font-extrabold text-base tracking-tight cursor-pointer"
        >
          <GraduationCap className="w-6 h-6 text-sky-600" />
          <span>EDU SMART</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-700 cursor-pointer"
          aria-label="Đóng menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
        <div className="text-xs font-bold text-slate-900 truncate">{profile.displayName}</div>
        <div className="text-[11px] text-slate-500 truncate">
          {profile.className} · {profile.schoolName}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.count === 'number' && (
                <span
                  className={`text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-md shrink-0 ${
                    active ? 'bg-sky-700 text-sky-50' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200 space-y-2">
        <button
          type="button"
          onClick={onBackToLanding}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4 text-slate-500" />
          <span>Trang giới thiệu</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-[260px] max-w-[85vw] bg-white h-full border-r border-slate-200">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {currentNav.label}
              </h1>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                {currentNav.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {canUseTeacherView && (
              <button
                type="button"
                onClick={() => onToggleTeacherView(!isTeacherView)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isTeacherView
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{isTeacherView ? 'Đang xem: Giáo viên' : 'Chế độ Giáo viên'}</span>
              </button>
            )}

            {!accessToken ? (
              <button
                type="button"
                onClick={handleReconnectWorkspace}
                disabled={reconnecting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{reconnecting ? 'Đang kết nối...' : 'Cấp quyền Workspace'}</span>
              </button>
            ) : (
              <span className="hidden md:inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap shrink-0">
                Workspace đã kết nối
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'progress' && (
            <LearningProgressView
              profile={profile}
              isTeacherView={isTeacherView}
              studyPlans={studyPlans}
              thinkEntries={thinkEntries}
              coachSessions={coachSessions}
              factChecks={factChecks}
              selfTests={selfTests}
              onProfileUpdated={onProfileUpdated}
            />
          )}

          {activeTab === 'study-plan' && (
            <StudyPlanModule
              uid={profile.uid}
              userName={profile.displayName}
              plans={studyPlans}
              accessToken={accessToken}
              onRequestReauth={onRequestReauth}
              onRequestConfirm={setPendingConfirm}
            />
          )}

          {activeTab === 'think-first' && (
            <ThinkFirstModule
              uid={profile.uid}
              userName={profile.displayName}
              entries={thinkEntries}
              onProceedToCoach={handleProceedToCoach}
            />
          )}

          {activeTab === 'ai-coach' && (
            <AiCoachModule
              uid={profile.uid}
              userName={profile.displayName}
              sessions={coachSessions}
              initialContext={coachInitialContext}
              accessToken={accessToken}
              onRequestReauth={onRequestReauth}
              onRequestConfirm={setPendingConfirm}
            />
          )}

          {activeTab === 'fact-check' && (
            <FactCheckModule
              uid={profile.uid}
              userName={profile.displayName}
              records={factChecks}
            />
          )}

          {activeTab === 'self-test' && (
            <SelfTestModule
              uid={profile.uid}
              userName={profile.displayName}
              tests={selfTests}
              accessToken={accessToken}
              onRequestReauth={onRequestReauth}
              onRequestConfirm={setPendingConfirm}
            />
          )}

          {activeTab === 'media-studio' && <MediaStudioModule />}

          {activeTab === 'workspace-hub' && (
            <WorkspaceHubView
              accessToken={accessToken}
              onRequestReauth={onRequestReauth}
              onRequestConfirm={setPendingConfirm}
              studyPlans={studyPlans}
            />
          )}
        </main>
      </div>

      <ConfirmWorkspaceModal
        pending={pendingConfirm}
        onClose={() => setPendingConfirm(null)}
      />
    </div>
  );
};
