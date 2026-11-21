import React, { useState } from 'react';
import { CheckCircle2, ExternalLink, SearchCheck } from 'lucide-react';
import { createFactCheckRecord, updateFactCheckConclusion } from '../../lib/firestoreService';
import { FactCheckRecord, FactCheckVerdictStatus, GroundingSource } from '../../lib/types';

interface FactCheckModuleProps {
  uid: string;
  userName: string;
  records: FactCheckRecord[];
}

export const FactCheckModule: React.FC<FactCheckModuleProps> = ({
  uid,
  userName,
  records,
}) => {
  const [claim, setClaim] = useState('');
  const [textbookSource, setTextbookSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<{
    recordId: string;
    analysis: string;
    sources: GroundingSource[];
  } | null>(null);
  const [studentConclusion, setStudentConclusion] = useState('');
  const [verdictStatus, setVerdictStatus] = useState<FactCheckVerdictStatus>('verified');
  const [savingConclusion, setSavingConclusion] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.trim()) return;
    setLoading(true);
    setError(null);
    setSavedNotice(null);

    try {
      const res = await fetch('/api/gemini/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim, textbookSource }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể thực hiện kiểm chứng thông tin.');
      }

      const sources: GroundingSource[] = Array.isArray(data.sources) ? data.sources : [];
      const recordId = await createFactCheckRecord(uid, userName, {
        claim,
        textbookSource,
        aiVerdict: data.analysis,
        sourcesCount: sources.length,
        studentConclusion: '',
        verdictStatus: 'needs_revision',
      });

      setLatestResult({
        recordId,
        analysis: data.analysis,
        sources,
      });
      setStudentConclusion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kiểm chứng.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConclusion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latestResult || !studentConclusion.trim()) return;
    setSavingConclusion(true);
    try {
      await updateFactCheckConclusion(latestResult.recordId, {
        textbookSource,
        studentConclusion,
        verdictStatus,
      });
      setSavedNotice('Đã lưu kết luận phản biện cá nhân của em vào hồ sơ học tập.');
    } finally {
      setSavingConclusion(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">04. Fact Check — Kiểm chứng thông tin với Google Search</h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Đối chiếu câu trả lời của AI hoặc thông tin trên mạng với nguồn Google Search thực tế và sách giáo khoa.
        </p>
      </div>

      <form onSubmit={handleVerify} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Thông tin / Nhận định cần kiểm chứng
          </label>
          <textarea
            required
            rows={3}
            maxLength={2000}
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Dán nhận định, số liệu lịch sử, công thức khoa học hoặc câu trả lời AI cần kiểm chứng..."
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tài liệu / Sách giáo khoa em đang đối chiếu
            </label>
            <input
              type="text"
              maxLength={300}
              value={textbookSource}
              onChange={(e) => setTextbookSource(e.target.value)}
              placeholder="Ví dụ: SGK Lịch sử 11 Kết nối tri thức - Bài 5"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            <SearchCheck className="w-4 h-4" />
            <span>{loading ? 'Đang tra cứu Google...' : 'Kiểm chứng ngay'}</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
      </form>

      {latestResult && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider">
              Kết quả đối chiếu thực tế (gemini-4-hydrogen + Google Search)
            </h3>
            <div className="mt-3 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {latestResult.analysis}
            </div>
          </div>

          {latestResult.sources.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Nguồn tham khảo trích xuất ({latestResult.sources.length})
              </h4>
              <div className="grid sm:grid-cols-2 gap-2">
                {latestResult.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-sky-50 border border-slate-200 text-xs text-sky-700 transition-colors"
                  >
                    <span className="truncate font-medium">{src.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Student personal conclusion */}
          <form onSubmit={handleSaveConclusion} className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">
              Kết luận phản biện của em sau khi đối chiếu SGK
            </h4>
            <textarea
              required
              rows={2}
              maxLength={2000}
              value={studentConclusion}
              onChange={(e) => setStudentConclusion(e.target.value)}
              placeholder="Sau khi đối chiếu SGK và nguồn tìm kiếm, em kết luận thông tin trên đúng hay cần sửa ở điểm nào?"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <select
                value={verdictStatus}
                onChange={(e) => setVerdictStatus(e.target.value as FactCheckVerdictStatus)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
              >
                <option value="verified">Đã xác minh chính xác</option>
                <option value="needs_revision">Cần bổ sung / hiệu đính</option>
                <option value="disputed">Phát hiện sai lệch so với SGK</option>
              </select>

              <button
                type="submit"
                disabled={savingConclusion}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{savingConclusion ? 'Đang lưu...' : 'Lưu kết luận phản biện'}</span>
              </button>
            </div>
            {savedNotice && <p className="text-xs font-semibold text-emerald-700">{savedNotice}</p>}
          </form>
        </div>
      )}

      {/* History */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Hồ sơ kiểm chứng đã lưu ({records.length})
        </h3>
        {records.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            Chưa có lượt kiểm chứng nào được lưu.
          </div>
        ) : (
          records.map((rec) => (
            <div key={rec.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{rec.textbookSource || 'Chưa ghi nguồn SGK'}</span>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  {rec.sourcesCount} nguồn · {rec.verdictStatus}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">{rec.claim}</p>
              {rec.studentConclusion && (
                <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <strong>Kết luận của em:</strong> {rec.studentConclusion}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
