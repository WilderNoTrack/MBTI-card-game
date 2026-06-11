/**
 * 人格对战卡牌游戏 — 完整卡牌数据
 *
 * 结构：
 * - 4个组（IN/IS/EN/ES）各有6张基础卡（组内共享）
 * - 16个MBTI类型各有2张专属卡
 * - 总计：24张基础卡 + 32张专属卡 = 56张卡牌
 *
 * 每个MBTI玩家的初始卡组 = 该组的6张基础卡 + 自己MBTI的2张专属卡 = 8张
 */

export type CardGroup = 'IN' | 'IS' | 'EN' | 'ES';
export type CardType = 'info' | 'attack' | 'defense' | 'resonance' | 'utility' | 'special';
export type CardRarity = 'base' | 'signature' | 'common' | 'rare' | 'hidden';

export type Card = {
  id: string;
  name: string;
  description: string;
  effect: string;
  effect_code: string;      // 程序化效果ID，对应 cardEffects.ts 中的处理函数
  cost: number;             // 代价槽变化
  exposure: number;         // 公开度变化
  rarity: CardRarity;
  type: CardType;
  group?: CardGroup;        // 仅基础卡和专属卡有
  mbti?: string;            // 仅专属卡有
  needsTarget?: boolean;    // 是否需要选择目标玩家
};

export type MBTIType =
  | 'INTJ' | 'INTP' | 'INFJ' | 'INFP'
  | 'ISTJ' | 'ISTP' | 'ISFJ' | 'ISFP'
  | 'ENTJ' | 'ENTP' | 'ENFJ' | 'ENFP'
  | 'ESTJ' | 'ESTP' | 'ESFJ' | 'ESFP';

export const MBTI_TO_GROUP: Record<MBTIType, CardGroup> = {
  INTJ: 'IN', INTP: 'IN', INFJ: 'IN', INFP: 'IN',
  ISTJ: 'IS', ISTP: 'IS', ISFJ: 'IS', ISFP: 'IS',
  ENTJ: 'EN', ENTP: 'EN', ENFJ: 'EN', ENFP: 'EN',
  ESTJ: 'ES', ESTP: 'ES', ESFJ: 'ES', ESFP: 'ES',
};

export const GROUP_INFO: Record<CardGroup, {
  name: string;
  description: string;
  winCondition: string;
}> = {
  IN: {
    name: '隐者',
    description: '低公开度，信息控制和长线预判',
    winCondition: '获取场上所有人至少1张隐藏信息',
  },
  IS: {
    name: '守卫',
    description: '低公开度，防守积累，精准等待',
    winCondition: '游戏结束时是HP最高的存活玩家',
  },
  EN: {
    name: '影响者',
    description: '高公开度，共鸣操控和广域影响',
    winCondition: '游戏结束时拥有最多共鸣链接',
  },
  ES: {
    name: '行动者',
    description: '高公开度，直接打击，即时爆发',
    winCondition: '击败任意2名其他玩家',
  },
};

// ============================================================================
// IN组 基础卡（6张，IN组所有类型共享）
// ============================================================================

const IN_BASE_CARDS: Card[] = [
  {
    id: 'in_base_1',
    name: '暗中观察',
    description: '安静的目光看穿一切',
    effect: '查看任一玩家手牌中的一张',
    effect_code: 'view_hand_card',
    cost: 0, exposure: 0,
    rarity: 'base', type: 'info', group: 'IN',
    needsTarget: true,
  },
  {
    id: 'in_base_2',
    name: '长线预判',
    description: '布下一个看不见的陷阱',
    effect: '标记一名玩家，若其下回合使用攻击类牌则受3点伤害',
    effect_code: 'long_term_trap',
    cost: 1, exposure: 0,
    rarity: 'base', type: 'special', group: 'IN',
    needsTarget: true,
  },
  {
    id: 'in_base_3',
    name: '内心防线',
    description: '退回内在的城堡',
    effect: '抵消下一次对你产生的效果',
    effect_code: 'cancel_next_effect_on_self',
    cost: 1, exposure: 0,
    rarity: 'base', type: 'defense', group: 'IN',
  },
  {
    id: 'in_base_4',
    name: '隐藏档案',
    description: '所有信息都被默默记录',
    effect: '查看任一玩家的弃牌堆',
    effect_code: 'view_discard',
    cost: 0, exposure: 0,
    rarity: 'base', type: 'info', group: 'IN',
    needsTarget: true,
  },
  {
    id: 'in_base_5',
    name: '静默积累',
    description: '不动声色地准备',
    effect: '摸2张牌',
    effect_code: 'draw_2',
    cost: 1, exposure: 0,
    rarity: 'base', type: 'utility', group: 'IN',
  },
  {
    id: 'in_base_6',
    name: '深度洞察',
    description: '直视一个人最深的部分',
    effect: '查看一名玩家的隐藏技能牌',
    effect_code: 'view_hidden_skill',
    cost: 2, exposure: 1,
    rarity: 'base', type: 'info', group: 'IN',
    needsTarget: true,
  },
];

