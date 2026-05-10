import { PrismaClient } from '@prisma/client';
import { ProfileInput } from '../types';

const prisma = new PrismaClient();

export async function createProfile(userId: string, input: ProfileInput) {
  return prisma.profile.create({
    data: {
      userId,
      nickname: input.nickname,
      emoji: input.emoji || '👤',
      category: input.category,
      subCategory: input.subCategory,
      currentGoal: input.currentGoal,
      energyLevel: input.energyLevel,
      riskTags: input.riskTags ? JSON.stringify(input.riskTags) : null,
      commonTopics: input.commonTopics ? JSON.stringify(input.commonTopics) : null,
      pressurePoints: input.pressurePoints ? JSON.stringify(input.pressurePoints) : null,
      voicePreference: input.voicePreference,
      likeToAsk: input.likeToAsk,
      emotionPattern: input.emotionPattern,
      notes: input.notes,
    },
  });
}

export async function updateProfile(profileId: string, input: Partial<ProfileInput>) {
  const data: any = {};
  if (input.nickname !== undefined) data.nickname = input.nickname;
  if (input.emoji !== undefined) data.emoji = input.emoji;
  if (input.category !== undefined) data.category = input.category;
  if (input.subCategory !== undefined) data.subCategory = input.subCategory;
  if (input.currentGoal !== undefined) data.currentGoal = input.currentGoal;
  if (input.energyLevel !== undefined) data.energyLevel = input.energyLevel;
  if (input.riskTags !== undefined) data.riskTags = JSON.stringify(input.riskTags);
  if (input.commonTopics !== undefined) data.commonTopics = JSON.stringify(input.commonTopics);
  if (input.pressurePoints !== undefined) data.pressurePoints = JSON.stringify(input.pressurePoints);
  if (input.voicePreference !== undefined) data.voicePreference = input.voicePreference;
  if (input.likeToAsk !== undefined) data.likeToAsk = input.likeToAsk;
  if (input.emotionPattern !== undefined) data.emotionPattern = input.emotionPattern;
  if (input.notes !== undefined) data.notes = input.notes;

  return prisma.profile.update({
    where: { id: profileId },
    data,
  });
}

export async function getProfilesByUser(userId: string) {
  return prisma.profile.findMany({
    where: { userId, status: 'active' },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getProfileById(profileId: string) {
  return prisma.profile.findUnique({
    where: { id: profileId },
  });
}

export async function deleteProfile(profileId: string) {
  return prisma.profile.update({
    where: { id: profileId },
    data: { status: 'archived' },
  });
}

export function formatProfileForPrompt(profile: any): string {
  const riskTags = profile.riskTags ? JSON.parse(profile.riskTags) : [];
  const commonTopics = profile.commonTopics ? JSON.parse(profile.commonTopics) : [];
  const pressurePoints = profile.pressurePoints ? JSON.parse(profile.pressurePoints) : [];

  return `
联系人：${profile.emoji} ${profile.nickname}
关系类型：${profile.category}${profile.subCategory ? ' / ' + profile.subCategory : ''}
当前目标：${profile.currentGoal || '未设置'}
电量状态：${profile.energyLevel || '正常'}
风险标签：${riskTags.join(', ') || '无'}
常见话题：${commonTopics.join(', ') || '无'}
压力点：${pressurePoints.join(', ') || '无'}
语音偏好：${profile.voicePreference || '未知'}
是否追问：${profile.likeToAsk === true ? '是' : profile.likeToAsk === false ? '否' : '未知'}
情绪模式：${profile.emotionPattern || '未知'}
备注：${profile.notes || '无'}
`.trim();
}

export async function getAllProfilesFormatted(userId: string): Promise<string> {
  const profiles = await getProfilesByUser(userId);
  if (profiles.length === 0) return '暂无联系人画像';
  return profiles.map(formatProfileForPrompt).join('\n---\n');
}
