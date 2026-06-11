import { GameRoom, Player, Card, ActiveEffect } from './types';

export type EffectContext = {
  game: GameRoom;
  player: Player;
  card: Card;
  target?: Player;
  damageBonus?: number;
};

export type EffectResult = {
  game: GameRoom;
  log: string;
  revealedCards?: Card[]; // cards revealed to the caster — shown in UI
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function updatePlayer(game: GameRoom, id: string, update: Partial<Player>): GameRoom {
  return { ...game, players: game.players.map(p => p.id === id ? { ...p, ...update } : p) };
}

export function applyDamage(
  game: GameRoom, targetId: string, amount: number, pierce = false
): { game: GameRoom; logs: string[] } {
  const target = game.players.find(p => p.id === targetId);
  if (!target || !target.is_alive) return { game, logs: [] };

  const logs: string[] = [];
  let dmg = amount;

  if (!pierce) {
    // Cancel-next-effect (内心防线)
    const cancelIdx = target.effects.findIndex(e => e.type === 'cancel_next_effect');
    if (cancelIdx !== -1) {
      const newFx = target.effects.filter((_, i) => i !== cancelIdx);
      game = updatePlayer(game, targetId, { effects: newFx });
      logs.push(`${target.nickname} 内心防线触发，抵消了这次攻击`);
      return { game, logs };
    }
    // Immunity
    if (target.effects.some(e => e.type === 'immune_this_round')) {
      logs.push(`${target.nickname} 免疫了伤害`);
      return { game, logs };
    }
    // Shield (consume one layer)
    const shieldIdx = target.effects.findIndex(e => e.type === 'shield');
    if (shieldIdx !== -1) {
      const shield = target.effects[shieldIdx];
      const absorbed = Math.min(dmg, shield.value ?? 0);
      dmg -= absorbed;
      game = updatePlayer(game, targetId, { effects: target.effects.filter((_, i) => i !== shieldIdx) });
      logs.push(`${target.nickname} 护盾吸收了 ${absorbed} 点伤害`);
    }
  }

  if (dmg <= 0) return { game, logs };

  const t2 = game.players.find(p => p.id === targetId)!;
  const newHp = Math.max(0, t2.hp - dmg);
  const alive  = newHp > 0 && t2.cost < 10;
  game = updatePlayer(game, targetId, { hp: newHp, is_alive: alive });
  logs.push(`${t2.nickname} 受到 ${dmg} 伤害 (HP: ${t2.hp}→${newHp})`);

  // Resonance splash 50%
  if (!pierce) {
    for (const pid of t2.resonance_with) {
      const partner = game.players.find(p => p.id === pid);
      if (partner?.is_alive) {
        const splash = Math.floor(dmg * 0.5);
        if (splash > 0) {
          const pHp = Math.max(0, partner.hp - splash);
          game = updatePlayer(game, pid, { hp: pHp, is_alive: pHp > 0 });
          logs.push(`共鸣反噬：${partner.nickname} 受到 ${splash} 伤 (→${pHp})`);
        }
      }
    }
  }
  return { game, logs };
}

function buildResonance(game: GameRoom, aId: string, bId: string): { game: GameRoom; log: string } {
  const a = game.players.find(p => p.id === aId)!;
  const b = game.players.find(p => p.id === bId)!;
  const aRW = a.resonance_with.includes(bId) ? a.resonance_with : [...a.resonance_with, bId];
  const bRW = b.resonance_with.includes(aId) ? b.resonance_with : [...b.resonance_with, aId];
  game = updatePlayer(game, aId, { resonance_with: aRW, resonance: a.resonance + 1 });
  game = updatePlayer(game, bId, { resonance_with: bRW, resonance: b.resonance + 1 });
  return { game, log: `${a.nickname} 与 ${b.nickname} 建立共鸣链接` };
}

// ─── Effect Handlers ──────────────────────────────────────────────────────────

export const cardEffects: Record<string, (ctx: EffectContext) => EffectResult> = {

  // ── Draw ──────────────────────────────────────────────────────────────────
  draw_2: ({ game, player }) => {
    const cards = player.deck.slice(0, 2);
    const g = updatePlayer(game, player.id, { hand: [...player.hand, ...cards].slice(0,7), deck: player.deck.slice(2) });
    return { game: g, log: `${player.nickname} 摸了 ${cards.length} 张牌` };
  },

  draw_3: ({ game, player }) => {
    const cards = player.deck.slice(0, 3);
    const g = updatePlayer(game, player.id, { hand: [...player.hand, ...cards].slice(0,7), deck: player.deck.slice(3) });
    return { game: g, log: `${player.nickname} 摸了 ${cards.length} 张牌` };
  },

  draw_3_limit_1: ({ game, player }) => {
    const cards = player.deck.slice(0, 3);
    const g = updatePlayer(game, player.id, {
      hand: [...player.hand, ...cards].slice(0,7),
      deck: player.deck.slice(3),
      // rounds_remaining: 0 → removed at end of THIS round
      effects: [...player.effects, { type: 'limit_plays_1', rounds_remaining: 0 }],
    });
    return { game: g, log: `${player.nickname} 摸了3张牌，但本回合只能出1张` };
  },

  draw_1_heal_1: ({ game, player }) => {
    const cards = player.deck.slice(0, 1);
    const g = updatePlayer(game, player.id, {
      hand: [...player.hand, ...cards].slice(0,7),
      deck: player.deck.slice(1),
      hp: Math.min(10, player.hp + 1),
    });
    return { game: g, log: `${player.nickname} 摸1张牌并回复1点生命` };
  },

  // ── Heal ──────────────────────────────────────────────────────────────────
  heal_2: ({ game, player }) => {
    const hp = Math.min(10, player.hp + 2);
    return { game: updatePlayer(game, player.id, { hp }), log: `${player.nickname} 回复2点生命 (→${hp})` };
  },

  heal_3: ({ game, player }) => {
    const hp = Math.min(10, player.hp + 3);
    return { game: updatePlayer(game, player.id, { hp }), log: `${player.nickname} 回复3点生命 (→${hp})` };
  },

  inner_monologue_heal: ({ game, player }) => {
    const hp = Math.min(10, player.hp + 3);
    const exposure = Math.min(10, player.exposure + 3);
    return { game: updatePlayer(game, player.id, { hp, exposure }), log: `${player.nickname} 公开内心独白，回复3点生命` };
  },

  heal_over_time_2: ({ game, player }) => {
    const g = updatePlayer(game, player.id, {
      effects: [...player.effects, { type: 'heal_on_round_start', value: 1, rounds_remaining: 2 }],
    });
    return { game: g, log: `${player.nickname} 接下来2回合每回合开始回复1点生命` };
  },

  // ── Damage ────────────────────────────────────────────────────────────────
  damage_2: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    const { game: g, logs } = applyDamage(game, target.id, 2 + damageBonus);
    return { game: g, log: logs.join('；') };
  },

  damage_3: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    const { game: g, logs } = applyDamage(game, target.id, 3 + damageBonus);
    return { game: g, log: logs.join('；') };
  },

  damage_4: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    const { game: g, logs } = applyDamage(game, target.id, 4 + damageBonus);
    return { game: g, log: logs.join('；') };
  },

  damage_5: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    const { game: g, logs } = applyDamage(game, target.id, 5 + damageBonus);
    return { game: g, log: logs.join('；') };
  },

  fixed_damage_2: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    const hp = Math.max(0, target.hp - 2);
    return { game: updatePlayer(game, target.id, { hp, is_alive: hp > 0 }), log: `${target.nickname} 受到2点固定伤害 (→${hp})` };
  },

  damage_3_drawback: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    const { game: g, logs } = applyDamage(game, target.id, 3 + damageBonus);
    const g2 = updatePlayer(g, player.id, { effects: [...player.effects, { type: 'draw_less_1', rounds_remaining: 1 }] });
    return { game: g2, log: logs.join('；') + `；${player.nickname} 下回合少摸1张` };
  },

  gamble_damage: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    if (Math.random() > 0.5) {
      const { game: g, logs } = applyDamage(game, target.id, 5 + damageBonus);
      return { game: g, log: `【直觉攻击·正面！】${logs.join('；')}` };
    }
    const hp = Math.max(0, player.hp - 2);
    return { game: updatePlayer(game, player.id, { hp, is_alive: hp > 0 }), log: `【直觉攻击·反面】${player.nickname} 自受2伤 (→${hp})` };
  },

  coin_flip_damage: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    if (Math.random() > 0.5) {
      const { game: g, logs } = applyDamage(game, target.id, 6 + damageBonus);
      return { game: g, log: `【豪赌·正面！】${logs.join('；')}` };
    }
    const hp = Math.max(0, player.hp - 3);
    return { game: updatePlayer(game, player.id, { hp, is_alive: hp > 0 }), log: `【豪赌·反面！】${player.nickname} 自受3伤 (→${hp})` };
  },

  pierce_damage_3: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    const { game: g, logs } = applyDamage(game, target.id, 3 + damageBonus, true);
    return { game: g, log: `【穿透】${logs.join('；')}` };
  },

  crisis_instinct: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    if (player.cost < 7) return { game, log: '代价槽不足7，危机本能无法发动' };
    const { game: g, logs } = applyDamage(game, target.id, 4 + damageBonus);
    return { game: g, log: `【危机本能·不增代价】${logs.join('；')}` };
  },

  pressure_damage: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    if (target.cost < 5) return { game, log: `${target.nickname} 代价不足5，意志碾压无效` };
    const { game: g, logs } = applyDamage(game, target.id, 3 + damageBonus);
    return { game: g, log: `【意志碾压】${logs.join('；')}` };
  },

  exposure_to_damage: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    const dmg = Math.ceil(player.exposure / 2) + damageBonus;
    const { game: g, logs } = applyDamage(game, target.id, dmg);
    return { game: g, log: `【情绪爆发】公开度${player.exposure}→${dmg}伤；${logs.join('；')}` };
  },

  cost_to_damage: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    const dmg = Math.ceil(player.cost / 2) + damageBonus;
    const { game: g, logs } = applyDamage(game, target.id, dmg);
    return { game: g, log: `【创伤转化】代价${player.cost}→${dmg}伤；${logs.join('；')}` };
  },

  resonance_damage: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    const dmg = player.resonance + damageBonus;
    if (dmg === 0) return { game, log: '共鸣值为0，无法发动' };
    const { game: g, logs } = applyDamage(game, target.id, dmg);
    return { game: g, log: `【情绪感染】共鸣${player.resonance}→${dmg}伤；${logs.join('；')}` };
  },

  reactive_damage: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    const g = updatePlayer(game, player.id, {
      effects: [...player.effects, { type: 'reactive_damage_1', target_player_id: target.id }],
    });
    return { game: g, log: `${player.nickname} 对 ${target.nickname} 设置了追加1伤效果` };
  },

  // ── Defense ───────────────────────────────────────────────────────────────
  shield_1: ({ game, player }) => {
    const g = updatePlayer(game, player.id, { effects: [...player.effects, { type: 'shield', value: 1 }] });
    return { game: g, log: `${player.nickname} 获得1点护盾` };
  },

  shield_2x1: ({ game, player }) => {
    const g = updatePlayer(game, player.id, {
      effects: [...player.effects, { type: 'shield', value: 1 }, { type: 'shield', value: 1 }],
    });
    return { game: g, log: `${player.nickname} 获得2次1点护盾` };
  },

  shield_3: ({ game, player }) => {
    const g = updatePlayer(game, player.id, { effects: [...player.effects, { type: 'shield', value: 3 }] });
    return { game: g, log: `${player.nickname} 获得3点护盾` };
  },

  cancel_next_effect_on_self: ({ game, player }) => {
    const g = updatePlayer(game, player.id, { effects: [...player.effects, { type: 'cancel_next_effect' }] });
    return { game: g, log: `${player.nickname} 激活内心防线，抵消下一次对自己的攻击` };
  },

  immunity_round: ({ game, player }) => {
    const g = updatePlayer(game, player.id, { effects: [...player.effects, { type: 'immune_this_round' }] });
    return { game: g, log: `${player.nickname} 本回合免疫所有伤害` };
  },

  resonance_immunity: ({ game, player }) => {
    if (player.resonance < 2) return { game, log: `${player.nickname} 共鸣值不足2，感性防护无效` };
    const g = updatePlayer(game, player.id, { effects: [...player.effects, { type: 'immune_this_round' }] });
    return { game: g, log: `${player.nickname} 共鸣值≥2，本回合免疫所有伤害` };
  },

  // ── Info ──────────────────────────────────────────────────────────────────
  // These reveal card info to ALL players via game log (public information)
  view_hand_card: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    if (target.hand.length === 0) return { game, log: `${target.nickname} 手牌为空` };
    const card = target.hand[Math.floor(Math.random() * target.hand.length)];
    return {
      game,
      log: `${player.nickname} 暗中观察：发现 ${target.nickname} 持有【${card.name}】—— ${card.effect}`,
      revealedCards: [card],
    };
  },

  view_all_hand: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    if (target.hand.length === 0) return { game, log: `${target.nickname} 手牌为空` };
    const names = target.hand.map(c => `【${c.name}】`).join('、');
    return {
      game,
      log: `${player.nickname} 看透 ${target.nickname} 全部手牌：${names}`,
      revealedCards: target.hand,
    };
  },

  view_discard: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    if (target.discard.length === 0) return { game, log: `${target.nickname} 弃牌堆为空` };
    const names = target.discard.map(c => `【${c.name}】`).join('、');
    return {
      game,
      log: `${player.nickname} 翻阅 ${target.nickname} 的弃牌：${names}`,
      revealedCards: target.discard,
    };
  },

  view_hidden_skill: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    if (!target.hidden_skill) return { game, log: `${target.nickname} 还没有隐藏技能牌` };
    const hs = target.hidden_skill;
    return {
      game,
      log: `${player.nickname} 深度洞察：发现 ${target.nickname} 的隐藏技能【${hs.name}】—— ${hs.effect}`,
      revealedCards: [hs],
    };
  },

  // ── Resonance ─────────────────────────────────────────────────────────────
  build_resonance: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    const { game: g, log } = buildResonance(game, player.id, target.id);
    return { game: g, log };
  },

  force_resonance: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    const { game: g, log } = buildResonance(game, player.id, target.id);
    return { game: g, log: `【强制感召】${log}` };
  },

  mass_resonance: ({ game, player }) => {
    let g = game;
    const others = game.players.filter(p => p.id !== player.id && p.is_alive);
    for (const other of others) { const r = buildResonance(g, player.id, other.id); g = r.game; }
    return { game: g, log: `${player.nickname} 号召力：与所有存活玩家建立共鸣` };
  },

  random_resonance: ({ game, player }) => {
    const amount = Math.floor(Math.random() * 3) + 1;
    const g = updatePlayer(game, player.id, { resonance: player.resonance + amount });
    return { game: g, log: `${player.nickname} 即兴共鸣，随机获得 ${amount} 点共鸣值` };
  },

  break_all_resonance: ({ game, player }) => {
    let g = game;
    for (const pid of player.resonance_with) {
      const p = g.players.find(x => x.id === pid);
      if (p) g = updatePlayer(g, pid, { resonance_with: p.resonance_with.filter(id => id !== player.id) });
    }
    g = updatePlayer(g, player.id, { resonance_with: [] });
    return { game: g, log: `${player.nickname} 断开了所有共鸣链接` };
  },

  // ── Utility / Card manipulation ───────────────────────────────────────────
  extra_action: ({ game, player }) => {
    const g = updatePlayer(game, player.id, { effects: [...player.effects, { type: 'extra_play_this_round' }] });
    return { game: g, log: `${player.nickname} 本回合可额外出1张牌` };
  },

  skip_for_boost: ({ game, player }) => {
    const g = updatePlayer(game, player.id, {
      effects: [...player.effects, { type: 'all_effects_plus_2', rounds_remaining: 1 }],
      battle_turn_done: true,
    });
    return { game: g, log: `${player.nickname} 跳过本回合，下回合所有牌效果+2` };
  },

  reduce_self_cost_2: ({ game, player }) => {
    const cost = Math.max(0, player.cost - 2);
    return { game: updatePlayer(game, player.id, { cost }), log: `${player.nickname} 代价降低2点 (${player.cost}→${cost})` };
  },

  recover_from_discard: ({ game, player }) => {
    if (player.discard.length === 0) return { game, log: '弃牌堆为空' };
    const card = player.discard[player.discard.length - 1];
    const g = updatePlayer(game, player.id, {
      hand: [...player.hand, card].slice(0, 7),
      discard: player.discard.slice(0, -1),
    });
    return { game: g, log: `${player.nickname} 从弃牌堆取回「${card.name}」` };
  },

  // ISFJ: retrieve from ANY player's discard (actual take, not copy)
  retrieve_any_discard: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    if (target.discard.length === 0) return { game, log: `${target.nickname} 弃牌堆为空` };
    const card = target.discard[target.discard.length - 1];
    let g = updatePlayer(game, target.id, { discard: target.discard.slice(0, -1) });
    g = updatePlayer(g, player.id, { hand: [...player.hand, card].slice(0, 7) });
    return { game: g, log: `${player.nickname} 记忆保存：从 ${target.nickname} 弃牌堆取走「${card.name}」` };
  },

  force_discard: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    if (target.hand.length === 0) return { game, log: `${target.nickname} 手牌为空` };
    const idx = Math.floor(Math.random() * target.hand.length);
    const card = target.hand[idx];
    const g = updatePlayer(game, target.id, {
      hand: target.hand.filter((_, i) => i !== idx),
      discard: [...target.discard, card],
    });
    return { game: g, log: `${target.nickname} 被强制弃掉「${card.name}」` };
  },

  copy_last_card: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    if (target.discard.length === 0) return { game, log: `${target.nickname} 还未出过牌` };
    const last = target.discard[target.discard.length - 1];
    const copy = { ...last, id: `copy_${last.id}_${Date.now()}` };
    const g = updatePlayer(game, player.id, { hand: [...player.hand, copy].slice(0, 7) });
    return { game: g, log: `${player.nickname} 影响扩散：复制了 ${target.nickname} 的「${last.name}」到手牌` };
  },

  reflect_last_card: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    if (target.discard.length === 0) return { game, log: `${target.nickname} 还未出过牌` };
    const last = target.discard[target.discard.length - 1];
    const fn = cardEffects[last.effect_code];
    if (!fn) return { game, log: `「${last.name}」无法被反弹` };
    const result = fn({ game, player: target, card: last, target });
    return { game: result.game, log: `${player.nickname} 抬杠反弹「${last.name}」！${result.log}` };
  },

  redirect_to_caster: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    if (target.discard.length === 0) return { game, log: `${target.nickname} 还未出过牌` };
    const last = target.discard[target.discard.length - 1];
    const fn = cardEffects[last.effect_code];
    if (!fn) return { game, log: `「${last.name}」效果无法转移` };
    const result = fn({ game, player: target, card: last, target });
    return { game: result.game, log: `【即兴反制】「${last.name}」作用于 ${target.nickname} 自身！${result.log}` };
  },

  mass_exposure: ({ game, player }) => {
    let g = game;
    for (const p of game.players) {
      if (p.is_alive) g = updatePlayer(g, p.id, { exposure: Math.min(10, p.exposure + 1) });
    }
    return { game: g, log: `${player.nickname} 公开演说，全场公开度+1` };
  },

  resonance_boost: ({ game, player }) => {
    if (player.resonance < 3) return { game, log: `${player.nickname} 共鸣值不足3，共情之力无效` };
    const g = updatePlayer(game, player.id, { effects: [...player.effects, { type: 'all_effects_plus_2_this_round' }] });
    return { game: g, log: `${player.nickname} 共情之力激活，本回合所有牌效果+2` };
  },

  exposure_heal: ({ game, player }) => {
    const g = updatePlayer(game, player.id, { effects: [...player.effects, { type: 'exposure_heal_this_round' }] });
    return { game: g, log: `${player.nickname} 当下共鸣激活，本回合公开度每+1则回复1血` };
  },

  social_heal: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    const { game: g, log } = buildResonance(game, player.id, target.id);
    const p2 = g.players.find(p => p.id === player.id)!;
    const t2 = g.players.find(p => p.id === target.id)!;
    let g2 = updatePlayer(g, player.id, { hp: Math.min(10, p2.hp + 2) });
    g2 = updatePlayer(g2, target.id, { hp: Math.min(10, t2.hp + 2) });
    return { game: g2, log: `${log}，双方各回复2点生命` };
  },

  collective_benefit: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    const hp = Math.max(0, player.hp - 1);
    let g = updatePlayer(game, player.id, { hp, is_alive: hp > 0, resonance: player.resonance + 2 });
    g = updatePlayer(g, target.id, { cost: Math.max(0, target.cost - 2), resonance: target.resonance + 2 });
    return { game: g, log: `集体利益：${player.nickname} -1血，${target.nickname} 代价-2，双方共鸣+2` };
  },

  collective_will: ({ game, player }) => {
    const g = updatePlayer(game, player.id, {
      effects: [...player.effects, { type: 'cost_reduction', value: player.resonance }],
    });
    return { game: g, log: `${player.nickname} 集体意志：本回合所有牌代价-${player.resonance}` };
  },

  spotlight: ({ game, player }) => {
    if (player.effects.some(e => e.type === 'spotlight_used'))
      return { game, log: '全场焦点每局只能使用1次' };
    const g = updatePlayer(game, player.id, {
      exposure: 10,
      effects: [...player.effects, { type: 'double_effects_this_round' }, { type: 'spotlight_used' }],
    });
    return { game: g, log: `${player.nickname} 全场焦点！公开度至10，本回合所有牌效果翻倍` };
  },

  random_card: ({ game, player }) => {
    if (player.deck.length === 0) return { game, log: '牌库为空' };
    const idx = Math.floor(Math.random() * player.deck.length);
    const card = player.deck[idx];
    const g = updatePlayer(game, player.id, {
      hand: [...player.hand, card].slice(0, 7),
      deck: player.deck.filter((_, i) => i !== idx),
    });
    return { game: g, log: `${player.nickname} 即兴表演，随机抽到「${card.name}」` };
  },

  swap_resource: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    let g = updatePlayer(game, player.id, { hp: target.hp, is_alive: target.hp > 0 });
    g = updatePlayer(g, target.id, { hp: player.hp, is_alive: player.hp > 0 });
    return { game: g, log: `${player.nickname} 与 ${target.nickname} 交换了生命值 (${player.hp}↔${target.hp})` };
  },

  // ── Signature stubs: now do real things ───────────────────────────────────

  // INTJ: 战略蓝图 — cost-1 + draw 1 + mark for IN win condition boost
  declare_victory_condition: ({ game, player }) => {
    const drawn = player.deck.slice(0, 1);
    const g = updatePlayer(game, player.id, {
      hand: [...player.hand, ...drawn].slice(0, 7),
      deck: player.deck.slice(1),
      effects: [...player.effects, { type: 'cost_reduction', value: 1 }, { type: 'victory_declared' }],
    });
    return { game: g, log: `${player.nickname} 战略蓝图：代价-1，额外摸1张牌，INTJ胜利条件激活` };
  },

  // INTJ: 终局推演 — negate target's next card effect
  override_next_card: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    const g = updatePlayer(game, target.id, {
      effects: [...target.effects, { type: 'override_next_play', source_player_id: player.id }],
    });
    return { game: g, log: `${player.nickname} 终局推演：预设了 ${target.nickname} 的下一张牌，效果将被抵消` };
  },

  // INTP: 矛盾检测 — deal 3 damage + negate target's next card
  cancel_contradictory: ({ game, player, target, damageBonus = 0 }) => {
    if (!target) return { game, log: '目标无效' };
    const { game: g, logs } = applyDamage(game, target.id, 2 + damageBonus);
    const g2 = updatePlayer(g, target.id, {
      effects: [...(g.players.find(p => p.id === target.id)!.effects), { type: 'cancel_next_effect' }],
    });
    return { game: g2, log: `${player.nickname} 矛盾检测：${logs.join('；')}；${target.nickname} 下张牌效果被抵消` };
  },

  // INFJ: 沉默见证 — mark target; caster skips own turn to "watch"
  silent_witness: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    let g = updatePlayer(game, target.id, {
      effects: [...target.effects, { type: 'recorded', source_player_id: player.id }],
    });
    // Caster sacrifices their turn
    g = updatePlayer(g, player.id, { battle_turn_done: true });
    return { game: g, log: `${player.nickname} 沉默见证 ${target.nickname}：放弃本回合，${target.nickname} 下次出牌代价+2` };
  },

  // ISTJ: 规则审查 — if target has > 3 cards steal one, else deal 2 damage
  rule_audit: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    if (target.hand.length > 3) {
      const idx = Math.floor(Math.random() * target.hand.length);
      const stolen = target.hand[idx];
      let g = updatePlayer(game, target.id, { hand: target.hand.filter((_, i) => i !== idx) });
      g = updatePlayer(g, player.id, { hand: [...player.hand, stolen].slice(0, 7) });
      return { game: g, log: `${player.nickname} 规则审查：${target.nickname} 手牌过多，没收「${stolen.name}」` };
    }
    const { game: g, logs } = applyDamage(game, target.id, 2);
    return { game: g, log: `${player.nickname} 规则审查：${logs.join('；')}` };
  },

  // ISTJ: 记录在案 — mark target; if they repeat a card, deal 2 damage
  record_keeper: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    const g = updatePlayer(game, target.id, {
      effects: [...target.effects, { type: 'recorded', source_player_id: player.id }],
    });
    return { game: g, log: `${player.nickname} 记录在案：开始追踪 ${target.nickname} 的出牌记录` };
  },

  // ENTJ: 战略指挥 — force target to play a card this turn
  force_play: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    const g = updatePlayer(game, target.id, {
      effects: [...target.effects, { type: 'must_play', source_player_id: player.id }],
    });
    return { game: g, log: `${player.nickname} 战略指挥：${target.nickname} 本回合必须出牌` };
  },

  // ESTJ: 颁布条令 — all opponents get cost+1 this round
  declare_rule: ({ game, player }) => {
    let g = game;
    let count = 0;
    for (const p of game.players.filter(x => x.id !== player.id && x.is_alive)) {
      g = updatePlayer(g, p.id, { cost: Math.min(10, p.cost + 1) });
      count++;
    }
    return { game: g, log: `${player.nickname} 颁布条令：全场${count}名对手代价+1` };
  },

  // ESTJ: 秩序执行 — all opponents with cost≥5 take 2 damage
  rule_enforcement: ({ game, player }) => {
    let g = game;
    const logs: string[] = [];
    for (const p of game.players.filter(x => x.id !== player.id && x.is_alive && x.cost >= 5)) {
      const res = applyDamage(g, p.id, 2);
      g = res.game; logs.push(...res.logs);
    }
    if (logs.length === 0) return { game, log: `${player.nickname} 秩序执行：无人违规` };
    return { game: g, log: `${player.nickname} 秩序执行：${logs.join('；')}` };
  },

  // Long-term trap (IN base): mark target, trigger on attack
  long_term_trap: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    const g = updatePlayer(game, target.id, {
      effects: [...target.effects, { type: 'trap_attack', value: 3, source_player_id: player.id }],
    });
    return { game: g, log: `${player.nickname} 对 ${target.nickname} 布置了长线陷阱（攻击时受3伤）` };
  },

  // INFJ: 预见
  foresight: ({ game, player, target }) => {
    if (!target) return { game, log: '目标无效' };
    const g = updatePlayer(game, target.id, {
      effects: [...target.effects, { type: 'foresight_trap', value: 3, source_player_id: player.id }],
    });
    return { game: g, log: `${player.nickname} 预见 ${target.nickname} 的行动（触发任意牌则额外受3伤）` };
  },

  // AI hidden skill (custom): powerful combined effect
  custom: ({ game, player, target }) => {
    let g = game;
    const logs: string[] = [];

    // Break all resonance + 2 splash each
    for (const pid of player.resonance_with) {
      const p = g.players.find(x => x.id === pid);
      if (p?.is_alive) { const r = applyDamage(g, pid, 2); g = r.game; logs.push(...r.logs); }
      const fp = g.players.find(x => x.id === pid);
      if (fp) g = updatePlayer(g, pid, { resonance_with: fp.resonance_with.filter(id => id !== player.id) });
    }
    g = updatePlayer(g, player.id, { resonance_with: [], resonance: player.resonance + 2 });

    // Convert cost to AoE damage
    const dmg = Math.max(3, Math.ceil(player.cost / 2));
    const enemies = game.players.filter(p => p.id !== player.id && p.is_alive);
    if (target) {
      const r = applyDamage(g, target.id, dmg); g = r.game; logs.push(...r.logs);
    } else {
      for (const e of enemies) {
        const r = applyDamage(g, e.id, Math.ceil(dmg / Math.max(enemies.length, 1)));
        g = r.game; logs.push(...r.logs);
      }
    }

    // Heal self
    const fp = g.players.find(p => p.id === player.id)!;
    g = updatePlayer(g, player.id, { hp: Math.min(10, fp.hp + 3) });
    logs.push(`${player.nickname} 回复3点生命`);

    return { game: g, log: `✦ ${player.nickname} 发动专属隐藏技能！${logs.join('；')}` };
  },
};