// ============================================================================
// IS组 基础卡（6张，IS组所有类型共享）
// ============================================================================

const IS_BASE_CARDS: Card[] = [
  {
    id: 'is_base_1',
    name: '警惕守备',
    description: '不松懈，不冒进',
    effect: '抵挡对你造成的下一次1点伤害',
    effect_code: 'shield_1',
    cost: 0, exposure: 0,
    rarity: 'base', type: 'defense', group: 'IS',
  },
  {
    id: 'is_base_2',
    name: '稳健回收',
    description: '没什么是真正失去的',
    effect: '从自己弃牌堆取回1张牌',
    effect_code: 'recover_from_discard',
    cost: 1, exposure: 0,
    rarity: 'base', type: 'utility', group: 'IS',
  },
  {
    id: 'is_base_3',
    name: '精确打击',
    description: '不多不少，刚好够用',
    effect: '造成2点固定伤害（不受任何加成减成影响）',
    effect_code: 'fixed_damage_2',
    cost: 1, exposure: 0,
    rarity: 'base', type: 'attack', group: 'IS',
    needsTarget: true,
  },
  {
    id: 'is_base_4',
    name: '资源整理',
    description: '回到自己的节奏',
    effect: '降低自己2点代价',
    effect_code: 'reduce_self_cost_2',
    cost: -2, exposure: 0,
    rarity: 'base', type: 'utility', group: 'IS',
  },
  {
    id: 'is_base_5',
    name: '静默观察',
    description: '在沉默中捕获细节',
    effect: '查看一名玩家手牌一张',
    effect_code: 'view_hand_card',
    cost: 0, exposure: 0,
    rarity: 'base', type: 'info', group: 'IS',
    needsTarget: true,
  },
  {
    id: 'is_base_6',
    name: '持久战备',
    description: '为长期对峙做准备',
    effect: '接下来2回合每回合开始时回复1生命',
    effect_code: 'heal_over_time_2',
    cost: 1, exposure: 0,
    rarity: 'base', type: 'defense', group: 'IS',
  },
];

// ============================================================================
// EN组 基础卡（6张，EN组所有类型共享）
// ============================================================================

const EN_BASE_CARDS: Card[] = [
  {
    id: 'en_base_1',
    name: '主动连接',
    description: '伸出一只手',
    effect: '与目标玩家建立共鸣链接，双方共鸣值各+1',
    effect_code: 'build_resonance',
    cost: 0, exposure: 2,
    rarity: 'base', type: 'resonance', group: 'EN',
    needsTarget: true,
  },
  {
    id: 'en_base_2',
    name: '情绪感染',
    description: '我的感觉是你的武器',
    effect: '共鸣值每有1点造1点伤害',
    effect_code: 'resonance_damage',
    cost: 1, exposure: 2,
    rarity: 'base', type: 'attack', group: 'EN',
    needsTarget: true,
  },
  {
    id: 'en_base_3',
    name: '影响扩散',
    description: '复制别人的火焰',
    effect: '复制目标玩家上一张牌的效果',
    effect_code: 'copy_last_card',
    cost: 2, exposure: 2,
    rarity: 'base', type: 'special', group: 'EN',
    needsTarget: true,
  },
  {
    id: 'en_base_4',
    name: '号召力',
    description: '让所有人都看向你',
    effect: '与所有玩家共鸣值各+1',
    effect_code: 'mass_resonance',
    cost: 1, exposure: 3,
    rarity: 'base', type: 'resonance', group: 'EN',
  },
  {
    id: 'en_base_5',
    name: '共情之力',
    description: '连接得越深，力量越大',
    effect: '共鸣值≥3时本回合所有牌效果+2',
    effect_code: 'resonance_boost',
    cost: 2, exposure: 3,
    rarity: 'base', type: 'special', group: 'EN',
  },
  {
    id: 'en_base_6',
    name: '公开演说',
    description: '让一切被看见',
    effect: '全场每位玩家公开度+1',
    effect_code: 'mass_exposure',
    cost: 1, exposure: 2,
    rarity: 'base', type: 'utility', group: 'EN',
  },
];

