import { PrismaClient } from '@prisma/client';
import { GenerateReplyInput, ReplyOutput } from '../types';
import { generateReplies, weakMatchProfile } from './aiService';
import {
  getProfilesByUser,
  getProfileById,
  formatProfileForPrompt,
  getAllProfilesFormatted,
} from './profileService';

const prisma = new PrismaClient();

export async function generateReplySuggestions(
  input: GenerateReplyInput
): Promise<ReplyOutput> {
  const { userId, profileId, context, currentGoal, energyLevel, strategy } = input;

  let profileInfo = '';
  let matchedProfile: { id: string; nickname: string; emoji: string; confidence: number } | undefined;

  if (profileId) {
    const profile = await getProfileById(profileId);
    if (profile) {
      profileInfo = formatProfileForPrompt(profile);
      matchedProfile = {
        id: profile.id,
        nickname: profile.nickname,
        emoji: profile.emoji,
        confidence: 100,
      };
    }
  } else {
    // Weak match
    const allProfiles = await getAllProfilesFormatted(userId);
    if (allProfiles !== '暂无联系人画像') {
      const match = await weakMatchProfile(context, allProfiles);
      if (match.confidence > 60) {
        const profiles = await getProfilesByUser(userId);
        const found = profiles.find((p) => p.nickname === match.guess);
        if (found) {
          profileInfo = formatProfileForPrompt(found);
          matchedProfile = {
            id: found.id,
            nickname: found.nickname,
            emoji: found.emoji,
            confidence: match.confidence,
          };
        }
      }
    }
  }

  const goal = currentGoal || matchedProfile ? '礼貌维持关系' : '快速结束聊天';
  const energy = energyLevel || '正常';

  const result = await generateReplies(context, profileInfo, goal, energy, strategy);

  // Save suggestion to history
  await prisma.replySuggestion.create({
    data: {
      userId,
      profileId: matchedProfile?.id || profileId || null,
      inputText: context,
      strategy: result.strategy,
      replies: JSON.stringify(result.suggestions),
    },
  });

  return {
    ...result,
    matchedProfile,
  };
}

export async function recordChoice(suggestionId: string, chosenIndex: number) {
  return prisma.replySuggestion.update({
    where: { id: suggestionId },
    data: { chosenIndex },
  });
}
