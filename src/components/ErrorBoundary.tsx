import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Đã xảy ra lỗi không mong muốn.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-slate-900">Đã xảy ra sự cố kết nối</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Ứng dụng gặp lỗi trong quá trình xử lý dữ liệu. Em có thể tải lại trang hoặc đăng nhập lại.
            </p>
            <div className="mt-4 p-3 rounded-lg bg-slate-100 text-xs font-mono text-slate-700 break-words max-h-40 overflow-y-auto">
              {this.state.errorMessage}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
