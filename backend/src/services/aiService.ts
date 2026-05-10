import OpenAI from 'openai';
import { ReplyOutput } from '../types';

const provider = process.env.AI_PROVIDER || 'deepseek';
const apiKey = process.env.AI_API_KEY || '';
const baseURL = process.env.AI_BASE_URL || 'https://api.deepseek.com/v1';

const client = new OpenAI({
  apiKey,
  baseURL,
});

const MODEL_MAP: Record<string, string> = {
  deepseek: 'deepseek-chat',
  qwen: 'qwen-turbo',
  gpt: 'gpt-3.5-turbo',
};

function getModel() {
  return MODEL_MAP[provider] || 'deepseek-chat';
}

export async function generateReplies(
  context: string,
  profileInfo: string,
  goal: string,
  energy: string,
  strategy?: string
): Promise<ReplyOutput> {
  const strategyText = strategy || '根据当前目标自动选择最佳策略';

  // Fallback if no API key configured
  if (!apiKey || apiKey === 'your-api-key-here') {
    return getFallbackReplies(goal, energy, context);
  }

  const systemPrompt = `你是 Rkeeper（AI 低电量社交关系系统）的回复生成专家。
你的任务是帮助社交低能量用户，用最低成本、最像真人的方式回复微信消息。

## 核心规则
1. 输出必须是 3 条简短回复，每条 1-2 句话
2. 语气必须像真人微信，禁止 AI 长文、官方语气、GPT 味
3. 禁止使用"作为 AI""很高兴为你服务"等表述
4. 可以使用 emoji，但要克制、自然
5. 回复要像朋友/同事/家人日常聊天的感觉

## 当前策略
${strategyText}

## 用户当前目标
${goal || '礼貌维持关系'}

## 用户当前电量状态
${energy || '正常'}

## 关系画像信息
${profileInfo || '暂无'}

## 输出格式
请严格按以下 JSON 格式输出，不要包含其他内容：
{
  "strategy": "使用的策略名称",
  "suggestions": [
    "第一条回复",
    "第二条回复",
    "第三条回复"
  ]
}`;

  const userPrompt = `对方消息/聊天上下文：\n${context}\n\n请生成 3 条回复建议。`;

  try {
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 512,
    });

    const content = response.choices[0]?.message?.content || '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        strategy: parsed.strategy || '礼貌维持型',
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.slice(0, 3)
          : ['好的哈哈～', '最近有点忙，改天聊～', 'OKOK👌'],
      };
    }
  } catch (err) {
    console.error('generateReplies error:', err);
  }

  return getFallbackReplies(goal, energy, context);
}

function getFallbackReplies(goal: string, energy: string, context: string): ReplyOutput {
  const isLowEnergy = energy && energy !== '正常';
  const isQuickEnd = goal === '快速结束聊天';

  if (context.includes('结婚') || context.includes('对象') || context.includes('催')) {
    return {
      strategy: '催婚场景-礼貌回避型',
      suggestions: [
        '最近还是先忙工作啦哈哈～',
        '顺其自然吧，目前还没太考虑～',
        isLowEnergy ? '最近真的忙到飞起😭' : '遇到合适的会考虑的～',
      ],
    };
  }

  if (context.includes('加班') || context.includes('老板') || context.includes('工作')) {
    return {
      strategy: '职场场景-装忙/拖延型',
      suggestions: [
        '收到，我尽快处理～',
        '目前在忙另一个项目，晚点给您回复～',
        isLowEnergy ? '好的，明天给您进度😭' : '明白，我协调一下时间～',
      ],
    };
  }

  return {
    strategy: isQuickEnd ? '快速结束型' : '礼貌维持型',
    suggestions: [
      '好的哈哈～',
      isLowEnergy ? '最近有点累，改天再聊～' : '最近有点忙，改天聊～',
      'OKOK👌',
    ],
  };
}

