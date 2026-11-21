import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const ALLOWED_TEXT_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-4-neon',
  'gemini-4-carbon',
]);

export function resolveTextModel(requested?: string, fallback = 'gemini-4-hydrogen'): string {
  if (requested && ALLOWED_TEXT_MODELS.has(requested)) {
    return requested;
  }
  return fallback;
}

export function formatGeminiError(error: unknown): { status: number; code: string; message: string } {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const lower = rawMessage.toLowerCase();

  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      code: 'RESOURCE_EXHAUSTED',
      message:
        'Hạn mức API hiện tại đã đạt giới hạn hoặc mô hình này yêu cầu khóa API trả phí. Vui lòng chọn khóa API có bật thanh toán trong Settings > Secrets hoặc chuyển sang mô hình gemini-4-hydrogen.',
    };
  }
  if (lower.includes('permission_denied') || lower.includes('403') || lower.includes('api_key_invalid')) {
    return {
      status: 403,
      code: 'PERMISSION_DENIED',
      message:
        'Khóa GEMINI_API_KEY không hợp lệ hoặc chưa được cấp quyền cho mô hình này. Vui lòng kiểm tra lại trong Settings > Secrets.',
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      code: 'NOT_FOUND',
      message: 'Không tìm thấy mô hình AI được yêu cầu. Vui lòng thử lại với mô hình mặc định.',
    };
  }
  return {
    status: 500,
    code: 'GEMINI_ERROR',
    message: rawMessage || 'Đã xảy ra lỗi khi gọi Gemini API.',
  };
}

