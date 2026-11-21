import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Layers,
  Lightbulb,
  Quote,
  SearchCheck,
  Target,
  Users,
} from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface LandingPageProps {
  onSignIn: () => void;
  signingIn: boolean;
  authError: string | null;
  isAuthenticated: boolean;
  onEnterWorkspace: () => void;
}

const DEMO_STEPS = [
  {
    code: '01',
    title: 'STUDY PLAN',
    subtitle: 'Lập kế hoạch & quản lý thời gian',
    detail:
      'Học sinh chủ động thiết lập nhiệm vụ học tập, phân bổ khung giờ tự học hợp lý và tự đánh giá nguyên nhân nếu chưa hoàn thành kế hoạch.',
    icon: CalendarCheck,
    accent: 'text-sky-600',
    iconBg: 'bg-sky-600 text-white',
  },
  {
    code: '02',
    title: 'THINK FIRST',
    subtitle: 'Suy nghĩ độc lập trước khi dùng AI',
    detail:
      'Kích hoạt tư duy cá nhân! Học sinh tự đưa ra câu trả lời và lập luận ban đầu trước khi mở khóa tính năng hỗ trợ từ AI.',
    icon: Lightbulb,
    accent: 'text-amber-600',
    iconBg: 'bg-amber-100 text-amber-800',
  },
  {
    code: '03',
    title: 'AI COACH',
    subtitle: 'Trợ lý gợi mở & định hướng tư duy',
    detail:
      'AI đóng vai trò người huấn luyện gợi mở từng bước bằng câu hỏi định hướng thay vì đưa sẵn đáp án.',
    icon: Bot,
    accent: 'text-indigo-600',
    iconBg: 'bg-indigo-100 text-indigo-800',
  },
  {
    code: '04',
    title: 'FACT CHECK',
    subtitle: 'Đối chiếu SGK & kiểm chứng nguồn',
    detail:
      'Rèn luyện tư duy phản biện thông qua việc đối chiếu câu trả lời của AI với sách giáo khoa và tài liệu chuẩn qua Google Search.',
    icon: SearchCheck,
    accent: 'text-emerald-600',
    iconBg: 'bg-emerald-100 text-emerald-800',
  },
  {
    code: '05',
    title: 'SELF TEST',
    subtitle: 'Tự kiểm tra không có AI hỗ trợ',
    detail:
      'Tự kiểm tra năng lực thực chất trong môi trường không có AI, diễn đạt lại kiến thức bằng ngôn ngữ của chính mình.',
    icon: FileCheck2,
    accent: 'text-purple-600',
    iconBg: 'bg-purple-100 text-purple-800',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  signingIn,
  authError,
  isAuthenticated,
  onEnterWorkspace,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Clean 3-zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#home"
            className="text-lg font-extrabold tracking-tight text-sky-700 whitespace-nowrap shrink-0 flex items-center gap-2.5"
          >
            <GraduationCap className="w-6 h-6 text-sky-600" />
            <span>EDU SMART</span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#home" className="hover:text-sky-600 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Trang chủ
            </a>
            <a href="#intro" className="hover:text-sky-600 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Giới thiệu
            </a>
            <a href="#modules" className="hover:text-sky-600 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              05 Phân hệ
            </a>
            <a href="#process" className="hover:text-sky-600 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Quy trình
            </a>
          </nav>

          <div className="shrink-0">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onEnterWorkspace}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Vào học tập
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={signingIn}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                {signingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative bg-gradient-to-b from-sky-50/70 via-white to-slate-50/60 bg-edu-grid pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left column */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="text-xs font-semibold tracking-wider text-sky-700 uppercase">
                Sở Giáo dục và Đào tạo Thành phố Đà Nẵng · Trường PTDTNT THPT Quảng Nam
              </div>

              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight text-balance">
                Chủ động tự học{' '}
                <span className="text-sky-600">Làm chủ tri thức</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                EDU SMART là nền tảng hỗ trợ học sinh xây dựng kế hoạch học tập, rèn luyện tư duy độc lập, kiểm chứng thông tin và sử dụng trí tuệ nhân tạo một cách chủ động, có trách nhiệm.
              </p>

              {/* Ho Chi Minh Quote */}
              <div className="mt-7 rounded-2xl bg-amber-50/60 border border-amber-200 p-5 sm:p-6">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Quote className="w-5 h-5" />
                  </div>
                  <div>
                    <blockquote className="font-serif font-bold italic text-slate-900 text-base sm:text-lg leading-relaxed">
                      “Trong cách học phải lấy tự học làm cốt. Học ở trường, học trong sách vở, học lẫn nhau và học dân.”
                    </blockquote>
                    <div className="mt-2.5 text-xs sm:text-sm font-bold tracking-wide text-amber-900">
                      Chủ tịch Hồ Chí Minh
                    </div>
                  </div>
                </div>
              </div>

              {authError && (
                <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  {authError}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-4">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={onEnterWorkspace}
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm sm:text-base font-bold text-white bg-sky-600 hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Mở Không gian Tự học</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <GoogleSignInButton
                    onClick={onSignIn}
                    disabled={signingIn}
                    label={signingIn ? 'Đang kết nối Google...' : 'Bắt đầu học tập với Google'}
                  />
                )}

                <a
                  href="#modules"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  <Layers className="w-4 h-4 text-sky-600" />
                  <span>Khám phá 05 Phân hệ</span>
                </a>
              </div>
            </div>

            {/* Right column: Interactive 5-Module Preview */}
            <div className="lg:col-span-5 flex">
              <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Lộ trình tự học thông minh
                    </span>
                    <span className="text-xs font-medium text-slate-500 tabular-nums">
                      05 Phân hệ liên kết
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {DEMO_STEPS.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = activeStep === index;
                      return (
                        <button
                          key={step.code}
                          type="button"
                          onClick={() => setActiveStep(index)}
                          className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                            isActive
                              ? 'border-sky-300 bg-sky-50/80'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 tabular-nums ${step.iconBg}`}
                            >
                              {step.code}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate">{step.title}</div>
                              <div className="text-xs text-slate-500 truncate">{step.subtitle}</div>
                            </div>
                          </div>
                          <Icon className={`w-4 h-4 shrink-0 ${step.accent}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">
                    Mục tiêu Phân hệ {DEMO_STEPS[activeStep].code}:{' '}
                  </strong>
                  {DEMO_STEPS[activeStep].detail}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section id="intro" className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600">
                Về nền tảng học tập
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 text-balance">
                Giới thiệu về EDU SMART
              </h2>

              <div className="mt-5 space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                <p>
                  Trong thời đại chuyển đổi số và sự phát triển mạnh mẽ của trí tuệ nhân tạo, việc hình thành năng lực tự học và tư duy phản biện là yêu cầu quan trọng đối với học sinh.
                </p>
                <p>
                  <strong className="text-slate-800">EDU SMART</strong> được xây dựng nhằm tạo ra môi trường học tập có định hướng, giúp học sinh biết lập kế hoạch, chủ động tìm hiểu, kiểm chứng kiến thức và tự đánh giá kết quả học tập của bản thân.
                </p>
                <p>
                  Hệ thống đồng thời kết nối liền mạch với Google Workspace (Drive, Sheets, Docs, Slides, Forms, Gmail, Chat) và hỗ trợ giáo viên theo dõi sự tiến bộ của học sinh một cách trực quan, khoa học.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-slate-200">
                <div>
                  <div className="text-2xl font-extrabold text-sky-600 tabular-nums">05</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">Phân hệ cốt lõi</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-blue-600 tabular-nums">100%</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">Chủ động tư duy</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">24/7</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">Đồng hành tự học</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Tư duy phản biện</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Rèn thói quen đặt câu hỏi, suy nghĩ độc lập trước khi tham khảo AI.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                    <BookOpenCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Kiểm chứng tri thức</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Đối chiếu thông tin với sách giáo khoa và nguồn học liệu tin cậy.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                    <Target className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Kỷ luật tự học</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Xây dựng mục tiêu rõ ràng, quản lý tiến độ và tự đánh giá năng lực.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Kết nối Giáo viên</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Ghi nhận hành trình rèn luyện giúp thầy cô đồng hành kịp thời.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 05 Modules */}
      <section id="modules" className="py-16 lg:py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Cấu trúc hệ thống
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 text-balance">
              05 Phân hệ học tập & Hệ thống hỗ trợ
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Quy trình rèn luyện năng lực tự học và tư duy độc lập thông qua 5 phân hệ liên kết chặt chẽ.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-sky-700">Phân hệ 01</span>
                <CalendarDays className="w-5 h-5 text-sky-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">STUDY PLAN</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Lập kế hoạch, nhập nhiệm vụ, xác định mục tiêu, quản lý thời gian tự học, đánh giá nguyên nhân chưa hoàn thành và đồng bộ Google Sheets.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-amber-700">Phân hệ 02</span>
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">THINK FIRST</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Khuyến khích học sinh suy nghĩ, trả lời câu hỏi và hình thành lập luận cá nhân trước khi mở khóa sử dụng AI Coach.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-indigo-700">Phân hệ 03</span>
                <Bot className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI COACH</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Trợ lý AI gợi mở đa lượt theo vai trò cố vấn, đặt câu hỏi định hướng, hướng dẫn học sinh tự giải quyết vấn đề và xuất biên bản sang Google Docs.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-emerald-700">Phân hệ 04</span>
                <SearchCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">FACT CHECK</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Kiểm chứng nguồn thông tin bằng tìm kiếm Google thực tế, đối chiếu sách giáo khoa, phát hiện sai lệch và đưa ra lập luận cá nhân.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-purple-700">Phân hệ 05</span>
                <ClipboardCheck className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">SELF TEST</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tự kiểm tra kiến thức không có AI hỗ trợ, giải thích bằng ngôn ngữ bản thân, vận dụng tình huống mới và tạo biểu mẫu Google Forms.
              </p>
            </div>

            <div className="bg-sky-700 text-white rounded-2xl p-6 border border-sky-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-sky-100">Hệ thống hỗ trợ</span>
                <BarChart3 className="w-5 h-5 text-sky-100" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">LEARNING PROGRESS & WORKSPACE</h3>
              <p className="text-sm text-sky-100 leading-relaxed">
                Theo dõi tiến độ học tập thời gian thực, tạo học liệu ảnh/video và kết nối Drive, Gmail, Slides, Chat, Contacts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process 4 Steps */}
      <section id="process" className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Lộ trình rèn luyện
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 text-balance">
              Quy trình học tập 4 bước
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Lập kế hoạch', desc: 'Xác định nhiệm vụ và mục tiêu học tập.' },
              { step: '02', title: 'Tư duy độc lập', desc: 'Hình thành nhận định trước khi dùng AI.' },
              { step: '03', title: 'Học và kiểm chứng', desc: 'Tiếp nhận gợi ý, đối chiếu và phản biện.' },
              { step: '04', title: 'Tự đánh giá', desc: 'Kiểm tra kiến thức và vận dụng thực tế.' },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-sky-600 text-white font-bold text-lg flex items-center justify-center tabular-nums">
                  {item.step}
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto rounded-2xl bg-sky-700 p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
            Sẵn sàng trải nghiệm EDU SMART?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-sky-100 max-w-xl mx-auto leading-relaxed">
            Bắt đầu hành trình học tập chủ động, rèn luyện tư duy phản biện và làm chủ tri thức ngay hôm nay.
          </p>
          <div className="mt-6 flex justify-center">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onEnterWorkspace}
                className="px-6 py-3 rounded-xl bg-white text-sky-800 hover:bg-sky-50 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Vào không gian học tập
              </button>
            ) : (
              <GoogleSignInButton
                onClick={onSignIn}
                disabled={signingIn}
                label="Đăng nhập Google để bắt đầu"
              />
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 text-sky-700 font-bold text-base">
            <GraduationCap className="w-5 h-5" />
            <span>EDU SMART - NỀN TẢNG HỖ TRỢ NĂNG LỰC TỰ HỌC</span>
          </div>
          <div className="mt-2 space-y-1 text-xs sm:text-sm font-medium text-slate-600">
            <p>SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ ĐÀ NẴNG</p>
            <p>TRƯỜNG PTDTNT THPT QUẢNG NAM</p>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            © 2026 EDU SMART · Hệ thống học tập thông minh
          </p>
        </div>
      </footer>
    </div>
  );
};