// ============================================================================
// ES组 基础卡（6张，ES组所有类型共享）
// ============================================================================

const ES_BASE_CARDS: Card[] = [
  {
    id: 'es_base_1',
    name: '直接冲击',
    description: '废话少说',
    effect: '造成2点伤害',
    effect_code: 'damage_2',
    cost: 1, exposure: 1,
    rarity: 'base', type: 'attack', group: 'ES',
    needsTarget: true,
  },
  {
    id: 'es_base_2',
    name: '高速行动',
    description: '快人一步',
    effect: '本回合额外出1张牌',
    effect_code: 'extra_action',
    cost: 1, exposure: 1,
    rarity: 'base', type: 'utility', group: 'ES',
  },
  {
    id: 'es_base_3',
    name: '强力出击',
    description: '一击不留情',
    effect: '造成3点伤害，下回合少摸1张',
    effect_code: 'damage_3_drawback',
    cost: 2, exposure: 1,
    rarity: 'base', type: 'attack', group: 'ES',
    needsTarget: true,
  },
  {
    id: 'es_base_4',
    name: '现场反应',
    description: '抓住每一个破绽',
    effect: '在目标出牌后追加1点伤害',
    effect_code: 'reactive_damage',
    cost: 1, exposure: 1,
    rarity: 'base', type: 'attack', group: 'ES',
    needsTarget: true,
  },
  {
    id: 'es_base_5',
    name: '全力以赴',
    description: '不留余地',
    effect: '造成4点伤害',
    effect_code: 'damage_4',
    cost: 3, exposure: 2,
    rarity: 'base', type: 'attack', group: 'ES',
    needsTarget: true,
  },
  {
    id: 'es_base_6',
    name: '直觉攻击',
    description: '凭感觉，就这么干了',
    effect: '50%概率造5伤，50%概率自己受2伤',
    effect_code: 'gamble_damage',
    cost: 1, exposure: 2,
    rarity: 'base', type: 'attack', group: 'ES',
    needsTarget: true,
  },
];

// ============================================================================
// 16型专属卡（每型2张）
// ============================================================================

