import React, { useEffect, useRef, useState } from 'react';
import { Bot, FileText, Presentation, RotateCcw, Send } from 'lucide-react';
import {
  attachCoachDocUrl,
  createCoachSession,
  updateCoachSession,
} from '../../lib/firestoreService';
import { CoachMessage, CoachSession, PendingConfirmation } from '../../lib/types';
import { createLessonSlides, createStudyDoc } from '../../lib/workspaceApi';

interface AiCoachModuleProps {
  uid: string;
  userName: string;
  sessions: CoachSession[];
  initialContext: { subject: string; topic: string; initialAnswer: string } | null;
  accessToken: string | null;
  onRequestReauth: () => Promise<string | null>;
  onRequestConfirm: (action: PendingConfirmation) => void;
}

const ROLE_OPTIONS = [
  { id: 'socratic', label: 'Gia sư Socratic (Gợi mở từng bước)' },
  { id: 'stem', label: 'Cố vấn Toán - Lý - Hóa - Sinh' },
  { id: 'humanities', label: 'Cố vấn Ngữ văn - Lịch sử - Địa lý' },
  { id: 'cs', label: 'Cố vấn Tin học & Thuật toán' },
];

export const AiCoachModule: React.FC<AiCoachModuleProps> = ({
  uid,
  userName,
  sessions,
  initialContext,
  accessToken,
  onRequestReauth,
  onRequestConfirm,
}) => {
  const [rolePersona, setRolePersona] = useState('socratic');
  const [model, setModel] = useState('gemini-4-hydrogen');
  const [topic, setTopic] = useState(initialContext?.topic || 'Phương pháp tự học hiệu quả');
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialContext) {
      setTopic(`${initialContext.subject}: ${initialContext.topic}`);
      setMessages([
        {
          role: 'model',
          text: `Chào ${userName}! Thầy/cô AI Coach đã đọc lập luận ban đầu của em về "${initialContext.topic}". Em muốn chúng ta bắt đầu phân tích từ điểm nào trước?`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setActiveSessionId(null);
    }
  }, [initialContext, userName]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleResetChat = () => {
    setMessages([]);
    setActiveSessionId(null);
    setError(null);
    setWorkspaceNotice(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMsg: CoachMessage = {
      role: 'user',
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rolePersona,
          model,
          topic,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          message: userMsg.text,
          initialThinkContext: initialContext?.initialAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể nhận phản hồi từ AI Coach.');
      }

      const modelMsg: CoachMessage = {
        role: 'model',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedMessages = [...nextHistory, modelMsg];
      setMessages(updatedMessages);

      const transcript = updatedMessages
        .map((m) => `[${m.timestamp}] ${m.role === 'user' ? 'Học sinh' : 'AI Coach'}: ${m.text}`)
        .join('\n\n')
        .slice(0, 14500);

      if (!activeSessionId) {
        const newId = await createCoachSession(uid, userName, {
          rolePersona,
          modelUsed: data.modelUsed || model,
          topic,
          messagesCount: updatedMessages.length,
          lastMessagePreview: modelMsg.text.slice(0, 480),
          transcript,
        });
        setActiveSessionId(newId);
      } else {
        await updateCoachSession(activeSessionId, {
          modelUsed: data.modelUsed || model,
          messagesCount: updatedMessages.length,
          lastMessagePreview: modelMsg.text.slice(0, 480),
          transcript,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối AI Coach.');
    } finally {
      setSending(false);
    }
  };

  const handleExportToDocs = async () => {
    if (messages.length === 0) return;
    let token = accessToken;
    if (!token) token = await onRequestReauth();
    if (!token) return;

    const title = `Biên bản tự học - ${topic}`.slice(0, 120);
    const bodyText =
      `EDU SMART • Trường PTDTNT THPT Quảng Nam\nChủ đề: ${topic}\nVai trò cố vấn: ${rolePersona}\n\n` +
      messages.map((m) => `${m.role === 'user' ? 'Học sinh' : 'AI Coach'} (${m.timestamp}):\n${m.text}`).join('\n\n');

    onRequestConfirm({
      title: 'Lưu biên bản hội thoại sang Google Docs',
      description: `Ứng dụng sẽ tạo một tài liệu Google Docs mới mang tên "${title}" trong tài khoản Google của bạn.`,
      confirmLabel: 'Xác nhận tạo Google Doc',
      details: [`Số lượt trao đổi: ${messages.length} tin nhắn`],
      onConfirm: async () => {
        const docRes = await createStudyDoc(token!, title, bodyText);
        if (activeSessionId) {
          await attachCoachDocUrl(activeSessionId, docRes.documentUrl);
        }
        setWorkspaceNotice(`Đã tạo Google Doc: ${docRes.documentUrl}`);
      },
    });
  };

  const handleExportToSlides = async () => {
    if (messages.length === 0) return;
    let token = accessToken;
    if (!token) token = await onRequestReauth();
    if (!token) return;

    const title = `Tóm tắt bài học - ${topic}`.slice(0, 100);
    const summaryLines = messages
      .filter((m) => m.role === 'model')
      .slice(-3)
      .map((m, i) => `Ý chính ${i + 1}: ${m.text.slice(0, 260)}`);

    onRequestConfirm({
      title: 'Tạo bài trình chiếu trên Google Slides',
      description: `Ứng dụng sẽ tạo bộ slide tóm tắt "${title}" trong Google Slides của bạn.`,
      confirmLabel: 'Xác nhận tạo Google Slides',
      details: summaryLines.length > 0 ? summaryLines : ['Tóm tắt nội dung buổi học với AI Coach'],
      onConfirm: async () => {
        const slideRes = await createLessonSlides(token!, title, summaryLines);
        setWorkspaceNotice(`Đã tạo Google Slides: ${slideRes.presentationUrl}`);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">03. AI Coach — Trợ lý gợi mở Socratic</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Hội thoại nhiều lượt duy trì lịch sử ngữ cảnh, giúp em tự tìm ra câu trả lời.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportToDocs}
            disabled={messages.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>Xuất Google Docs</span>
          </button>
          <button
            type="button"
            onClick={handleExportToSlides}
            disabled={messages.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <Presentation className="w-4 h-4" />
            <span>Tạo Google Slides</span>
          </button>
          <button
            type="button"
            onClick={handleResetChat}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Phiên mới</span>
          </button>
        </div>
      </div>

      {/* Config Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 grid sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Chủ đề buổi học</label>
          <input
            type="text"
            maxLength={240}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Vai trò cố vấn</label>
          <select
            value={rolePersona}
            onChange={(e) => setRolePersona(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Mô hình Gemini</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          >
            <option value="gemini-4-hydrogen">gemini-4-hydrogen (Tổng quát)</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Nhanh)</option>
            <option value="gemini-4-neon">gemini-4-neon (Tương tác phức tạp - Paid)</option>
            <option value="gemini-4-carbon">gemini-4-carbon (Lập luận sâu - Paid)</option>
          </select>
        </div>
      </div>

      {workspaceNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 break-all">
          {workspaceNotice}
        </div>
      )}

      {/* Scrollable Chat Thread */}
      <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[460px]">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Sẵn sàng đồng hành cùng em</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Hãy nêu câu hỏi hoặc chia sẻ phần bài làm em đang vướng mắc. AI Coach sẽ đặt câu hỏi dẫn dắt thay vì giải hộ hoàn toàn.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  <div className="text-[11px] opacity-75 mb-1 font-medium tabular-nums">
                    {msg.role === 'user' ? userName : 'AI Coach'} · {msg.timestamp}
                  </div>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={scrollEndRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi hoặc bước giải em đang suy nghĩ..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Đang gợi mở...' : 'Gửi'}</span>
          </button>
        </form>
      </div>

      {/* Saved Sessions */}
      {sessions.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Lịch sử phiên học gần đây ({sessions.length})
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {sessions.slice(0, 4).map((s) => (
              <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-indigo-700">{s.modelUsed}</span>
                  <span className="tabular-nums">{s.messagesCount} lượt trao đổi</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 truncate">{s.topic}</h4>
                <p className="text-xs text-slate-600 line-clamp-2">{s.lastMessagePreview}</p>
                {s.docUrl && (
                  <a
                    href={s.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Mở biên bản Google Docs
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
