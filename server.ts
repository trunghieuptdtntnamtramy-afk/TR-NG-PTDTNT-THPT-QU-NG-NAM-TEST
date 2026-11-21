import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  evaluateSelfTestAnswer,
  formatGeminiError,
  generateEducationalVideo,
  generateOrEditEducationalImage,
  generateSelfTestQuestion,
  generateThinkFeedback,
  runCoachChat,
  runFactCheck,
} from './server/gemini.ts';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Module 02: Think First AI Feedback
  app.post('/api/gemini/think-feedback', async (req, res) => {
    try {
      const { subject, topic, initialAnswer, keyArguments, model } = req.body ?? {};
      if (typeof subject !== 'string' || typeof topic !== 'string' || typeof initialAnswer !== 'string') {
        return res.status(400).json({ error: 'Thiếu thông tin môn học, chủ đề hoặc câu trả lời ban đầu.' });
      }
      if (!initialAnswer.trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập suy nghĩ ban đầu của em trước khi gửi.' });
      }
      const result = await generateThinkFeedback({
        subject: subject.slice(0, 80),
        topic: topic.slice(0, 240),
        initialAnswer: initialAnswer.slice(0, 3000),
        keyArguments: typeof keyArguments === 'string' ? keyArguments.slice(0, 1500) : '',
        model: typeof model === 'string' ? model : undefined,
      });
      res.json(result);
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  // Module 03: AI Coach Multi-turn Chat
  app.post('/api/gemini/coach-chat', async (req, res) => {
    try {
      const { rolePersona, model, topic, history, message, initialThinkContext } = req.body ?? {};
      if (typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập nội dung trao đổi.' });
      }
      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (m: unknown): m is { role: 'user' | 'model'; text: string } =>
                Boolean(m) &&
                typeof m === 'object' &&
                ((m as { role?: string }).role === 'user' || (m as { role?: string }).role === 'model') &&
                typeof (m as { text?: unknown }).text === 'string'
            )
            .slice(-16)
        : [];

      const result = await runCoachChat({
        rolePersona: typeof rolePersona === 'string' ? rolePersona : 'socratic',
        model: typeof model === 'string' ? model : undefined,
        topic: typeof topic === 'string' && topic.trim() ? topic.slice(0, 240) : 'Phương pháp tự học',
        history: safeHistory,
        message: message.slice(0, 3000),
        initialThinkContext: typeof initialThinkContext === 'string' ? initialThinkContext.slice(0, 1500) : undefined,
      });
      res.json(result);
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  // Module 04: Fact Check with Google Search Grounding (gemini-4-hydrogen)
  app.post('/api/gemini/fact-check', async (req, res) => {
    try {
      const { claim, textbookSource } = req.body ?? {};
      if (typeof claim !== 'string' || !claim.trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập nội dung cần kiểm chứng.' });
      }
      const result = await runFactCheck({
        claim: claim.slice(0, 2000),
        textbookSource: typeof textbookSource === 'string' ? textbookSource.slice(0, 300) : undefined,
      });
      res.json(result);
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  // Module 05: Self Test Question Generator & Rubric Evaluator
  app.post('/api/gemini/self-test/generate', async (req, res) => {
    try {
      const { subject, topic, model } = req.body ?? {};
      if (typeof subject !== 'string' || typeof topic !== 'string' || !topic.trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập môn học và chủ đề cần tự kiểm tra.' });
      }
      const result = await generateSelfTestQuestion({
        subject: subject.slice(0, 80),
        topic: topic.slice(0, 240),
        model: typeof model === 'string' ? model : undefined,
      });
      res.json(result);
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  app.post('/api/gemini/self-test/evaluate', async (req, res) => {
    try {
      const { subject, topic, question, studentExplanation, appliedScenario, model } = req.body ?? {};
      if (
        typeof subject !== 'string' ||
        typeof topic !== 'string' ||
        typeof question !== 'string' ||
        typeof studentExplanation !== 'string' ||
        !studentExplanation.trim()
      ) {
        return res.status(400).json({ error: 'Vui lòng điền phần tự giải thích kiến thức trước khi nộp bài.' });
      }
      const result = await evaluateSelfTestAnswer({
        subject: subject.slice(0, 80),
        topic: topic.slice(0, 240),
        question: question.slice(0, 2000),
        studentExplanation: studentExplanation.slice(0, 4000),
        appliedScenario: typeof appliedScenario === 'string' ? appliedScenario.slice(0, 3000) : '',
        model: typeof model === 'string' ? model : undefined,
      });
      res.json(result);
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  // Media Studio: Create & Edit Images (gemini-nano-banana-2.1)
  app.post('/api/gemini/image', async (req, res) => {
    try {
      const { prompt, aspectRatio, imageSize, sourceImageBase64, sourceMimeType } = req.body ?? {};
      if (typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập mô tả hình ảnh cần tạo hoặc chỉnh sửa.' });
      }
      const result = await generateOrEditEducationalImage({
        prompt: prompt.slice(0, 1500),
        aspectRatio: typeof aspectRatio === 'string' ? aspectRatio : '1:1',
        imageSize: typeof imageSize === 'string' ? imageSize : '1K',
        sourceImageBase64: typeof sourceImageBase64 === 'string' ? sourceImageBase64 : undefined,
        sourceMimeType: typeof sourceMimeType === 'string' ? sourceMimeType : undefined,
      });
      res.json(result);
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  // Media Studio: Generate Video or Animate Photo (gemini-omni-1.2-flash via Interactions API)
  app.post('/api/gemini/video', async (req, res) => {
    try {
      const { prompt, aspectRatio, duration, sourceImageBase64, sourceMimeType } = req.body ?? {};
      if (typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập mô tả chuyển động hoặc nội dung video.' });
      }
      const result = await generateEducationalVideo({
        prompt: prompt.slice(0, 1500),
        aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
        duration: duration === '5s' || duration === '8s' ? duration : '10s',
        sourceImageBase64: typeof sourceImageBase64 === 'string' ? sourceImageBase64 : undefined,
        sourceMimeType: typeof sourceMimeType === 'string' ? sourceMimeType : undefined,
      });
      res.json(result);
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`EDU SMART server running at http://0.0.0.0:${port}`);
  });
}

startServer();