const SIGNATURE_CARDS: Card[] = [
  // ===== IN组 =====
  // INTJ｜建筑师
  {
    id: 'intj_1', name: '战略蓝图',
    description: '"一切都在我的计划之内。"',
    effect: '宣布一个胜利附加条件，若达成则额外存活一回合',
    effect_code: 'declare_victory_condition',
    cost: 2, exposure: 0,
    rarity: 'signature', type: 'special', group: 'IN', mbti: 'INTJ',
  },
  {
    id: 'intj_2', name: '终局推演',
    description: '"你下一步要走哪一格，我早就知道。"',
    effect: '将一名玩家的下一张牌效果替换为指定的基础效果',
    effect_code: 'override_next_card',
    cost: 3, exposure: 1,
    rarity: 'signature', type: 'special', group: 'IN', mbti: 'INTJ',
    needsTarget: true,
  },

  // INTP｜逻辑学家
  {
    id: 'intp_1', name: '理论推导',
    description: '"等等，让我先想清楚这件事。"',
    effect: '摸3张牌，但本回合只能出1张牌',
    effect_code: 'draw_3_limit_1',
    cost: 1, exposure: 0,
    rarity: 'signature', type: 'utility', group: 'IN', mbti: 'INTP',
  },
  {
    id: 'intp_2', name: '矛盾检测',
    description: '"这个逻辑不成立。"',
    effect: '若目标本回合出的牌与上回合效果矛盾，该牌无效',
    effect_code: 'cancel_contradictory',
    cost: 2, exposure: 1,
    rarity: 'signature', type: 'defense', group: 'IN', mbti: 'INTP',
    needsTarget: true,
  },

  // INFJ｜提倡者
  {
    id: 'infj_1', name: '预见',
    description: '"我早就知道你会这么做。"',
    effect: '宣布一个效果，若目标下回合触发该效果则额外受3伤',
    effect_code: 'foresight',
    cost: 1, exposure: 2,
    rarity: 'signature', type: 'special', group: 'IN', mbti: 'INFJ',
    needsTarget: true,
  },
  {
    id: 'infj_2', name: '沉默见证',
    description: '"不用说话，我都看见。"',
    effect: '本回合不出牌，获得目标本回合所有行动的完整信息',
    effect_code: 'silent_witness',
    cost: 0, exposure: 0,
    rarity: 'signature', type: 'info', group: 'IN', mbti: 'INFJ',
    needsTarget: true,
  },

  // INFP｜调停者
  {
    id: 'infp_1', name: '内心独白',
    description: '"有些话我一直没告诉过任何人。"',
    effect: '公开一段真实经历（口述），回复3点生命',
    effect_code: 'inner_monologue_heal',
    cost: 1, exposure: 3,
    rarity: 'signature', type: 'utility', group: 'IN', mbti: 'INFP',
  },
  {
    id: 'infp_2', name: '创伤转化',
    description: '"我把痛变成力气。"',
    effect: '当前代价槽数值的一半（向上取整）转化为伤害',
    effect_code: 'cost_to_damage',
    cost: 0, exposure: 2,
    rarity: 'signature', type: 'attack', group: 'IN', mbti: 'INFP',
    needsTarget: true,
  },

  // ===== IS组 =====
  // ISTJ｜检察官
  {
    id: 'istj_1', name: '规则审查',
    description: '"规则就是规则。"',
    effect: '若目标违反场上任意规则，该牌无效且其代价+2',
    effect_code: 'rule_audit',
    cost: 1, exposure: 0,
    rarity: 'signature', type: 'defense', group: 'IS', mbti: 'ISTJ',
    needsTarget: true,
  },
  {
    id: 'istj_2', name: '记录在案',
    description: '"我记得你所有出过的牌。"',
    effect: '记录目标使用过的所有牌，再次使用时其受2伤',
    effect_code: 'record_keeper',
    cost: 1, exposure: 0,
    rarity: 'signature', type: 'special', group: 'IS', mbti: 'ISTJ',
    needsTarget: true,
  },

  // ISTP｜鉴赏家
  {
    id: 'istp_1', name: '精准打击',
    description: '"不需要说话，看着。"',
    effect: '无视目标所有防御效果，造成3点伤害',
    effect_code: 'pierce_damage_3',
    cost: 2, exposure: 0,
    rarity: 'signature', type: 'attack', group: 'IS', mbti: 'ISTP',
    needsTarget: true,
  },
  {
    id: 'istp_2', name: '静观其变',
    description: '"再等等。"',
    effect: '跳过本回合，下回合所有牌效果+2',
    effect_code: 'skip_for_boost',
    cost: 0, exposure: 0,
    rarity: 'signature', type: 'utility', group: 'IS', mbti: 'ISTP',
  },

  // ISFJ｜守卫者
  {
    id: 'isfj_1', name: '默默守护',
    description: '"没关系，我在。"',
    effect: '抵挡对你造成的接下来2次各1点伤害',
    effect_code: 'shield_2x1',
    cost: 0, exposure: 0,
    rarity: 'signature', type: 'defense', group: 'IS', mbti: 'ISFJ',
  },
  {
    id: 'isfj_2', name: '记忆保存',
    description: '"我把这些都记得很清楚。"',
    effect: '从场上任意玩家的弃牌堆取回1张牌',
    effect_code: 'retrieve_any_discard',
    cost: 1, exposure: 1,
    rarity: 'signature', type: 'utility', group: 'IS', mbti: 'ISFJ',
    needsTarget: true,
  },

  // ISFP｜探险家
  {
    id: 'isfp_1', name: '当下共鸣',
    description: '"此刻就是全部。"',
    effect: '本回合公开度每增加1点回复1点生命',
    effect_code: 'exposure_heal',
    cost: 0, exposure: 2,
    rarity: 'signature', type: 'utility', group: 'IS', mbti: 'ISFP',
  },
  {
    id: 'isfp_2', name: '感性防护',
    description: '"被理解就是被保护。"',
    effect: '若共鸣值≥2，本回合免疫所有伤害',
    effect_code: 'resonance_immunity',
    cost: 1, exposure: 1,
    rarity: 'signature', type: 'defense', group: 'IS', mbti: 'ISFP',
  },

  // ===== EN组 =====
  // ENTJ｜指挥官
  {
    id: 'entj_1', name: '战略指挥',
    description: '"我说打，就打。"',
    effect: '强制目标玩家本回合必须出牌，不能跳过',
    effect_code: 'force_play',
    cost: 2, exposure: 1,
    rarity: 'signature', type: 'special', group: 'EN', mbti: 'ENTJ',
    needsTarget: true,
  },
  {
    id: 'entj_2', name: '意志碾压',
    description: '"你已经走投无路了。"',
    effect: '若目标代价槽≥5，额外造成3点伤害',
    effect_code: 'pressure_damage',
    cost: 2, exposure: 0,
    rarity: 'signature', type: 'attack', group: 'EN', mbti: 'ENTJ',
    needsTarget: true,
  },

  // ENTP｜辩手
  {
    id: 'entp_1', name: '即兴反制',
    description: '"所以你的逻辑是…我没听错吧？"',
    effect: '在对手出牌后立即打断，将该牌效果转移到对手自身',
    effect_code: 'redirect_to_caster',
    cost: 2, exposure: 2,
    rarity: 'signature', type: 'defense', group: 'EN', mbti: 'ENTP',
    needsTarget: true,
  },
  {
    id: 'entp_2', name: '抬杠',
    description: '"你不会真的以为这能成功吧？"',
    effect: '完整反弹对手上一张牌，效果作用在对手身上',
    effect_code: 'reflect_last_card',
    cost: 3, exposure: 2,
    rarity: 'signature', type: 'defense', group: 'EN', mbti: 'ENTP',
    needsTarget: true,
  },

  // ENFJ｜主人公
  {
    id: 'enfj_1', name: '感召',
    description: '"跟我走，我带你去更好的地方。"',
    effect: '强制与目标玩家建立共鸣链接',
    effect_code: 'force_resonance',
    cost: 1, exposure: 2,
    rarity: 'signature', type: 'resonance', group: 'EN', mbti: 'ENFJ',
    needsTarget: true,
  },
  {
    id: 'enfj_2', name: '集体意志',
    description: '"我们一起。"',
    effect: '共鸣值每有1点，本回合所有牌代价-1',
    effect_code: 'collective_will',
    cost: 1, exposure: 2,
    rarity: 'signature', type: 'utility', group: 'EN', mbti: 'ENFJ',
  },

  // ENFP｜竞选者
  {
    id: 'enfp_1', name: '情绪爆发',
    description: '"等一下我有个想法！！"',
    effect: '当前公开度的一半（向上取整）转化为伤害',
    effect_code: 'exposure_to_damage',
    cost: 2, exposure: 3,
    rarity: 'signature', type: 'attack', group: 'EN', mbti: 'ENFP',
    needsTarget: true,
  },
  {
    id: 'enfp_2', name: '即兴共鸣',
    description: '"我突然觉得我们好像！"',
    effect: '随机获得1-3共鸣值',
    effect_code: 'random_resonance',
    cost: 0, exposure: 2,
    rarity: 'signature', type: 'resonance', group: 'EN', mbti: 'ENFP',
  },

  // ===== ES组 =====
  // ESTJ｜总经理
  {
    id: 'estj_1', name: '颁布条令',
    description: '"按规矩来。"',
    effect: '设定一条本局规则（违反者代价+2）',
    effect_code: 'declare_rule',
    cost: 2, exposure: 1,
    rarity: 'signature', type: 'special', group: 'ES', mbti: 'ESTJ',
  },
  {
    id: 'estj_2', name: '秩序执行',
    description: '"违规者必须付出代价。"',
    effect: '每有一条规则被违反时，自动对违反者造成2伤',
    effect_code: 'rule_enforcement',
    cost: 1, exposure: 0,
    rarity: 'signature', type: 'special', group: 'ES', mbti: 'ESTJ',
  },

  // ESTP｜企业家
  {
    id: 'estp_1', name: '豪赌',
    description: '"稳？稳有什么意思。"',
    effect: '掷硬币：正面造6伤，反面自己受3伤',
    effect_code: 'coin_flip_damage',
    cost: 2, exposure: 2,
    rarity: 'signature', type: 'attack', group: 'ES', mbti: 'ESTP',
    needsTarget: true,
  },
  {
    id: 'estp_2', name: '危机本能',
    description: '"越危险，越清醒。"',
    effect: '代价槽≥7时使用，造成4伤且本次不增加代价',
    effect_code: 'crisis_instinct',
    cost: 0, exposure: 1,
    rarity: 'signature', type: 'attack', group: 'ES', mbti: 'ESTP',
    needsTarget: true,
  },

  // ESFJ｜执政官
  {
    id: 'esfj_1', name: '社交网络',
    description: '"大家都好，我才好。"',
    effect: '建立共鸣后，双方各回复2点生命',
    effect_code: 'social_heal',
    cost: 0, exposure: 2,
    rarity: 'signature', type: 'resonance', group: 'ES', mbti: 'ESFJ',
    needsTarget: true,
  },
  {
    id: 'esfj_2', name: '集体利益',
    description: '"我为大家分担一点。"',
    effect: '自己-1生命，目标代价-2，双方共鸣值+2',
    effect_code: 'collective_benefit',
    cost: 0, exposure: 2,
    rarity: 'signature', type: 'utility', group: 'ES', mbti: 'ESFJ',
    needsTarget: true,
  },

  // ESFP｜表演者
  {
    id: 'esfp_1', name: '全场焦点',
    description: '"看我，再多看我一眼。"',
    effect: '公开度提升至10，本回合所有牌效果翻倍（每局限1次）',
    effect_code: 'spotlight',
    cost: 5, exposure: 5,
    rarity: 'signature', type: 'special', group: 'ES', mbti: 'ESFP',
  },
  {
    id: 'esfp_2', name: '即兴表演',
    description: '"我也不知道接下来会发生什么。"',
    effect: '从任意类型牌库随机抽1张牌立即使用',
    effect_code: 'random_card',
    cost: 1, exposure: 2,
    rarity: 'signature', type: 'special', group: 'ES', mbti: 'ESFP',
  },
];

