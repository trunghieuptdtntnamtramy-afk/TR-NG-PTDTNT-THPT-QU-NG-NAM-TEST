import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Clock, ExternalLink, FileSpreadsheet, Play, Sparkles } from 'lucide-react';
import { attachSelfTestFormUrl, saveSubmittedSelfTest } from '../../lib/firestoreService';
import { PendingConfirmation, SelfTestRecord } from '../../lib/types';
import { createSelfTestForm } from '../../lib/workspaceApi';

interface SelfTestModuleProps {
  uid: string;
  userName: string;
  tests: SelfTestRecord[];
  accessToken: string | null;
  onRequestReauth: () => Promise<string | null>;
  onRequestConfirm: (action: PendingConfirmation) => void;
}

export const SelfTestModule: React.FC<SelfTestModuleProps> = ({
  uid,
  userName,
  tests,
  accessToken,
  onRequestReauth,
  onRequestConfirm,
}) => {
  const [subject, setSubject] = useState('Ngữ văn');
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [appliedPrompt, setAppliedPrompt] = useState('');
  const [rubricHints, setRubricHints] = useState<string[]>([]);

  const [examActive, setExamActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [studentExplanation, setStudentExplanation] = useState('');
  const [appliedScenario, setAppliedScenario] = useState('');

  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    testId: string;
    score: number;
    strengths: string[];
    improvements: string[];
    feedback: string;
  } | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!examActive) return;
    const timer = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [examActive]);

  const handleGeneratePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/gemini/self-test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tạo đề tự kiểm tra.');

      setQuestion(data.question);
      setAppliedPrompt(data.appliedPrompt);
      setRubricHints(data.rubricHints || []);
      setStudentExplanation('');
      setAppliedScenario('');
      setElapsedSeconds(0);
      setExamActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo đề.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !studentExplanation.trim()) return;
    setExamActive(false);
    setEvaluating(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/self-test/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          topic: topic || subject,
          question,
          studentExplanation,
          appliedScenario,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể chấm bài tự kiểm tra.');

      const testId = await saveSubmittedSelfTest(uid, userName, {
        subject,
        topic: topic || subject,
        question,
        studentExplanation,
        appliedScenario,
        score: data.score,
        rubricFeedback: data.feedback,
        durationSeconds: elapsedSeconds,
      });

      setResult({
        testId,
        score: data.score,
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        feedback: data.feedback,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi đánh giá bài làm.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleExportToGoogleForm = async (record?: SelfTestRecord) => {
    const q1 = record?.question || question;
    const tTopic = record?.topic || topic || subject;
    if (!q1) return;

    let token = accessToken;
    if (!token) token = await onRequestReauth();
    if (!token) return;

    const formTitle = `EDU SMART Self Test - ${tTopic}`.slice(0, 120);
    const questions = [
      `1. Giải thích bằng ngôn ngữ của em: ${q1}`,
      '2. Nêu một tình huống thực tế vận dụng kiến thức vừa học và cách giải quyết.',
    ];

    onRequestConfirm({
      title: 'Tạo bài tự kiểm tra trên Google Forms',
      description: `Ứng dụng sẽ tạo biểu mẫu "${formTitle}" trong Google Forms của bạn gồm 2 câu hỏi tự luận.`,
      confirmLabel: 'Xác nhận tạo Google Form',
      details: questions,
      onConfirm: async () => {
        const res = await createSelfTestForm(token!, formTitle, questions);
        if (record?.id) {
          await attachSelfTestFormUrl(record.id, res.editUrl);
        } else if (result?.testId) {
          await attachSelfTestFormUrl(result.testId, res.editUrl);
        }
        setFormNotice(`Đã tạo Google Form: ${res.editUrl}`);
      },
    });
  };

  const formatDuration = (sec: number) => {
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
          <h2 className="text-xl font-bold text-slate-900">05. Self Test — Tự kiểm tra không AI hỗ trợ</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Diễn đạt lại kiến thức bằng ngôn ngữ của chính mình và vận dụng vào tình huống mới.
          </p>
        </div>
        {question && (
          <button
            type="button"
            onClick={() => handleExportToGoogleForm()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Tạo Google Form ôn tập</span>
          </button>
        )}
      </div>

      {formNotice && (
        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-sm text-purple-900 break-all">
          {formNotice}
        </div>
      )}

      {/* Generator */}
      <form
        onSubmit={handleGeneratePrompt}
        className="bg-white border border-slate-200 rounded-2xl p-5 grid sm:grid-cols-4 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Môn học</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          >
            <option>Ngữ văn</option>
            <option>Toán học</option>
            <option>Vật lý</option>
            <option>Hóa học</option>
            <option>Sinh học</option>
            <option>Lịch sử</option>
            <option>Địa lý</option>
            <option>Tiếng Anh</option>
            <option>Tin học</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kiến thức / Chủ đề muốn tự kiểm tra
          </label>
          <input
            type="text"
            required
            maxLength={240}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ví dụ: Định luật bảo toàn cơ năng, Nghệ thuật miêu tả nội tâm trong Truyện Kiều..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={generating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-60 whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4" />
          <span>{generating ? 'Đang tạo đề...' : 'Bắt đầu bài kiểm tra'}</span>
        </button>
      </form>

      {/* AI-free Exam Workspace */}
      {question && (
        <form onSubmit={handleSubmitTest} className="bg-white border border-purple-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Chế độ Tự kiểm tra độc lập (Không AI trợ giúp trong khi làm bài)
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-700 tabular-nums">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Thời gian làm bài: {formatDuration(elapsedSeconds)}</span>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p className="text-sm font-bold text-slate-900">Câu hỏi 1 (Hiểu bản chất): {question}</p>
            {appliedPrompt && (
              <p className="text-sm font-medium text-slate-700">
                Câu hỏi 2 (Vận dụng thực tế): {appliedPrompt}
              </p>
            )}
            {rubricHints.length > 0 && (
              <div className="pt-2 text-xs text-slate-500">
                Tiêu chí tự đối chiếu: {rubricHints.join(' · ')}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              1. Giải thích lại kiến thức bằng ngôn ngữ của chính em
            </label>
            <textarea
              required
              rows={4}
              maxLength={4000}
              value={studentExplanation}
              onChange={(e) => setStudentExplanation(e.target.value)}
              placeholder="Trình bày tự nhiên theo cách em hiểu, tránh chép nguyên văn..."
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              2. Vận dụng vào tình huống mới
            </label>
            <textarea
              rows={3}
              maxLength={3000}
              value={appliedScenario}
              onChange={(e) => setAppliedScenario(e.target.value)}
              placeholder="Em áp dụng kiến thức này để giải quyết tình huống thực tế như thế nào?"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={evaluating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <Play className="w-4 h-4" />
              <span>{evaluating ? 'Đang chấm theo rubric...' : 'Nộp bài & Chấm điểm'}</span>
            </button>
          </div>
        </form>
      )}

      {result && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Kết quả tự kiểm tra</h3>
            <span className="text-xl font-extrabold text-emerald-700 tabular-nums font-mono">
              {result.score}/100 điểm
            </span>
          </div>
          <p className="text-sm text-slate-800 leading-relaxed">{result.feedback}</p>
          {result.strengths.length > 0 && (
            <div className="text-xs text-emerald-800">
              <strong>Điểm tốt:</strong> {result.strengths.join('; ')}
            </div>
          )}
          {result.improvements.length > 0 && (
            <div className="text-xs text-amber-800">
              <strong>Cần củng cố:</strong> {result.improvements.join('; ')}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Bài tự kiểm tra đã nộp ({tests.length})
        </h3>
        {tests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            Chưa có bài tự kiểm tra nào được lưu.
          </div>
        ) : (
          tests.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 font-semibold text-purple-700">
                  <ClipboardCheck className="w-4 h-4" />
                  <span>
                    {t.subject} · {t.topic}
                  </span>
                </span>
                <div className="flex items-center gap-3 tabular-nums font-mono">
                  <span>{formatDuration(t.durationSeconds)}</span>
                  <span className="font-bold text-emerald-700">{t.score}/100</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900">{t.question}</p>
              <p className="text-xs text-slate-600">{t.rubricFeedback}</p>
              <div className="flex items-center gap-3 pt-1">
                {t.formUrl ? (
                  <a
                    href={t.formUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline"
                  >
                    <span>Mở Google Form</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleExportToGoogleForm(t)}
                    className="text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
                  >
                    Xuất sang Google Forms
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
