import React, { useState } from 'react';
import {
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  FormInput,
  Mail,
  MessageSquare,
  Presentation,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react';
import { FIREBASE_PROJECT_ID } from '../../lib/firebase';
import { PendingConfirmation, StudyPlan } from '../../lib/types';
import {
  ChatMessageItem,
  ChatSpaceItem,
  ContactItem,
  createDriveTextFile,
  createLessonSlides,
  createSelfTestForm,
  createStudyDoc,
  createStudyPlanSheet,
  DriveFileItem,
  getFormResponsesSummary,
  GmailMessagePreview,
  listChatMessages,
  listChatSpaces,
  listContacts,
  listDriveFiles,
  listGmailMessages,
  readSpreadsheetPreview,
  sendChatMessage,
  sendGmailMessage,
} from '../../lib/workspaceApi';

interface WorkspaceHubViewProps {
  accessToken: string | null;
  onRequestReauth: () => Promise<string | null>;
  onRequestConfirm: (action: PendingConfirmation) => void;
  studyPlans: StudyPlan[];
}

type ServiceTab =
  | 'drive'
  | 'sheets'
  | 'docs'
  | 'slides'
  | 'forms'
  | 'gmail'
  | 'chat'
  | 'contacts';

export const WorkspaceHubView: React.FC<WorkspaceHubViewProps> = ({
  accessToken,
  onRequestReauth,
  onRequestConfirm,
  studyPlans,
}) => {
  const [activeTab, setActiveTab] = useState<ServiceTab>('drive');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveQuery, setDriveQuery] = useState('');
  const [newDriveTitle, setNewDriveTitle] = useState('');
  const [newDriveBody, setNewDriveBody] = useState('');

  // Sheets state
  const [sheetIdInput, setSheetIdInput] = useState('');
  const [sheetPreview, setSheetPreview] = useState<{ title: string; tabName: string; values: string[][] } | null>(null);

  // Docs state
  const [docTitle, setDocTitle] = useState('');
  const [docBody, setDocBody] = useState('');

  // Slides state
  const [slideTitle, setSlideTitle] = useState('');
  const [slideBullets, setSlideBullets] = useState('');

  // Forms state
  const [formTitle, setFormTitle] = useState('');
  const [formQuestionsText, setFormQuestionsText] = useState('');
  const [formIdLookup, setFormIdLookup] = useState('');
  const [formSummary, setFormSummary] = useState<{ count: number; latestTimestamp?: string } | null>(null);

  // Gmail state
  const [emails, setEmails] = useState<GmailMessagePreview[]>([]);
  const [mailTo, setMailTo] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');

  // Chat state
  const [chatSpaces, setChatSpaces] = useState<ChatSpaceItem[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatNotConfigured, setChatNotConfigured] = useState(false);

  // Contacts state
  const [contacts, setContacts] = useState<ContactItem[]>([]);

  const ensureToken = async (): Promise<string | null> => {
    if (accessToken) return accessToken;
    return onRequestReauth();
  };

  const runAction = async (fn: (token: string) => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const token = await ensureToken();
      if (!token) {
        setError('Cần đăng nhập lại với Google để cấp quyền truy cập Google Workspace.');
        return;
      }
      await fn(token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối Google Workspace API.';
      if (msg.includes('Google Chat app not found') || msg.includes('Chat API')) {
        setChatNotConfigured(true);
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const TABS: Array<{ id: ServiceTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'drive', label: 'Google Drive', icon: FolderOpen },
    { id: 'sheets', label: 'Google Sheets', icon: FileSpreadsheet },
    { id: 'docs', label: 'Google Docs', icon: FileText },
    { id: 'slides', label: 'Google Slides', icon: Presentation },
    { id: 'forms', label: 'Google Forms', icon: FormInput },
    { id: 'gmail', label: 'Gmail', icon: Mail },
    { id: 'chat', label: 'Google Chat', icon: MessageSquare },
    { id: 'contacts', label: 'Danh bạ', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Trung tâm kết nối Google Workspace</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Kết nối trực tiếp Drive, Sheets, Docs, Slides, Forms, Gmail, Google Chat và Danh bạ. Mọi thao tác ghi hoặc gửi đều yêu cầu xác nhận rõ ràng.
          </p>
        </div>

        {!accessToken && (
          <button
            type="button"
            onClick={() => onRequestReauth()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Kết nối lại Google Workspace</span>
          </button>
        )}
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-xl">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id);
                setError(null);
                setNotice(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-sky-600" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 space-y-2">
          <p>{error}</p>
          {chatNotConfigured && activeTab === 'chat' && (
            <p className="text-xs text-red-800">
              Lưu ý: Google Chat API yêu cầu tài khoản Google Workspace (Business/Enterprise) và cấu hình Chat App trong Cloud Console tại{' '}
              <a
                href={`https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=${FIREBASE_PROJECT_ID}`}
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold"
              >
                Google Cloud Chat Configuration
              </a>
              .
            </p>
          )}
        </div>
      )}

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 break-all">
          {notice}
        </div>
      )}

      {/* 1. DRIVE */}
      {activeTab === 'drive' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={driveQuery}
                onChange={(e) => setDriveQuery(e.target.value)}
                placeholder="Tìm tệp trên Google Drive..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(async (token) => {
                    const files = await listDriveFiles(token, driveQuery);
                    setDriveFiles(files);
                  })
                }
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                {busy ? 'Đang tải...' : 'Tải danh sách Drive'}
              </button>
            </div>

            {driveFiles.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Nhấn "Tải danh sách Drive" để duyệt các tệp học tập trên Google Drive của bạn.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {driveFiles.map((f) => (
                  <div key={f.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{f.name}</p>
                      <p className="text-xs text-slate-500 truncate">{f.mimeType}</p>
                    </div>
                    {f.webViewLink && (
                      <a
                        href={f.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline shrink-0"
                      >
                        <span>Mở</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Lưu ghi chú tự học lên Google Drive</h3>
            <input
              type="text"
              value={newDriveTitle}
              onChange={(e) => setNewDriveTitle(e.target.value)}
              placeholder="Tên tệp (ví dụ: Tom-tat-Toan-11.txt)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <textarea
              rows={5}
              value={newDriveBody}
              onChange={(e) => setNewDriveBody(e.target.value)}
              placeholder="Nội dung ghi chú..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <button
              type="button"
              disabled={!newDriveTitle.trim() || busy}
              onClick={async () => {
                const token = await ensureToken();
                if (!token) return;
                onRequestConfirm({
                  title: 'Tạo tệp ghi chú trên Google Drive',
                  description: `Hệ thống sẽ tải lên tệp "${newDriveTitle.trim()}" vào Google Drive của bạn.`,
                  confirmLabel: 'Xác nhận lưu Drive',
                  onConfirm: async () => {
                    const created = await createDriveTextFile(token, newDriveTitle.trim(), newDriveBody);
                    setNotice(`Đã lưu tệp "${created.name}" lên Google Drive.`);
                    setNewDriveTitle('');
                    setNewDriveBody('');
                  },
                });
              }}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Lưu tệp lên Drive
            </button>
          </div>
        </div>
      )}

      {/* 2. SHEETS */}
      {activeTab === 'sheets' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Xuất Study Plan sang Google Sheets</h3>
            <p className="text-xs text-slate-600">
              Hiện có <strong className="tabular-nums">{studyPlans.length}</strong> nhiệm vụ tự học trong hồ sơ của em.
            </p>
            <button
              type="button"
              disabled={studyPlans.length === 0 || busy}
              onClick={async () => {
                const token = await ensureToken();
                if (!token) return;
                const title = `EDU SMART Study Plan (${new Date().toLocaleDateString('vi-VN')})`;
                onRequestConfirm({
                  title: 'Tạo Google Sheets kế hoạch học tập',
                  description: `Tạo bảng tính "${title}" gồm ${studyPlans.length} nhiệm vụ.`,
                  confirmLabel: 'Xác nhận xuất Sheet',
                  onConfirm: async () => {
                    const res = await createStudyPlanSheet(token, title, studyPlans);
                    setSheetIdInput(res.spreadsheetId);
                    setNotice(`Đã tạo Google Sheet: ${res.spreadsheetUrl}`);
                  },
                });
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Tạo bảng tính Study Plan mới
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Đọc dữ liệu từ Google Sheets ID</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetIdInput}
                onChange={(e) => setSheetIdInput(e.target.value)}
                placeholder="Dán Spreadsheet ID..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <button
                type="button"
                disabled={!sheetIdInput.trim() || busy}
                onClick={() =>
                  runAction(async (token) => {
                    const preview = await readSpreadsheetPreview(token, sheetIdInput);
                    setSheetPreview(preview);
                  })
                }
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                Đọc bảng tính
              </button>
            </div>
            {sheetPreview && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-700 border-b border-slate-200">
                  {sheetPreview.title} ({sheetPreview.tabName})
                </div>
                <table className="w-full text-xs text-left">
                  <tbody>
                    {sheetPreview.values.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-slate-100">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. DOCS */}
      {activeTab === 'docs' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900">Tạo tài liệu học tập trên Google Docs</h3>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="Tiêu đề tài liệu (ví dụ: Đề cương ôn tập Học kỳ 1)"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <textarea
            rows={6}
            value={docBody}
            onChange={(e) => setDocBody(e.target.value)}
            placeholder="Nội dung tài liệu..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <button
            type="button"
            disabled={!docTitle.trim() || busy}
            onClick={async () => {
              const token = await ensureToken();
              if (!token) return;
              onRequestConfirm({
                title: 'Tạo tài liệu Google Docs',
                description: `Ứng dụng sẽ tạo Google Doc mới với tiêu đề "${docTitle.trim()}".`,
                confirmLabel: 'Xác nhận tạo Doc',
                onConfirm: async () => {
                  const res = await createStudyDoc(token, docTitle.trim(), docBody);
                  setNotice(`Đã tạo Google Doc: ${res.documentUrl}`);
                  setDocTitle('');
                  setDocBody('');
                },
              });
            }}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Tạo Google Doc
          </button>
        </div>
      )}

      {/* 4. SLIDES */}
      {activeTab === 'slides' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900">Tạo bài thuyết trình trên Google Slides</h3>
          <input
            type="text"
            value={slideTitle}
            onChange={(e) => setSlideTitle(e.target.value)}
            placeholder="Tên bài trình chiếu..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <textarea
            rows={5}
            value={slideBullets}
            onChange={(e) => setSlideBullets(e.target.value)}
            placeholder="Mỗi dòng là một ý chính sẽ hiển thị trên slide tóm tắt..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <button
            type="button"
            disabled={!slideTitle.trim() || busy}
            onClick={async () => {
              const token = await ensureToken();
              if (!token) return;
              const lines = slideBullets
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
              onRequestConfirm({
                title: 'Tạo bài trình chiếu Google Slides',
                description: `Tạo bộ slide "${slideTitle.trim()}" trên Google Slides của bạn.`,
                confirmLabel: 'Xác nhận tạo Slides',
                details: lines.slice(0, 5),
                onConfirm: async () => {
                  const res = await createLessonSlides(
                    token,
                    slideTitle.trim(),
                    lines.length > 0 ? lines : ['Nội dung tóm tắt bài tự học EDU SMART']
                  );
                  setNotice(`Đã tạo Google Slides: ${res.presentationUrl}`);
                  setSlideTitle('');
                  setSlideBullets('');
                },
              });
            }}
            className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Tạo Google Slides
          </button>
        </div>
      )}

      {/* 5. FORMS */}
      {activeTab === 'forms' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Tạo biểu mẫu câu hỏi trên Google Forms</h3>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Tên biểu mẫu (ví dụ: Phiếu tự kiểm tra Vật lý 11)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <textarea
              rows={4}
              value={formQuestionsText}
              onChange={(e) => setFormQuestionsText(e.target.value)}
              placeholder="Nhập mỗi câu hỏi trên 1 dòng..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <button
              type="button"
              disabled={!formTitle.trim() || busy}
              onClick={async () => {
                const token = await ensureToken();
                if (!token) return;
                const qs = formQuestionsText
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean);
                onRequestConfirm({
                  title: 'Tạo Google Form mới',
                  description: `Tạo Google Form "${formTitle.trim()}" với ${qs.length || 1} câu hỏi.`,
                  confirmLabel: 'Xác nhận tạo Form',
                  details: qs,
                  onConfirm: async () => {
                    const res = await createSelfTestForm(
                      token,
                      formTitle.trim(),
                      qs.length > 0 ? qs : ['Trình bày hiểu biết của em về bài học hôm nay.']
                    );
                    setFormIdLookup(res.formId);
                    setNotice(`Đã tạo Google Form: ${res.editUrl}`);
                  },
                });
              }}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Tạo Google Form
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Kiểm tra phản hồi Google Form</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={formIdLookup}
                onChange={(e) => setFormIdLookup(e.target.value)}
                placeholder="Nhập Google Form ID..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <button
                type="button"
                disabled={!formIdLookup.trim() || busy}
                onClick={() =>
                  runAction(async (token) => {
                    const summary = await getFormResponsesSummary(token, formIdLookup);
                    setFormSummary(summary);
                  })
                }
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                Xem thống kê
              </button>
            </div>
            {formSummary && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                <p className="font-bold text-slate-900 tabular-nums">
                  Tổng lượt phản hồi: {formSummary.count}
                </p>
                {formSummary.latestTimestamp && (
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    Gửi gần nhất: {new Date(formSummary.latestTimestamp).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. GMAIL */}
      {activeTab === 'gmail' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Hộp thư Gmail gần đây</h3>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(async (token) => {
                    const msgs = await listGmailMessages(token, 8);
                    setEmails(msgs);
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
              >
                {busy ? 'Đang tải...' : 'Tải hộp thư'}
              </button>
            </div>
            {emails.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Nhấn "Tải hộp thư" để xem các email học tập mới nhất trong Gmail.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {emails.map((m) => (
                  <div key={m.id} className="py-2.5 space-y-1">
                    <p className="text-xs font-semibold text-sky-700 truncate">{m.from}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{m.subject}</p>
                    <p className="text-xs text-slate-600 line-clamp-2">{m.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Gửi báo cáo tự học qua Gmail</h3>
            <input
              type="email"
              value={mailTo}
              onChange={(e) => setMailTo(e.target.value)}
              placeholder="Email giáo viên hoặc bạn học..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <input
              type="text"
              value={mailSubject}
              onChange={(e) => setMailSubject(e.target.value)}
              placeholder="Tiêu đề email..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <textarea
              rows={5}
              value={mailBody}
              onChange={(e) => setMailBody(e.target.value)}
              placeholder="Nội dung báo cáo tiến độ học tập..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <button
              type="button"
              disabled={!mailTo.trim() || !mailSubject.trim() || busy}
              onClick={async () => {
                const token = await ensureToken();
                if (!token) return;
                onRequestConfirm({
                  title: 'Xác nhận gửi email qua Gmail',
                  description: `Email sẽ được gửi trực tiếp từ tài khoản Gmail của bạn đến ${mailTo.trim()}.`,
                  confirmLabel: 'Xác nhận gửi Email',
                  details: [`Người nhận: ${mailTo.trim()}`, `Tiêu đề: ${mailSubject.trim()}`],
                  onConfirm: async () => {
                    await sendGmailMessage(token, mailTo.trim(), mailSubject.trim(), mailBody);
                    setNotice(`Đã gửi email thành công tới ${mailTo.trim()}.`);
                    setMailSubject('');
                    setMailBody('');
                  },
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi Email</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. CHAT */}
      {activeTab === 'chat' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong>Yêu cầu Google Chat API:</strong> Tính năng này hỗ trợ tài khoản Google Workspace của nhà trường/tổ chức (tài khoản @gmail.com cá nhân không hỗ trợ Chat API) và cần bật cấu hình Chat App trong{' '}
            <a
              href={`https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=${FIREBASE_PROJECT_ID}`}
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold"
            >
              Cloud Console
            </a>
            .
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runAction(async (token) => {
                  const spaces = await listChatSpaces(token);
                  setChatSpaces(spaces);
                  if (spaces[0]?.name) {
                    setSelectedSpace(spaces[0].name);
                    const msgs = await listChatMessages(token, spaces[0].name);
                    setChatMessages(msgs);
                  }
                })
              }
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
            >
              {busy ? 'Đang tải...' : 'Tải phòng học Google Chat'}
            </button>

            {chatSpaces.length > 0 && (
              <select
                value={selectedSpace}
                onChange={async (e) => {
                  const val = e.target.value;
                  setSelectedSpace(val);
                  await runAction(async (token) => {
                    const msgs = await listChatMessages(token, val);
                    setChatMessages(msgs);
                  });
                }}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
              >
                {chatSpaces.map((sp) => (
                  <option key={sp.name} value={sp.name}>
                    {sp.displayName || sp.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {chatMessages.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-4">
              {chatMessages.map((msg) => (
                <div key={msg.name} className="text-xs text-slate-700">
                  <strong>{msg.sender?.displayName || 'Thành viên'}:</strong> {msg.text}
                </div>
              ))}
            </div>
          )}

          {selectedSpace && (
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhập tin nhắn trao đổi nhóm học tập..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <button
                type="button"
                disabled={!chatInput.trim() || busy}
                onClick={async () => {
                  const token = await ensureToken();
                  if (!token) return;
                  const text = chatInput.trim();
                  onRequestConfirm({
                    title: 'Gửi tin nhắn vào Google Chat',
                    description: `Tin nhắn sẽ được đăng vào phòng "${selectedSpace}".`,
                    confirmLabel: 'Xác nhận gửi tin nhắn',
                    details: [text],
                    onConfirm: async () => {
                      await sendChatMessage(token, selectedSpace, text);
                      const refreshed = await listChatMessages(token, selectedSpace);
                      setChatMessages(refreshed);
                      setChatInput('');
                      setNotice('Đã gửi tin nhắn vào Google Chat.');
                    },
                  });
                }}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
              >
                Gửi tin nhắn
              </button>
            </div>
          )}
        </div>
      )}

      {/* 8. CONTACTS */}
      {activeTab === 'contacts' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Danh bạ Giáo viên & Bạn học (Google Contacts)</h3>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runAction(async (token) => {
                  const items = await listContacts(token);
                  setContacts(items);
                })
              }
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
            >
              {busy ? 'Đang tải...' : 'Tải danh bạ Google'}
            </button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Nhấn "Tải danh bạ Google" để chọn nhanh email giáo viên hoặc bạn học khi gửi báo cáo Gmail.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {contacts.map((c) => (
                <div key={c.resourceName} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-600 truncate">{c.email}</p>
                  {c.organization && <p className="text-[11px] text-slate-500 truncate">{c.organization}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      setMailTo(c.email);
                      setActiveTab('gmail');
                    }}
                    className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
                  >
                    Soạn Gmail cho người này
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