// ============================================================================
// 导出与组装函数
// ============================================================================

export const ALL_BASE_CARDS = {
  IN: IN_BASE_CARDS,
  IS: IS_BASE_CARDS,
  EN: EN_BASE_CARDS,
  ES: ES_BASE_CARDS,
};

export const ALL_SIGNATURE_CARDS = SIGNATURE_CARDS;

/**
 * 根据 MBTI 类型获取该玩家的初始 8 张卡组
 */
export function getInitialDeck(mbti: MBTIType): Card[] {
  const group = MBTI_TO_GROUP[mbti];
  const baseCards = ALL_BASE_CARDS[group];
  const signatureCards = SIGNATURE_CARDS.filter(c => c.mbti === mbti);
  return [...baseCards, ...signatureCards].map(c => ({ ...c })); // 深拷贝
}

/**
 * 获取一张卡的完整数据（用于显示）
 */
export function getCardById(cardId: string): Card | undefined {
  const allCards = [
    ...IN_BASE_CARDS,
    ...IS_BASE_CARDS,
    ...EN_BASE_CARDS,
    ...ES_BASE_CARDS,
    ...SIGNATURE_CARDS,
  ];
  return allCards.find(c => c.id === cardId);
}

/**
 * 全部16型MBTI的描述信息
 */