export async function analyzeChatSummary(
  chatContent: string,
  existingProfile: string
): Promise<{
  summary: string;
  newRisks: string[];
  newTopics: string[];
  emotionChange: string;
  updatedProfileNotes: string;
}> {
  if (!apiKey || apiKey === 'your-api-key-here') {
    return getFallbackSummary(chatContent);
  }

  const systemPrompt = `你是 Rkeeper 的关系分析专家。请分析一段聊天记录，提取关键信息更新关系画像。

## 分析维度
1. 聊天摘要（50字以内）
2. 新发现的风险点（JSON 数组）
3. 对方近期关注的新话题（JSON 数组）
4. 情绪变化判断
5. 需要更新的画像笔记

## 输出格式
请严格按以下 JSON 格式输出：
{
  "summary": "摘要",
  "newRisks": ["风险1", "风险2"],
  "newTopics": ["话题1", "话题2"],
  "emotionChange": "情绪变化描述",
  "updatedProfileNotes": "画像更新建议"
}`;

  const userPrompt = `现有画像信息：\n${existingProfile}\n\n本次聊天内容：\n${chatContent}\n\n请分析。`;

  try {
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content || '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || '',
        newRisks: Array.isArray(parsed.newRisks) ? parsed.newRisks : [],
        newTopics: Array.isArray(parsed.newTopics) ? parsed.newTopics : [],
        emotionChange: parsed.emotionChange || '',
        updatedProfileNotes: parsed.updatedProfileNotes || '',
      };
    }
  } catch (err) {
    console.error('analyzeChatSummary error:', err);
  }

  return getFallbackSummary(chatContent);
}

function getFallbackSummary(chatContent: string) {
  const risks: string[] = [];
  const topics: string[] = [];
  let emotion = '平稳';

  if (chatContent.includes('结婚') || chatContent.includes('对象')) {
    risks.push('催婚压力');
    topics.push('婚恋状况');
    emotion = '施压';
  }
  if (chatContent.includes('加班') || chatContent.includes('工作')) {
    risks.push('工作压榨');
    topics.push('工作进度');
    emotion = '紧迫';
  }
  if (chatContent.includes('钱') || chatContent.includes('借')) {
    risks.push('借钱风险');
    topics.push('财务状况');
    emotion = '试探';
  }

  return {
    summary: chatContent.slice(0, 50) + (chatContent.length > 50 ? '...' : ''),
    newRisks: risks,
    newTopics: topics,
    emotionChange: emotion,
    updatedProfileNotes: 'MVP 阶段自动总结：关注 ' + topics.join('、') + '，注意 ' + risks.join('、') + '。',
  };
}

export async function weakMatchProfile(
  context: string,
  profilesInfo: string
): Promise<{
  guess: string;
  confidence: number;
  reason: string;
}> {
  if (!apiKey || apiKey === 'your-api-key-here') {
    return getFallbackMatch(context, profilesInfo);
  }

  const systemPrompt = `你是 Rkeeper 的联系人识别专家。根据聊天内容，从已有画像中推测最可能的联系人。

## 规则
1. 分析关键词、说话风格、emoji、话题类型
2. 返回最可能的联系人昵称和置信度（0-100）
3. 给出推理原因

## 输出格式
{\n  "guess": "推测的联系人昵称",\n  "confidence": 87,\n  "reason": "推理原因"\n}`;

  const userPrompt = `已有联系人画像：\n${profilesInfo}\n\n当前聊天内容：\n${context}\n\n请推测。`;

  try {
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    const content = response.choices[0]?.message?.content || '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        guess: parsed.guess || '未知联系人',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
        reason: parsed.reason || '',
      };
    }
  } catch (err) {
    console.error('weakMatchProfile error:', err);
  }

  return getFallbackMatch(context, profilesInfo);
}

function getFallbackMatch(context: string, profilesInfo: string): { guess: string; confidence: number; reason: string } {
  // Simple keyword matching fallback
  if (profilesInfo.includes('二姨') && (context.includes('结婚') || context.includes('对象'))) {
    return { guess: '二姨', confidence: 87, reason: '关键词匹配：催婚、结婚' };
  }
  if (profilesInfo.includes('老板') && (context.includes('加班') || context.includes('工作') || context.includes('项目'))) {
    return { guess: '老板', confidence: 82, reason: '关键词匹配：工作、加班' };
  }
  return { guess: '未知联系人', confidence: 0, reason: '未匹配到关键词' };
}
