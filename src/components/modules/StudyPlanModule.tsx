import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  Pause,
  Play,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  attachStudyPlanSheetUrl,
  createStudyPlan,
  deleteStudyPlan,
  updateStudyPlanProgress,
} from '../../lib/firestoreService';
import { PendingConfirmation, StudyPlan, StudyPlanStatus } from '../../lib/types';
import { createStudyPlanSheet } from '../../lib/workspaceApi';

interface StudyPlanModuleProps {
  uid: string;
  userName: string;
  plans: StudyPlan[];
  accessToken: string | null;
  onRequestReauth: () => Promise<string | null>;
  onRequestConfirm: (action: PendingConfirmation) => void;
}

const STATUS_LABELS: Record<StudyPlanStatus, { label: string; style: string }> = {
  planned: { label: 'Chưa bắt đầu', style: 'text-slate-700 bg-slate-100 border-slate-200' },
  in_progress: { label: 'Đang thực hiện', style: 'text-sky-700 bg-sky-50 border-sky-200' },
  completed: { label: 'Hoàn thành', style: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  incomplete: { label: 'Chưa hoàn thành', style: 'text-amber-700 bg-amber-50 border-amber-200' },
};

export const StudyPlanModule: React.FC<StudyPlanModuleProps> = ({
  uid,
  userName,
  plans,
  accessToken,
  onRequestReauth,
  onRequestConfirm,
}) => {
  const [subject, setSubject] = useState('Toán học');
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [targetMinutes, setTargetMinutes] = useState(45);
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState<'all' | StudyPlanStatus>('all');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Study timer for an active task
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Reflection modal / inline editor
  const [editingReflectionId, setEditingReflectionId] = useState<string | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState('');
  const [reflectionStatus, setReflectionStatus] = useState<'completed' | 'incomplete'>('completed');

  useEffect(() => {
    if (!activeTimerId) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeTimerId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await createStudyPlan(uid, userName, {
        subject,
        title,
        goal: goal || 'Hoàn thành đúng mục tiêu tự học',
        targetMinutes,
        dueDate,
      });
      setTitle('');
      setGoal('');
      setStatusMsg('Đã lưu nhiệm vụ tự học mới.');
    } finally {
      setSaving(false);
    }
  };

  const handleStopTimerAndSave = async (plan: StudyPlan) => {
    const addedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    setActiveTimerId(null);
    setElapsedSeconds(0);
    await updateStudyPlanProgress(plan.id, {
      status: 'in_progress',
      actualMinutes: plan.actualMinutes + addedMinutes,
      reflection: plan.reflection,
    });
    setStatusMsg(`Đã ghi nhận thêm ${addedMinutes} phút tự học cho "${plan.title}".`);
  };

  const handleSaveReflection = async (plan: StudyPlan) => {
    await updateStudyPlanProgress(plan.id, {
      status: reflectionStatus,
      actualMinutes: plan.actualMinutes,
      reflection: reflectionDraft,
    });
    setEditingReflectionId(null);
    setReflectionDraft('');
  };

  const handleExportToSheets = async () => {
    if (plans.length === 0) {
      setStatusMsg('Cần ít nhất 1 nhiệm vụ để đồng bộ sang Google Sheets.');
      return;
    }
    let token = accessToken;
    if (!token) {
      token = await onRequestReauth();
    }
    if (!token) return;

    const sheetTitle = `EDU SMART - Kế hoạch tự học (${new Date().toLocaleDateString('vi-VN')})`;
    onRequestConfirm({
      title: 'Đồng bộ kế hoạch sang Google Sheets',
      description: `Hệ thống sẽ tạo bảng tính mới "${sheetTitle}" trong Google Drive của bạn và ghi ${plans.length} nhiệm vụ học tập.`,
      confirmLabel: 'Xác nhận tạo bảng tính',
      details: plans.slice(0, 4).map((p) => `${p.subject}: ${p.title}`),
      onConfirm: async () => {
        const res = await createStudyPlanSheet(token!, sheetTitle, plans);
        const target = plans[0];
        if (target && target.status !== 'completed') {
          await attachStudyPlanSheetUrl(target.id, res.spreadsheetUrl);
        } else if (target) {
          await attachStudyPlanSheetUrl(target.id, res.spreadsheetUrl);
        }
        setStatusMsg(`Đã đồng bộ thành công sang Google Sheets: ${res.spreadsheetUrl}`);
      },
    });
  };

  const filteredPlans = filter === 'all' ? plans : plans.filter((p) => p.status === filter);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">01. Study Plan — Kế hoạch tự học</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Xác định nhiệm vụ, phân bổ thời gian và tự đánh giá nguyên nhân hoàn thành hoặc chưa hoàn thành.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportToSheets}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Đồng bộ Google Sheets</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sm text-sky-900 flex items-center justify-between gap-3">
          <span className="break-all">{statusMsg}</span>
          {statusMsg.includes('https://') && (
            <a
              href={statusMsg.split('https://')[1] ? `https://${statusMsg.split('https://')[1]}` : '#'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline shrink-0"
            >
              <span>Mở Sheet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Create Task Form */}
      <form
        onSubmit={handleCreate}
        className="bg-white border border-slate-200 rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end"
      >
        <div className="lg:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Môn học</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option>Toán học</option>
            <option>Ngữ văn</option>
            <option>Tiếng Anh</option>
            <option>Vật lý</option>
            <option>Hóa học</option>
            <option>Sinh học</option>
            <option>Lịch sử</option>
            <option>Địa lý</option>
            <option>Tin học</option>
          </select>
        </div>

        <div className="lg:col-span-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nhiệm vụ tự học</label>
          <input
            type="text"
            required
            maxLength={180}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Ôn tập đạo hàm và giải 5 bài vận dụng"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mục tiêu cụ thể</label>
          <input
            type="text"
            maxLength={400}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Hiểu bản chất công thức, không xem lời giải mẫu"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="lg:col-span-1">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phút</label>
          <input
            type="number"
            min={5}
            max={300}
            value={targetMinutes}
            onChange={(e) => setTargetMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="lg:col-span-2 flex gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm</span>
          </button>
        </div>
      </form>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {(
          [
            ['all', 'Tất cả'],
            ['planned', 'Chưa bắt đầu'],
            ['in_progress', 'Đang học'],
            ['completed', 'Hoàn thành'],
            ['incomplete', 'Chưa hoàn thành'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filter === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task List */}
      {filteredPlans.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Chưa có nhiệm vụ nào trong mục này</p>
          <p className="text-xs text-slate-500 mt-1">
            Hãy thêm nhiệm vụ tự học đầu tiên ở biểu mẫu phía trên để bắt đầu theo dõi tiến độ.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPlans.map((plan) => {
            const badge = STATUS_LABELS[plan.status];
            const isTiming = activeTimerId === plan.id;
            const isLocked = plan.status === 'completed';

            return (
              <div
                key={plan.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-sky-700">{plan.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">Hạn {plan.dueDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums font-mono">
                        {plan.actualMinutes}/{plan.targetMinutes} phút
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${badge.style}`}>
                        {badge.label}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{plan.title}</h3>
                    <p className="text-sm text-slate-600">{plan.goal}</p>
                    {plan.reflection && (
                      <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-2">
                        <strong>Tự đánh giá:</strong> {plan.reflection}
                      </p>
                    )}
                    {plan.sheetUrl && (
                      <a
                        href={plan.sheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline mt-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Xem trên Google Sheets</span>
                      </a>
                    )}
                  </div>

                  {/* Action controls */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!isLocked && (
                      <>
                        {isTiming ? (
                          <button
                            type="button"
                            onClick={() => handleStopTimerAndSave(plan)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold tabular-nums font-mono cursor-pointer whitespace-nowrap"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>Dừng {formatTimer(elapsedSeconds)}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTimerId(plan.id);
                              setElapsedSeconds(0);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            <Play className="w-3.5 h-3.5 text-sky-600" />
                            <span>Bấm giờ học</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setEditingReflectionId(plan.id);
                            setReflectionStatus('completed');
                            setReflectionDraft(plan.reflection || '');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Hoàn thành</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingReflectionId(plan.id);
                            setReflectionStatus('incomplete');
                            setReflectionDraft(plan.reflection || '');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Chưa xong</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteStudyPlan(plan.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      aria-label="Xóa nhiệm vụ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editingReflectionId === plan.id && (
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      {reflectionStatus === 'completed'
                        ? 'Em đã nắm vững kiến thức gì sau nhiệm vụ này?'
                        : 'Đánh giá nguyên nhân chưa hoàn thành (thiếu thời gian, vướng kiến thức nền, mất tập trung...)'}
                    </label>
                    <textarea
                      rows={2}
                      maxLength={800}
                      value={reflectionDraft}
                      onChange={(e) => setReflectionDraft(e.target.value)}
                      placeholder="Ghi ngắn gọn nhận xét trung thực của bản thân..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingReflectionId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveReflection(plan)}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 cursor-pointer"
                      >
                        Lưu đánh giá
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTimerId && (
        <div className="fixed bottom-4 right-4 z-30 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3 text-xs font-mono tabular-nums">
          <Clock className="w-4 h-4 text-sky-400" />
          <span>Đang đếm giờ tự học: {formatTimer(elapsedSeconds)}</span>
        </div>
      )}
    </div>
  );
};
