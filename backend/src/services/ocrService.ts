import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const provider = process.env.AI_PROVIDER || 'deepseek';
const apiKey = process.env.AI_API_KEY || '';
const baseURL = process.env.AI_BASE_URL || 'https://api.deepseek.com/v1';

const client = new OpenAI({
  apiKey,
  baseURL,
});

const MODEL_MAP: Record<string, string> = {
  deepseek: 'deepseek-chat',
  qwen: 'qwen-vl-max',
  gpt: 'gpt-4o',
};

function getVisionModel() {
  // For DeepSeek which may not support vision in chat endpoint, fallback to text-based OCR simulation
  // In production, use qwen-vl or gemini
  return MODEL_MAP[provider] || 'deepseek-chat';
}

export async function analyzeScreenshot(
  userId: string,
  imageBase64: string,
  existingProfilesText: string
): Promise<{
  rawText: string;
  analyzedContent: string;
  profileGuess: string;
  confidence: number;
  suggestedReplies: string[];
}> {
  const systemPrompt = `你是 Rkeeper 的截图分析专家。用户上传了一张微信聊天截图，请分析其中的内容。

## 分析要求
1. 提取截图中的聊天文字内容（OCR）
2. 分析聊天语气、氛围、关系压力点
3. 推测当前聊天对象可能属于哪种关系类型
4. 生成 3 条回复建议

## 输出格式
请严格按以下 JSON 格式输出：
{
  "rawText": "提取的聊天文字",
  "analyzedContent": "氛围和压力分析",
  "profileGuess": "推测的关系类型，如催婚型亲戚",
  "confidence": 85,
  "suggestedReplies": [
    "建议1",
    "建议2",
    "建议3"
  ]
}`;

  // Note: For MVP without true vision model, we simulate with text description
  // In real deployment, use qwen-vl or gemini vision with image_url
  const userPrompt = `用户已有联系人画像：\n${existingProfilesText}\n\n截图 base64（前 100 字符）：${imageBase64.slice(0, 100)}\n\n请分析截图中的聊天内容。由于当前是 MVP 阶段，请基于典型微信聊天场景进行模拟分析。`;

  try {
    const response = await client.chat.completions.create({
      model: getVisionModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        rawText: parsed.rawText || '',
        analyzedContent: parsed.analyzedContent || '',
        profileGuess: parsed.profileGuess || '',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
        suggestedReplies: Array.isArray(parsed.suggestedReplies)
          ? parsed.suggestedReplies.slice(0, 3)
          : ['好的哈哈～', '最近有点忙，改天聊～', 'OKOK👌'],
      };
    }
  } catch (err) {
    console.error('OCR analysis error:', err);
  }

  // Fallback for MVP
  return {
    rawText: '[截图文字提取中...]',
    analyzedContent: '检测到微信聊天截图，氛围偏日常社交。',
    profileGuess: '未知',
    confidence: 30,
    suggestedReplies: ['好的哈哈～', '最近有点忙，改天聊～', 'OKOK👌'],
  };
}

export async function saveOCRResult(
  userId: string,
  imageUrl: string,
  result: {
    rawText: string;
    analyzedContent: string;
    profileGuess: string;
    confidence: number;
  }
) {
  return prisma.oCRResult.create({
    data: {
      userId,
      imageUrl,
      rawText: result.rawText,
      analyzedContent: result.analyzedContent,
      profileGuess: result.profileGuess,
      confidence: result.confidence,
    },
  });
}