export async function generateThinkFeedback(params: {
  subject: string;
  topic: string;
  initialAnswer: string;
  keyArguments: string;
  model?: string;
}) {
  const model = resolveTextModel(params.model, 'gemini-3.1-flash-lite');
  const prompt = [
    `Môn học: ${params.subject}`,
    `Chủ đề / Câu hỏi: ${params.topic}`,
    `Câu trả lời ban đầu của học sinh: ${params.initialAnswer}`,
    params.keyArguments ? `Lập luận chính: ${params.keyArguments}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction:
        'Bạn là cố vấn phương pháp tự học cho học sinh THPT Việt Nam (Trường PTDTNT THPT Quảng Nam). ' +
        'Hãy nhận xét ngắn gọn, khích lệ phần tư duy độc lập của học sinh ở bước THINK FIRST: ' +
        '1) Ghi nhận điểm hợp lý; 2) Chỉ ra 1-2 điểm cần kiểm chứng hoặc bổ sung lập luận; ' +
        '3) Đặt 2 câu hỏi gợi mở để học sinh tiếp tục trao đổi với AI Coach. Tuyệt đối không giải hộ toàn bộ bài. Trình bày rõ ràng bằng tiếng Việt.',
      ...(model !== 'gemini-3.1-flash-lite'
        ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
        : {}),
    },
  });

  return {
    feedback: response.text?.trim() || 'Đã ghi nhận suy nghĩ độc lập của em. Hãy chuyển sang AI Coach để thảo luận sâu hơn.',
    modelUsed: model,
  };
}

const COACH_PERSONAS: Record<string, string> = {
  socratic:
    'Bạn là Gia sư Socratic của nền tảng EDU SMART (Trường PTDTNT THPT Quảng Nam). Nguyên tắc cốt lõi: KHÔNG bao giờ đưa ngay đáp án hoàn chỉnh ở lượt đầu. Hãy đặt câu hỏi dẫn dắt từng bước, gợi ý công thức/khái niệm nền tảng trong SGK, khuyến khích học sinh tự suy luận và kiểm tra lại câu trả lời của mình.',
  stem:
    'Bạn là Cố vấn Toán học & Khoa học Tự nhiên (Lý, Hóa, Sinh). Hướng dẫn học sinh phân tích dữ kiện bài toán, xác định định luật/công thức áp dụng, gợi ý từng bước biến đổi và kiểm tra đơn vị, điều kiện nghiệm. Trả lời chuẩn xác, súc tích bằng tiếng Việt.',
  humanities:
    'Bạn là Cố vấn Ngữ văn, Lịch sử & Địa lý. Giúp học sinh rèn tư duy phản biện, xây dựng dàn ý luận điểm - luận cứ - dẫn chứng theo chương trình GDPT 2018, đặt câu hỏi mở để học sinh tự diễn đạt bằng văn phong cá nhân.',
  cs:
    'Bạn là Cố vấn Tin học & Tư duy thuật toán. Hướng dẫn học sinh phân rã bài toán, thiết kế thuật toán, tự tìm lỗi logic (debug) và hiểu bản chất thay vì chép mã nguồn.',
};

export async function runCoachChat(params: {
  rolePersona: string;
  model?: string;
  topic: string;
  history: Array<{ role: 'user' | 'model'; text: string }>;
  message: string;
  initialThinkContext?: string;
}) {
  const model = resolveTextModel(params.model, 'gemini-4-hydrogen');
  const personaPrompt = COACH_PERSONAS[params.rolePersona] ?? COACH_PERSONAS.socratic;
  const systemInstruction = `${personaPrompt}\nChủ đề buổi học: ${params.topic}.${
    params.initialThinkContext
      ? `\nLập luận ban đầu học sinh đã viết ở bước THINK FIRST: "${params.initialThinkContext}". Hãy nối tiếp từ lập luận này.`
      : ''
  }`;

  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction,
    },
    history: params.history.slice(-16).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  });

  const response = await chat.sendMessage({
    message: params.message,
  });

  return {
    reply: response.text?.trim() || 'Em hãy chia sẻ thêm suy nghĩ của mình về bước tiếp theo nhé.',
    modelUsed: model,
  };
}

export async function runFactCheck(params: {
  claim: string;
  textbookSource?: string;
}) {
  const prompt = [
    `Hãy kiểm chứng độ chính xác của nhận định/thông tin sau bằng dữ liệu tìm kiếm thực tế:`,
    `"${params.claim}"`,
    params.textbookSource ? `Nguồn sách giáo khoa học sinh đang đối chiếu: ${params.textbookSource}` : '',
    `Trình bày bằng tiếng Việt gồm 3 phần rõ ràng:`,
    `1. Đánh giá độ tin cậy (Chính xác / Cần bổ sung ngữ cảnh / Có điểm chưa chính xác).`,
    `2. Phân tích đối chiếu ngắn gọn và chỉ ra những chi tiết học sinh cần kiểm tra lại trong SGK hoặc tài liệu chính thống.`,
    `3. Gợi ý câu hỏi phản biện để học sinh tự rút ra kết luận cá nhân.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks
    .map((chunk) => {
      if (chunk.web?.uri) {
        return {
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri,
        };
      }
      return null;
    })
    .filter((item): item is { title: string; uri: string } => item !== null);

  // Deduplicate by URI
  const uniqueSources = Array.from(new Map(sources.map((s) => [s.uri, s])).values());

  return {
    analysis: response.text?.trim() || 'Không thể tổng hợp phân tích kiểm chứng.',
    sources: uniqueSources,
  };
}

export async function generateSelfTestQuestion(params: {
  subject: string;
  topic: string;
  model?: string;
}) {
  const model = resolveTextModel(params.model, 'gemini-4-hydrogen');
  const response = await ai.models.generateContent({
    model,
    contents: `Tạo 1 đề bài tự kiểm tra năng lực hiểu bản chất và vận dụng thực tế (không kiểm tra học vẹt) cho học sinh THPT.\nMôn học: ${params.subject}\nChủ đề: ${params.topic}`,
    config: {
      systemInstruction:
        'Trả về JSON hợp lệ bằng tiếng Việt. Câu hỏi phải yêu cầu học sinh giải thích bằng ngôn ngữ cá nhân và vận dụng vào một tình huống thực tiễn gần gũi.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: 'Câu hỏi kiểm tra hiểu bản chất kiến thức.',
          },
          appliedPrompt: {
            type: Type.STRING,
            description: 'Tình huống thực tế yêu cầu học sinh vận dụng kiến thức.',
          },
          rubricHints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 tiêu chí đánh giá câu trả lời tự kiểm tra.',
          },
        },
        required: ['question', 'appliedPrompt', 'rubricHints'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  return {
    question: String(parsed.question || `Trình bày bản chất của ${params.topic} bằng ngôn ngữ của em.`),
    appliedPrompt: String(
      parsed.appliedPrompt || `Nêu 1 tình huống thực tế vận dụng ${params.topic} trong đời sống hoặc học tập.`
    ),
    rubricHints: Array.isArray(parsed.rubricHints) ? parsed.rubricHints.map(String) : [],
    modelUsed: model,
  };
}

export async function evaluateSelfTestAnswer(params: {
  subject: string;
  topic: string;
  question: string;
  studentExplanation: string;
  appliedScenario: string;
  model?: string;
}) {
  const model = resolveTextModel(params.model, 'gemini-4-hydrogen');
  const response = await ai.models.generateContent({
    model,
    contents: [
      `Môn học: ${params.subject}`,
      `Chủ đề: ${params.topic}`,
      `Câu hỏi: ${params.question}`,
      `Phần giải thích bằng ngôn ngữ cá nhân của học sinh: ${params.studentExplanation}`,
      `Phần vận dụng tình huống mới: ${params.appliedScenario || '(Học sinh chưa điền)'}`,
    ].join('\n\n'),
    config: {
      systemInstruction:
        'Bạn là giám khảo đánh giá năng lực tự học theo thang điểm 0-100. Chấm điểm công tâm dựa trên mức độ hiểu bản chất (không chép máy móc), khả năng diễn đạt bằng ngôn ngữ riêng và tính hợp lý khi vận dụng thực tế. Trả về JSON tiếng Việt.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER, description: 'Điểm từ 0 đến 100.' },
          strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Các điểm làm tốt.',
          },
          improvements: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Các điểm cần cải thiện.',
          },
          feedback: {
            type: Type.STRING,
            description: 'Nhận xét tổng hợp và định hướng ôn tập.',
          },
        },
        required: ['score', 'strengths', 'improvements', 'feedback'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  const rawScore = Number(parsed.score);
  const clampedScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 70;
  return {
    score: clampedScore,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String) : [],
    feedback: String(parsed.feedback || 'Đã hoàn thành bài tự kiểm tra.'),
    modelUsed: model,
  };
}

export async function generateOrEditEducationalImage(params: {
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
  sourceImageBase64?: string;
  sourceMimeType?: string;
}) {
  const allowedRatios = new Set(['1:1', '3:4', '4:3', '9:16', '16:9']);
  const aspectRatio = params.aspectRatio && allowedRatios.has(params.aspectRatio) ? params.aspectRatio : '1:1';
  const imageSize = params.imageSize === '2K' || params.imageSize === '4K' ? params.imageSize : '1K';

  const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];
  if (params.sourceImageBase64 && params.sourceMimeType) {
    parts.push({
      inlineData: {
        data: params.sourceImageBase64,
        mimeType: params.sourceMimeType,
      },
    });
  }
  parts.push({ text: params.prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-nano-banana-2.1',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio,
        imageSize,
      },
    },
  });

  let imageDataUrl = '';
  let caption = '';

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data && !imageDataUrl) {
      const mime = part.inlineData.mimeType ?? 'image/png';
      imageDataUrl = `data:${mime};base64,${part.inlineData.data}`;
    } else if (part.text) {
      caption += part.text;
    }
  }

  if (!imageDataUrl) {
    throw new Error('Mô hình không trả về dữ liệu hình ảnh. Vui lòng mô tả chi tiết hơn.');
  }

  return {
    imageDataUrl,
    caption: caption.trim(),
  };
}

