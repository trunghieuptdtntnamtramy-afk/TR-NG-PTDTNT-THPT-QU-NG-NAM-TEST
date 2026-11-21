import React, { useState } from 'react';
import { Download, Film, ImagePlus, Sparkles, Upload } from 'lucide-react';

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error('Không đọc được tệp ảnh.'));
        return;
      }
      resolve({
        base64: result.slice(commaIdx + 1),
        mimeType: file.type || 'image/png',
      });
    };
    reader.onerror = () => reject(new Error('Lỗi đọc tệp ảnh.'));
    reader.readAsDataURL(file);
  });
}

export const MediaStudioModule: React.FC = () => {
  const [mode, setMode] = useState<'image' | 'video'>('image');

  // Image state (gemini-nano-banana-2.1)
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgAspect, setImgAspect] = useState('16:9');
  const [imgSize, setImgSize] = useState('1K');
  const [imgSourceFile, setImgSourceFile] = useState<{ base64: string; mimeType: string; name: string; preview: string } | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const [imgOutput, setImgOutput] = useState<{ url: string; caption: string } | null>(null);

  // Video state (gemini-omni-1.2-flash via Interactions API)
  const [vidPrompt, setVidPrompt] = useState('');
  const [vidAspect, setVidAspect] = useState<'16:9' | '9:16'>('16:9');
  const [vidDuration, setVidDuration] = useState<'5s' | '8s' | '10s'>('8s');
  const [vidSourceFile, setVidSourceFile] = useState<{ base64: string; mimeType: string; name: string; preview: string } | null>(null);
  const [vidLoading, setVidLoading] = useState(false);
  const [vidError, setVidError] = useState<string | null>(null);
  const [vidOutput, setVidOutput] = useState<{ url: string; mimeType: string; aspectRatio: string } | null>(null);

  const handleUploadImageForEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = await fileToBase64(file);
    setImgSourceFile({
      ...parsed,
      name: file.name,
      preview: URL.createObjectURL(file),
    });
  };

  const handleUploadPhotoForVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = await fileToBase64(file);
    setVidSourceFile({
      ...parsed,
      name: file.name,
      preview: URL.createObjectURL(file),
    });
  };

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imgPrompt.trim()) return;
    setImgLoading(true);
    setImgError(null);

    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imgPrompt,
          aspectRatio: imgAspect,
          imageSize: imgSize,
          sourceImageBase64: imgSourceFile?.base64,
          sourceMimeType: imgSourceFile?.mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tạo hoặc chỉnh sửa hình ảnh.');
      setImgOutput({ url: data.imageDataUrl, caption: data.caption || '' });
    } catch (err) {
      setImgError(err instanceof Error ? err.message : 'Lỗi tạo hình ảnh.');
    } finally {
      setImgLoading(false);
    }
  };

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vidPrompt.trim()) return;
    setVidLoading(true);
    setVidError(null);

    try {
      const res = await fetch('/api/gemini/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: vidPrompt,
          aspectRatio: vidAspect,
          duration: vidDuration,
          sourceImageBase64: vidSourceFile?.base64,
          sourceMimeType: vidSourceFile?.mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tạo video.');
      setVidOutput({
        url: data.videoDataUrl,
        mimeType: data.mimeType || 'video/mp4',
        aspectRatio: data.aspectRatio || vidAspect,
      });
    } catch (err) {
      setVidError(err instanceof Error ? err.message : 'Lỗi tạo video.');
    } finally {
      setVidLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Học liệu Sáng tạo — Hình ảnh & Video</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Tạo sơ đồ minh họa bài học bằng gemini-nano-banana-2.1 và video trực quan bằng gemini-omni-1.2-flash.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('image')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'image' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImagePlus className="w-4 h-4 text-sky-600" />
            <span>Tạo & Chỉnh sửa Ảnh</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('video')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'video' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Film className="w-4 h-4 text-indigo-600" />
            <span>Video & Chuyển động Ảnh</span>
          </button>
        </div>
      </div>

      {mode === 'image' ? (
        <div className="grid lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleGenerateImage}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mô tả hình ảnh minh họa hoặc yêu cầu chỉnh sửa
              </label>
              <textarea
                required
                rows={4}
                maxLength={1500}
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                placeholder="Ví dụ: Sơ đồ quang hợp ở lá cây xanh phong cách sách giáo khoa khoa học hiện đại, chú thích rõ ràng..."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tỷ lệ khung hình</label>
                <select
                  value={imgAspect}
                  onChange={(e) => setImgAspect(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="1:1">1:1 (Vuông)</option>
                  <option value="16:9">16:9 (Ngang Slide)</option>
                  <option value="4:3">4:3 (Sách giáo khoa)</option>
                  <option value="3:4">3:4 (Poster dọc)</option>
                  <option value="9:16">9:16 (Dọc di động)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Độ phân giải</label>
                <select
                  value={imgSize}
                  onChange={(e) => setImgSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="1K">1K (Chuẩn)</option>
                  <option value="2K">2K (Sắc nét)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ảnh gốc để chỉnh sửa (Tùy chọn)
              </label>
              <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 cursor-pointer">
                <Upload className="w-4 h-4 text-sky-600" />
                <span>{imgSourceFile ? imgSourceFile.name : 'Chọn ảnh từ máy để chỉnh sửa'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadImageForEdit}
                  className="hidden"
                />
              </label>
              {imgSourceFile && (
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Đã tải ảnh tham chiếu</span>
                  <button
                    type="button"
                    onClick={() => setImgSourceFile(null)}
                    className="text-red-600 hover:underline cursor-pointer"
                  >
                    Bỏ ảnh
                  </button>
                </div>
              )}
            </div>

            {imgError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                {imgError}
              </div>
            )}

            <button
              type="submit"
              disabled={imgLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>{imgLoading ? 'Đang tạo hình ảnh...' : imgSourceFile ? 'Chỉnh sửa ảnh' : 'Tạo ảnh học liệu'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[360px]">
            {imgOutput ? (
              <div className="w-full space-y-4">
                <img
                  src={imgOutput.url}
                  alt={imgPrompt}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[420px] object-contain rounded-xl border border-slate-200 bg-slate-50"
                />
                {imgOutput.caption && (
                  <p className="text-xs text-slate-600">{imgOutput.caption}</p>
                )}
                <div className="flex justify-end">
                  <a
                    href={imgOutput.url}
                    download={`edusmart_image_${Date.now()}.png`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải ảnh xuống</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center max-w-sm">
                <ImagePlus className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">Khung xem trước hình ảnh học liệu</p>
                <p className="text-xs text-slate-500 mt-1">
                  Nhập mô tả sơ đồ, thí nghiệm hoặc tải ảnh lên để chỉnh sửa bằng gemini-nano-banana-2.1.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleGenerateVideo}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mô tả kịch bản video hoặc chuyển động cho ảnh
              </label>
              <textarea
                required
                rows={4}
                maxLength={1500}
                value={vidPrompt}
                onChange={(e) => setVidPrompt(e.target.value)}
                placeholder="Ví dụ: Hoạt ảnh minh họa các hành tinh quay quanh Mặt Trời theo quỹ đạo elip rõ nét, ánh sáng khoa học..."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Khung hình Video</label>
                <select
                  value={vidAspect}
                  onChange={(e) => setVidAspect(e.target.value as '16:9' | '9:16')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="16:9">16:9 (Ngang)</option>
                  <option value="9:16">9:16 (Dọc)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thời lượng</label>
                <select
                  value={vidDuration}
                  onChange={(e) => setVidDuration(e.target.value as '5s' | '8s' | '10s')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white tabular-nums"
                >
                  <option value="5s">5 giây</option>
                  <option value="8s">8 giây</option>
                  <option value="10s">10 giây</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tải ảnh tĩnh để chuyển động thành Video (Tùy chọn)
              </label>
              <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 cursor-pointer">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>{vidSourceFile ? vidSourceFile.name : 'Chọn ảnh tĩnh để tạo chuyển động'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadPhotoForVideo}
                  className="hidden"
                />
              </label>
              {vidSourceFile && (
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Đã đính kèm ảnh khung đầu</span>
                  <button
                    type="button"
                    onClick={() => setVidSourceFile(null)}
                    className="text-red-600 hover:underline cursor-pointer"
                  >
                    Bỏ ảnh
                  </button>
                </div>
              )}
            </div>

            {vidError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                {vidError}
              </div>
            )}

            <button
              type="submit"
              disabled={vidLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
            >
              <Film className="w-4 h-4" />
              <span>
                {vidLoading
                  ? 'Đang dựng video (có thể mất 1-3 phút)...'
                  : vidSourceFile
                  ? 'Chuyển động ảnh thành Video'
                  : 'Tạo Video từ văn bản'}
              </span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[360px]">
            {vidOutput ? (
              <div className="w-full space-y-4">
                <video
                  controls
                  src={vidOutput.url}
                  className={`w-full rounded-xl border border-slate-200 bg-black ${
                    vidOutput.aspectRatio === '9:16' ? 'max-h-[460px] mx-auto max-w-[300px]' : 'aspect-video'
                  }`}
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Khung hình: {vidOutput.aspectRatio} · gemini-omni-1.2-flash</span>
                  <a
                    href={vidOutput.url}
                    download={`edusmart_video_${Date.now()}.mp4`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Video MP4</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center max-w-sm">
                <Film className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">Khung phát Video học liệu</p>
                <p className="text-xs text-slate-500 mt-1">
                  Tạo video mô phỏng từ văn bản hoặc tải ảnh thí nghiệm/sơ đồ lên để tạo chuyển động (16:9 hoặc 9:16).
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
