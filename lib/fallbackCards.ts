import { Card } from './types';

export const FALLBACK_CARDS: Record<'common' | 'rare' | 'hidden', Omit<Card, 'id' | 'rarity'>> = {
  common: {
    name: '微光',
    description: '微小但真实的力量。',
    effect: '摸1张牌，回复1点生命',
    effect_code: 'draw_1_heal_1',
    cost: 1,
    exposure: 1,
    type: 'utility',
  },
  rare: {
    name: '深井',
    description: '看得越深，越能找到力量。',
    effect: '查看一名玩家的手牌一张，造成2点伤害',
    effect_code: 'view_hand_card',
    cost: 2,
    exposure: 2,
    type: 'info',
    needsTarget: true,
  },
  hidden: {
    name: '无名之物',
    description: '存在于无法命名的地方。',
    activation: '讲述任意一段真实经历后发动',
    effect: '强制一名玩家公开其手牌中所有信息类牌，对其造成3点伤害',
    effect_code: 'force_discard',
    cost: 3,
    exposure: 3,
    type: 'special',
    needsTarget: true,
  },
};

export function makeFallbackCard(depth: 'common' | 'rare' | 'hidden'): Card {
  return {
    ...FALLBACK_CARDS[depth],
    id: `fallback_${depth}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    rarity: depth,
  };
}