export async function generateEducationalVideo(params: {
  prompt: string;
  aspectRatio?: '16:9' | '9:16';
  duration?: '5s' | '8s' | '10s';
  sourceImageBase64?: string;
  sourceMimeType?: string;
}) {
  const aspectRatio = params.aspectRatio === '9:16' ? '9:16' : '16:9';
  const duration = params.duration === '5s' || params.duration === '8s' ? params.duration : '10s';

  const input =
    params.sourceImageBase64 && params.sourceMimeType
      ? [
          {
            type: 'image' as const,
            mime_type: params.sourceMimeType,
            data: params.sourceImageBase64,
          },
          {
            type: 'text' as const,
            text: params.prompt,
          },
        ]
      : params.prompt;

  const interaction = await ai.interactions.create(
    {
      model: 'gemini-omni-1.2-flash',
      input,
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: aspectRatio,
        duration,
        resolution: '720p',
      },
    },
    { timeout: 300000 }
  );

  const videoPart = interaction.output_video;
  if (!videoPart || !videoPart.data) {
    throw new Error('Không nhận được dữ liệu video từ Gemini Interactions API.');
  }

  const mimeType = videoPart.mime_type || 'video/mp4';
  const videoDataUrl = `data:${mimeType};base64,${videoPart.data}`;

  return {
    videoDataUrl,
    mimeType,
    aspectRatio,
  };
}
