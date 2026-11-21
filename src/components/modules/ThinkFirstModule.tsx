import React, { useState } from 'react';
import { ArrowRight, Lightbulb, LockOpen, Send } from 'lucide-react';
import { saveThinkEntry } from '../../lib/firestoreService';
import { ThinkEntry } from '../../lib/types';

interface ThinkFirstModuleProps {
  uid: string;
  userName: string;
  entries: ThinkEntry[];
  onProceedToCoach: (context: { subject: string; topic: string; initialAnswer: string }) => void;
}

export const ThinkFirstModule: React.FC<ThinkFirstModuleProps> = ({
  uid,
  userName,
  entries,
  onProceedToCoach,
}) => {
  const [subject, setSubject] = useState('Toán học');
  const [topic, setTopic] = useState('');
  const [initialAnswer, setInitialAnswer] = useState('');
  const [keyArguments, setKeyArguments] = useState('');
  const [confidence, setConfidence] = useState(3);
  const [model, setModel] = useState('gemini-3.1-flash-lite');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestFeedback, setLatestFeedback] = useState<{
    topic: string;
    subject: string;
    initialAnswer: string;
    feedback: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !initialAnswer.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/think-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          topic,
          initialAnswer,
          keyArguments,
          model,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể nhận phản hồi từ hệ thống.');
      }

      await saveThinkEntry(uid, userName, {
        subject,
        topic,
        initialAnswer,
        keyArguments,
        confidence,
        aiFeedback: data.feedback,
        unlockedCoach: true,
      });

      setLatestFeedback({
        topic,
        subject,
        initialAnswer,
        feedback: data.feedback,
      });
      setTopic('');
      setInitialAnswer('');
      setKeyArguments('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">02. Think First — Tư duy độc lập trước khi dùng AI</h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Ghi lại giả thuyết và lập luận cá nhân của em trước khi mở khóa trợ lý AI Coach.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Môn học</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option>Toán học</option>
              <option>Ngữ văn</option>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Câu hỏi hoặc vấn đề cần giải quyết
            </label>
            <input
              type="text"
              required
              maxLength={240}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ví dụ: Vì sao ánh sáng bị khúc xạ khi đi từ không khí vào nước?"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Suy nghĩ và câu trả lời ban đầu của em (Bắt buộc)
          </label>
          <textarea
            required
            rows={4}
            maxLength={3000}
            value={initialAnswer}
            onChange={(e) => setInitialAnswer(e.target.value)}
            placeholder="Em hiểu vấn đề này như thế nào? Em dự đoán hướng giải quyết ra sao?"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Từ khóa / Công thức / Dẫn chứng SGK em nhớ được
            </label>
            <input
              type="text"
              maxLength={1500}
              value={keyArguments}
              onChange={(e) => setKeyArguments(e.target.value)}
              placeholder="Ví dụ: Định luật Snell, chiết suất môi trường..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mức tự tin (1–5)
              </label>
              <select
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white tabular-nums"
              >
                <option value={1}>1 - Chưa chắc chắn</option>
                <option value={2}>2 - Tạm hiểu sơ bộ</option>
                <option value={3}>3 - Khá tự tin</option>
                <option value={4}>4 - Tự tin</option>
                <option value={5}>5 - Rất chắc chắn</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mô hình đánh giá</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="gemini-3.1-flash-lite">Phản hồi nhanh (Flash Lite)</option>
                <option value="gemini-4-hydrogen">Tiêu chuẩn (Hydrogen)</option>
                <option value="gemini-4-carbon">Phân tích sâu (Carbon - Paid)</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Đang phân tích lập luận...' : 'Lưu suy nghĩ & Mở khóa AI Coach'}</span>
          </button>
        </div>
      </form>

      {latestFeedback && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <LockOpen className="w-4 h-4" />
              <span>Đã ghi nhận tư duy độc lập & Mở khóa AI Coach</span>
            </div>
            <button
              type="button"
              onClick={() =>
                onProceedToCoach({
                  subject: latestFeedback.subject,
                  topic: latestFeedback.topic,
                  initialAnswer: latestFeedback.initialAnswer,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <span>Thảo luận tiếp với AI Coach</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            {latestFeedback.feedback}
          </div>
        </div>
      )}

      {/* History */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Nhật ký tư duy đã lưu ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            Chưa có nhật ký suy nghĩ độc lập nào.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-slate-800">{entry.subject}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">Độ tự tin: {entry.confidence}/5</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onProceedToCoach({
                      subject: entry.subject,
                      topic: entry.topic,
                      initialAnswer: entry.initialAnswer,
                    })
                  }
                  className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
                >
                  Mở trong AI Coach
                </button>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{entry.topic}</h4>
              <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap">
                <strong>Lập luận của em:</strong> {entry.initialAnswer}
              </p>
              {entry.aiFeedback && (
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                  <strong>Gợi mở định hướng:</strong> {entry.aiFeedback}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
