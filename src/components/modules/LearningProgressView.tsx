import React, { useState } from 'react';
import {
  BarChart3,
  Bot,
  CalendarDays,
  ClipboardCheck,
  Lightbulb,
  Save,
  SearchCheck,
  UserCheck,
} from 'lucide-react';
import { updateUserProfileInfo } from '../../lib/firestoreService';
import {
  CoachSession,
  FactCheckRecord,
  SelfTestRecord,
  StudyPlan,
  ThinkEntry,
  UserProfile,
} from '../../lib/types';

interface LearningProgressViewProps {
  profile: UserProfile;
  isTeacherView: boolean;
  studyPlans: StudyPlan[];
  thinkEntries: ThinkEntry[];
  coachSessions: CoachSession[];
  factChecks: FactCheckRecord[];
  selfTests: SelfTestRecord[];
  onProfileUpdated: (updated: UserProfile) => void;
}

export const LearningProgressView: React.FC<LearningProgressViewProps> = ({
  profile,
  isTeacherView,
  studyPlans,
  thinkEntries,
  coachSessions,
  factChecks,
  selfTests,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [className, setClassName] = useState(profile.className);
  const [schoolName, setSchoolName] = useState(profile.schoolName);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const completedPlans = studyPlans.filter((p) => p.status === 'completed').length;
  const totalStudyMinutes = studyPlans.reduce((acc, p) => acc + (p.actualMinutes || 0), 0);
  const avgSelfTestScore =
    selfTests.length > 0
      ? Math.round(selfTests.reduce((acc, t) => acc + (t.score || 0), 0) / selfTests.length)
      : 0;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSavedMsg(null);
    try {
      await updateUserProfileInfo(profile.uid, {
        displayName,
        className,
        schoolName,
      });
      onProfileUpdated({
        ...profile,
        displayName,
        className,
        schoolName,
      });
      setSavedMsg('Đã cập nhật hồ sơ cá nhân.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isTeacherView
              ? 'Bảng theo dõi tiến độ toàn trường (Chế độ Giáo viên)'
              : 'Learning Progress — Tiến độ tự học cá nhân'}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Tổng hợp số liệu rèn luyện qua 05 phân hệ lưu trữ thời gian thực trên Cloud Firestore.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg">
          <UserCheck className="w-4 h-4" />
          <span>{profile.role === 'teacher' ? 'Giáo viên / Quản trị viên' : `Học sinh · Lớp ${profile.className}`}</span>
        </span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>01. Study Plan</span>
            <CalendarDays className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums font-mono">
            {completedPlans}/{studyPlans.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">{totalStudyMinutes} phút thực học</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>02. Think First</span>
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums font-mono">
            {thinkEntries.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Lần tư duy độc lập</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>03. AI Coach</span>
            <Bot className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums font-mono">
            {coachSessions.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Phiên gợi mở Socratic</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>04. Fact Check</span>
            <SearchCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums font-mono">
            {factChecks.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Lượt kiểm chứng SGK</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>05. Self Test</span>
            <ClipboardCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums font-mono">
            {avgSelfTestScore}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">Điểm TB ({selfTests.length} bài)</div>
        </div>
      </div>

      {/* Recent Self Tests & Progress Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <BarChart3 className="w-4 h-4 text-sky-600" />
            <span>Nhật ký đánh giá năng lực gần đây</span>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">{selfTests.length} bản ghi</span>
        </div>

        {selfTests.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Hoàn thành bài Self Test ở Phân hệ 05 để hiển thị bảng điểm chi tiết.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Học sinh</th>
                  <th className="px-4 py-3">Môn học</th>
                  <th className="px-4 py-3">Chủ đề</th>
                  <th className="px-4 py-3 text-right">Thời lượng</th>
                  <th className="px-4 py-3 text-right">Điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selfTests.slice(0, 10).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.ownerName}</td>
                    <td className="px-4 py-3 text-slate-600">{t.subject}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{t.topic}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                      {Math.round(t.durationSeconds / 60)}p
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                      {t.score}/100
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile Editor */}
      <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Thông tin hồ sơ học tập</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
            <input
              type="text"
              required
              maxLength={120}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lớp / Đơn vị</label>
            <input
              type="text"
              maxLength={60}
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Trường</label>
            <input
              type="text"
              maxLength={140}
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          {savedMsg ? <span className="text-xs font-semibold text-emerald-700">{savedMsg}</span> : <span />}
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingProfile ? 'Đang lưu...' : 'Lưu thông tin'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
