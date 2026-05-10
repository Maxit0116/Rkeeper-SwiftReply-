export interface ProfileInput {
  nickname: string;
  emoji?: string;
  category: string;
  subCategory?: string;
  currentGoal?: string;
  energyLevel?: string;
  riskTags?: string[];
  commonTopics?: string[];
  pressurePoints?: string[];
  voicePreference?: string;
  likeToAsk?: boolean;
  emotionPattern?: string;
  notes?: string;
}

export interface GenerateReplyInput {
  userId: string;
  profileId?: string;
  context: string;
  mode: 'keyboard' | 'screenshot';
  currentGoal?: string;
  energyLevel?: string;
  strategy?: string;
}

export interface ReplyOutput {
  suggestions: string[];
  strategy: string;
  matchedProfile?: {
    id: string;
    nickname: string;
    emoji: string;
    confidence: number;
  };
}

export interface OCRAnalyzeInput {
  userId: string;
  imageBase64: string;
  profileId?: string;
}

export interface SyncChatInput {
  userId: string;
  profileId?: string;
  content: string;
  screenshots?: string[];
}

export type CategoryType =
  | 'family'
  | 'relative'
  | 'work'
  | 'friend'
  | 'love'
  | 'group'
  | 'other';

export type SubCategoryMap = {
  family: ['高压父母型', '真关心型'];
  relative: ['催婚型', '比较型', '借钱型', '寒暄型'];
  work: ['压榨型领导', '甩锅型同事', '客户型关系'];
  friend: ['消耗型朋友', '很久没联系型'];
  love: ['暧昧期', '稳定期', '冷战期'];
  group: ['工作群', '家庭群', '朋友群'];
  other: ['其他'];
};

export const CATEGORY_EMOJI: Record<string, string> = {
  family: '🏠',
  relative: '🧧',
  work: '💼',
  friend: '🍻',
  love: '❤️',
  group: '👥',
  other: '📦',
};

export const GOAL_OPTIONS = [
  '快速结束聊天',
  '礼貌维持关系',
  '不想继续深聊',
  '不想透露隐私',
  '看起来很忙',
  '已读修复',
  '想委婉拒绝',
  '想降低情绪消耗',
];

export const ENERGY_OPTIONS = [
  '社交电量耗尽',
  '今天不想说话',
  '已经回复累了',
  '不想继续解释',
  '不想动脑子',
  '正常',
];
