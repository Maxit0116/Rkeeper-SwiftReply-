import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createProfile, updateProfile, getProfilesByUser, getProfileById, deleteProfile } from '../services/profileService';
import { generateReplySuggestions } from '../services/replyService';
import { analyzeChatSummary } from '../services/aiService';
import { analyzeScreenshot, saveOCRResult } from '../services/ocrService';
import { getAllProfilesFormatted } from '../services/profileService';

const router = Router();
const prisma = new PrismaClient();

// Middleware to validate userId
function requireUserId(req: Request, res: Response, next: Function) {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'Missing x-user-id header' });
  }
  (req as any).userId = userId;
  next();
}

// ========== User ==========
router.post('/user/register', async (req, res) => {
  const schema = z.object({
    deviceId: z.string().optional(),
    openId: z.string().optional(),
  });
  const body = schema.parse(req.body);

  let user = await prisma.user.findFirst({
    where: { OR: [{ deviceId: body.deviceId }, { openId: body.openId }] },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { deviceId: body.deviceId, openId: body.openId },
    });
  }

  res.json({ userId: user.id, createdAt: user.createdAt });
});

// ========== Profile ==========
const ProfileSchema = z.object({
  nickname: z.string().min(1),
  emoji: z.string().optional(),
  category: z.enum(['family', 'relative', 'work', 'friend', 'love', 'group', 'other']),
  subCategory: z.string().optional(),
  currentGoal: z.string().optional(),
  energyLevel: z.string().optional(),
  riskTags: z.array(z.string()).optional(),
  commonTopics: z.array(z.string()).optional(),
  pressurePoints: z.array(z.string()).optional(),
  voicePreference: z.string().optional(),
  likeToAsk: z.boolean().optional(),
  emotionPattern: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/profiles', requireUserId, async (req, res) => {
  const userId = (req as any).userId;
  const input = ProfileSchema.parse(req.body);
  const profile = await createProfile(userId, input);
  res.json(profile);
});

router.get('/profiles', requireUserId, async (req, res) => {
  const userId = (req as any).userId;
  const profiles = await getProfilesByUser(userId);
  res.json(profiles);
});

router.get('/profiles/:id', requireUserId, async (req, res) => {
  const profile = await getProfileById(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Not found' });
  res.json(profile);
});

router.patch('/profiles/:id', requireUserId, async (req, res) => {
  const input = ProfileSchema.partial().parse(req.body);
  const profile = await updateProfile(req.params.id, input);
  res.json(profile);
});

router.delete('/profiles/:id', requireUserId, async (req, res) => {
  await deleteProfile(req.params.id);
  res.json({ success: true });
});

// ========== Reply Generation ==========
const GenerateSchema = z.object({
  profileId: z.string().optional(),
  context: z.string().min(1),
  mode: z.enum(['keyboard', 'screenshot']),
  currentGoal: z.string().optional(),
  energyLevel: z.string().optional(),
  strategy: z.string().optional(),
});

router.post('/replies/generate', requireUserId, async (req, res) => {
  const userId = (req as any).userId;
  const input = GenerateSchema.parse(req.body);
  const result = await generateReplySuggestions({ userId, ...input });
  res.json(result);
});

// ========== OCR / Screenshot Analysis ==========
router.post('/ocr/analyze', requireUserId, async (req, res) => {
  const userId = (req as any).userId;
  const schema = z.object({
    imageBase64: z.string().min(1),
    profileId: z.string().optional(),
  });
  const { imageBase64, profileId } = schema.parse(req.body);

  const profilesText = await getAllProfilesFormatted(userId);
  const result = await analyzeScreenshot(userId, imageBase64, profilesText);

  // Save result
  await saveOCRResult(userId, 'data:image/jpeg;base64,' + imageBase64.slice(0, 20) + '...', result);

  res.json(result);
});

// ========== Chat Sync ==========
const SyncSchema = z.object({
  profileId: z.string().optional(),
  content: z.string().min(1),
  screenshots: z.array(z.string()).optional(),
});

router.post('/chat/sync', requireUserId, async (req, res) => {
  const userId = (req as any).userId;
  const { profileId, content, screenshots } = SyncSchema.parse(req.body);

  let profileInfo = '暂无画像';
  if (profileId) {
    const profile = await getProfileById(profileId);
    if (profile) {
      const { formatProfileForPrompt } = await import('../services/profileService');
      profileInfo = formatProfileForPrompt(profile);
    }
  }

  const analysis = await analyzeChatSummary(content, profileInfo);

  const chatHistory = await prisma.chatHistory.create({
    data: {
      userId,
      profileId: profileId || null,
      content,
      screenshots: screenshots ? JSON.stringify(screenshots) : null,
      summary: analysis.summary,
      newRisks: analysis.newRisks.length > 0 ? JSON.stringify(analysis.newRisks) : null,
      newTopics: analysis.newTopics.length > 0 ? JSON.stringify(analysis.newTopics) : null,
      emotionChange: analysis.emotionChange,
    },
  });

  // Optionally update profile notes
  if (profileId && analysis.updatedProfileNotes) {
    await prisma.profile.update({
      where: { id: profileId },
      data: { notes: analysis.updatedProfileNotes },
    });
  }

  res.json({ chatHistory, analysis });
});

// ========== Chat History ==========
router.get('/chat/history', requireUserId, async (req, res) => {
  const userId = (req as any).userId;
  const history = await prisma.chatHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { profile: true },
  });
  res.json(history);
});

// ========== Templates & Options ==========
router.get('/options/categories', (_req, res) => {
  res.json([
    { value: 'family', label: '家庭', emoji: '🏠' },
    { value: 'relative', label: '亲戚', emoji: '🧧' },
    { value: 'work', label: '职场', emoji: '💼' },
    { value: 'friend', label: '朋友', emoji: '🍻' },
    { value: 'love', label: '恋爱', emoji: '❤️' },
    { value: 'group', label: '群聊', emoji: '👥' },
    { value: 'other', label: '其他', emoji: '📦' },
  ]);
});

router.get('/options/sub-categories', (_req, res) => {
  res.json({
    family: ['高压父母型', '真关心型'],
    relative: ['催婚型', '比较型', '借钱型', '寒暄型'],
    work: ['压榨型领导', '甩锅型同事', '客户型关系'],
    friend: ['消耗型朋友', '很久没联系型'],
    love: ['暧昧期', '稳定期', '冷战期'],
    group: ['工作群', '家庭群', '朋友群'],
    other: ['其他'],
  });
});

router.get('/options/goals', (_req, res) => {
  res.json([
    '快速结束聊天',
    '礼貌维持关系',
    '不想继续深聊',
    '不想透露隐私',
    '看起来很忙',
    '已读修复',
    '想委婉拒绝',
    '想降低情绪消耗',
  ]);
});

router.get('/options/energy', (_req, res) => {
  res.json([
    '社交电量耗尽',
    '今天不想说话',
    '已经回复累了',
    '不想继续解释',
    '不想动脑子',
    '正常',
  ]);
});

export default router;