export const MBTI_DESCRIPTIONS: Record<MBTIType, { name: string; tagline: string }> = {
  INTJ: { name: '建筑师', tagline: '一切都在我的计划之内。' },
  INTP: { name: '逻辑学家', tagline: '等等，让我先想清楚这件事。' },
  INFJ: { name: '提倡者', tagline: '我早就知道你会这么做。' },
  INFP: { name: '调停者', tagline: '我不是软弱，我只是选择温柔。' },
  ISTJ: { name: '检察官', tagline: '规则就是规则。' },
  ISTP: { name: '鉴赏家', tagline: '不需要说话，看着。' },
  ISFJ: { name: '守卫者', tagline: '没关系，我在。' },
  ISFP: { name: '探险家', tagline: '此刻就是全部。' },
  ENTJ: { name: '指挥官', tagline: '我说打，就打。' },
  ENTP: { name: '辩手', tagline: '所以你的逻辑是…我没听错吧？' },
  ENFJ: { name: '主人公', tagline: '跟我走，我带你去更好的地方。' },
  ENFP: { name: '竞选者', tagline: '等一下我有个想法！！' },
  ESTJ: { name: '总经理', tagline: '按规矩来。' },
  ESTP: { name: '企业家', tagline: '稳？稳有什么意思。' },
  ESFJ: { name: '执政官', tagline: '大家都好，我才好。' },
  ESFP: { name: '表演者', tagline: '看我，再多看我一眼。' },
};
