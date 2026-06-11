import { GameRoom, Player, Card, GamePhase, GameLog, WinResult } from './types';
import { cardEffects, EffectContext, applyDamage } from './cardEffects';
import { getDepthForRound, getRandomQuestion } from './questions';

// ─── Validation ────────────────────────────────────────────────────────────────

export function canPlayCard(game: GameRoom, playerId: string, card: Card, targetId?: string): { ok: boolean; reason?: string } {
  const player = game.players.find(p => p.id === playerId);
  if (!player)            return { ok: false, reason: '玩家不存在' };
  if (!player.is_alive)   return { ok: false, reason: '你已出局' };
  if (game.current_phase !== 'battle') return { ok: false, reason: '当前不是战斗阶段' };
  if (game.current_turn_player_id !== playerId) return { ok: false, reason: '还没到你的回合' };
  if (player.battle_turn_done) return { ok: false, reason: '本回合已结束' };

  const hasExtra  = player.effects.some(e => e.type === 'extra_play_this_round');
  const hasLimit  = player.effects.some(e => e.type === 'limit_plays_1');
  const maxPlays  = hasLimit ? 1 : hasExtra ? 3 : 2;
  if (player.cards_played_this_round >= maxPlays)
    return { ok: false, reason: `本回合最多出${maxPlays}张牌` };

  if (card.rarity === 'hidden' && player.exposure < 7)
    return { ok: false, reason: '公开度不足7，无法使用隐藏技能' };

  if (card.effect_code === 'crisis_instinct' && player.cost < 7)
    return { ok: false, reason: '代价槽不足7，危机本能无法发动' };

  if (card.effect_code === 'spotlight' && player.effects.some(e => e.type === 'spotlight_used'))
    return { ok: false, reason: '全场焦点每局只能使用1次' };

  // Condition checks — prevent wasting card if conditions not met
  if (card.effect_code === 'resonance_damage' && player.resonance === 0)
    return { ok: false, reason: '共鸣值为0，情绪感染无法发动' };
  if (card.effect_code === 'resonance_immunity' && player.resonance < 2)
    return { ok: false, reason: '共鸣值不足2，感性防护无法发动' };
  if (card.effect_code === 'resonance_boost' && player.resonance < 3)
    return { ok: false, reason: '共鸣值不足3，共情之力无法发动' };
  if (card.effect_code === 'recover_from_discard' && player.discard.length === 0)
    return { ok: false, reason: '弃牌堆为空，无牌可取回' };
  if (card.effect_code === 'break_all_resonance' && player.resonance_with.length === 0)
    return { ok: false, reason: '没有共鸣链接可以断开' };
  if (card.effect_code === 'cost_to_damage' && player.cost === 0)
    return { ok: false, reason: '代价为0，创伤转化无法发动' };
  if (card.effect_code === 'exposure_to_damage' && player.exposure === 0)
    return { ok: false, reason: '公开度为0，情绪爆发无法发动' };

  // Target-dependent checks (when target is known)
  if (targetId) {
    const target = game.players.find(p => p.id === targetId);
    if (target) {
      if (['force_discard'].includes(card.effect_code) && target.hand.length === 0)
        return { ok: false, reason: `${target.nickname} 手牌为空，无牌可弃` };
      if (card.effect_code === 'pressure_damage' && target.cost < 5)
        return { ok: false, reason: `${target.nickname} 代价不足5（当前${target.cost}），意志碾压无效` };
      if (['retrieve_any_discard', 'copy_last_card', 'reflect_last_card', 'redirect_to_caster']
          .includes(card.effect_code) && target.discard.length === 0)
        return { ok: false, reason: `${target.nickname} 弃牌堆为空` };
      if (['view_hand_card', 'view_all_hand'].includes(card.effect_code) && target.hand.length === 0)
        return { ok: false, reason: `${target.nickname} 手牌为空` };
      if (card.effect_code === 'view_hidden_skill' && !target.hidden_skill)
        return { ok: false, reason: `${target.nickname} 还没有隐藏技能` };
      if (!target.is_alive)
        return { ok: false, reason: `${target.nickname} 已出局` };
    }
  }

  if (card.effect_code !== 'crisis_instinct') {
    const reduction = player.effects.find(e => e.type === 'cost_reduction')?.value ?? 0;
    if (player.cost + Math.max(0, card.cost - reduction) > 10)
      return { ok: false, reason: '代价槽不足' };
  }

  return { ok: true };
}

// ─── Execute card ──────────────────────────────────────────────────────────────

export function executeCard(game: GameRoom, playerId: string, cardId: string, targetId?: string): GameRoom {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return game;

  let card = player.hand.find(c => c.id === cardId);
  let fromHidden = false;
  if (!card && player.hidden_skill?.id === cardId) { card = player.hidden_skill; fromHidden = true; }
  if (!card) return game;

  const target = targetId ? game.players.find(p => p.id === targetId) : undefined;
  const effectFn = cardEffects[card.effect_code] ?? cardEffects.custom;

  // Apply cost + exposure
  const reduction   = player.effects.find(e => e.type === 'cost_reduction')?.value ?? 0;
  const effectiveCost = card.effect_code === 'crisis_instinct' ? 0 : Math.max(0, card.cost - reduction);

  // Remove cost_reduction after use
  const effectsAfterCost = effectiveCost > 0 && reduction > 0
    ? player.effects.filter(e => e.type !== 'cost_reduction')
    : player.effects;

  // Remove card from hand (but DON'T move to discard yet — so self-discard effects work correctly)
  const newHand   = player.hand.filter(c => c.id !== cardId);
  const newHidden = fromHidden ? null : player.hidden_skill;

  let newGame: GameRoom = {
    ...game,
    players: game.players.map(p => p.id !== playerId ? p : {
      ...p,
      hand: newHand,
      // discard: NOT updated here — added after effect runs
      hidden_skill: newHidden,
      cost: Math.min(10, p.cost + effectiveCost),
      exposure: Math.min(10, p.exposure + card.exposure),
      cards_played_this_round: p.cards_played_this_round + 1,
      effects: effectsAfterCost,
    }),
  };

  // Determine damage multiplier from boost effects
  const updatedPlayer = newGame.players.find(p => p.id === playerId)!;
  const hasDouble = updatedPlayer.effects.some(e =>
    e.type === 'double_effects_this_round' || e.type === 'all_effects_plus_2_this_round' || e.type === 'all_effects_plus_2');

  // Check override_next_play: INTJ's 终局推演 nullifies this card
  const override = updatedPlayer.effects.find(e => e.type === 'override_next_play');
  if (override) {
    newGame = { ...newGame, players: newGame.players.map(p =>
      p.id === playerId ? { ...p, effects: p.effects.filter(e => e !== override) } : p) };
    newGame = addLog(newGame, `终局推演触发！${updatedPlayer.nickname} 的「${card.name}」效果被预先抵消`, 'combat', playerId);
    return newGame;
  }

  // Check recorded: reveal card and add cost
  const recorded = updatedPlayer.effects.find(e => e.type === 'recorded');
  if (recorded) {
    newGame = { ...newGame, players: newGame.players.map(p =>
      p.id === playerId
        ? { ...p, cost: Math.min(10, p.cost + 2), effects: p.effects.filter(e => e !== recorded) }
        : p) };
    newGame = addLog(newGame, `记录触发！${updatedPlayer.nickname} 出「${card.name}」被追踪，代价+2`, 'combat', playerId);
  }

  const ctx: EffectContext = { game: newGame, player: newGame.players.find(p => p.id === playerId)!, card, target, damageBonus: hasDouble ? 2 : 0 };
  const result = effectFn(ctx);
  newGame = result.game;

  // NOW move card to discard (after effect ran, so discard-based effects see the correct state)
  newGame = {
    ...newGame,
    players: newGame.players.map(p => p.id !== playerId ? p : {
      ...p,
      discard: [...p.discard, card],
    }),
  };

  // Attach revealed cards to game object temporarily for route to pick up
  if (result.revealedCards?.length) {
    (newGame as any).__revealedCards = result.revealedCards;
  }

  // Check if cost killed player
  const pAfter = newGame.players.find(p => p.id === playerId)!;
  if (pAfter.cost >= 10) {
    newGame = { ...newGame, players: newGame.players.map(p =>
      p.id === playerId ? { ...p, is_alive: false } : p) };
  }

  // ── exposure_heal_this_round: heal for each point of exposure gained this card ──
  const exposureGained = Math.max(0, card.exposure);
  if (exposureGained > 0) {
    const pNow = newGame.players.find(p => p.id === playerId)!;
    if (pNow.effects.some(e => e.type === 'exposure_heal_this_round')) {
      const healed = Math.min(10, pNow.hp + exposureGained);
      newGame = updatePlayer(newGame, playerId, { hp: healed });
      newGame = addLog(newGame, `当下共鸣触发：${pNow.nickname} 回复${exposureGained}点生命`, 'combat', playerId);
    }
  }

  // ── reactive_damage_1: if caster has this, deal 1 follow-up to their target ──
  const reactiveEffect = newGame.players.find(p => p.id === playerId)?.effects.find(e => e.type === 'reactive_damage_1');
  if (reactiveEffect?.target_player_id && target) {
    const { game: rg, logs: rl } = applyDamage(newGame, reactiveEffect.target_player_id, 1);
    newGame = rg;
    newGame = updatePlayer(newGame, playerId, {
      effects: newGame.players.find(p => p.id === playerId)!.effects.filter(e => e.type !== 'reactive_damage_1')
    });
    if (rl.length) newGame = addLog(newGame, `现场反应触发！${rl.join('；')}`, 'combat', playerId);
  }

  // ── Trigger trap_attack: if the caster has a trap and played an attack card ──
  const caster = newGame.players.find(p => p.id === playerId)!;
  const trap = caster.effects.find(e => e.type === 'trap_attack');
  if (trap && (card.type === 'attack' || card.type === 'special')) {
    const trapDmg = trap.value ?? 3;
    const newCasterHp = Math.max(0, caster.hp - trapDmg);
    newGame = { ...newGame, players: newGame.players.map(p =>
      p.id === playerId
        ? { ...p, hp: newCasterHp, is_alive: newCasterHp > 0, effects: p.effects.filter(e => e !== trap) }
        : p) };
    newGame = addLog(newGame, `⚠ 长线陷阱触发！${caster.nickname} 受到 ${trapDmg} 伤害`, 'combat', playerId);
  }

  // ── Trigger foresight_trap on any card play ──
  const caster2 = newGame.players.find(p => p.id === playerId)!;
  const foresight = caster2.effects.find(e => e.type === 'foresight_trap');
  if (foresight) {
    const fDmg = foresight.value ?? 3;
    const newHp = Math.max(0, caster2.hp - fDmg);
    newGame = { ...newGame, players: newGame.players.map(p =>
      p.id === playerId
        ? { ...p, hp: newHp, is_alive: newHp > 0, effects: p.effects.filter(e => e !== foresight) }
        : p) };
    newGame = addLog(newGame, `🔮 预见触发！${caster2.nickname} 额外受到 ${fDmg} 伤害`, 'combat', playerId);
  }

  // Main action log
  newGame = addLog(newGame, `[第${game.current_round}轮] ${result.log}`, 'combat', playerId);
  return newGame;
}

// ─── Win conditions ────────────────────────────────────────────────────────────

export function checkWinConditions(game: GameRoom): { gameEnded: boolean; winners: WinResult[] } {
  const alive = game.players.filter(p => p.is_alive);
  const winners: WinResult[] = [];

  if (alive.length <= 1) {
    if (alive.length === 1) winners.push({ playerId: alive[0].id, condition: '最后的幸存者' });
    return { gameEnded: true, winners };
  }

  // ES: eliminated 2+
  for (const p of alive.filter(p => p.group === 'ES')) {
    const defeated = game.players.filter(x => x.id !== p.id && !x.is_alive).length;
    if (defeated >= 2) winners.push({ playerId: p.id, condition: `行动者胜利：已击败${defeated}名玩家` });
  }

  // After round 5 battle
  if (game.current_round >= 5 && game.current_phase === 'battle') {
    const maxHp = Math.max(...alive.map(p => p.hp));
    for (const p of alive.filter(p => p.group === 'IS' && p.hp === maxHp))
      if (!winners.find(w => w.playerId === p.id))
        winners.push({ playerId: p.id, condition: `守卫胜利：HP最高（${maxHp}）` });

    const maxLinks = Math.max(...alive.map(p => p.resonance_with.length));
    for (const p of alive.filter(p => p.group === 'EN' && p.resonance_with.length === maxLinks && maxLinks > 0))
      if (!winners.find(w => w.playerId === p.id))
        winners.push({ playerId: p.id, condition: `影响者胜利：共鸣链接最多（${maxLinks}条）` });

    // IN: highest exposure ≥7, or has victory_declared + exposure ≥5
    const maxExposure = Math.max(...alive.map(p => p.exposure));
    for (const p of alive.filter(p => p.group === 'IN')) {
      const hasVictoryDeclared = p.effects.some(e => e.type === 'victory_declared');
      const qualifies = (p.exposure === maxExposure && maxExposure >= 7) ||
                        (hasVictoryDeclared && p.exposure >= 5);
      if (qualifies && !winners.find(w => w.playerId === p.id))
        winners.push({ playerId: p.id, condition: `隐者胜利：公开度最高（${p.exposure}）${hasVictoryDeclared ? ' · 战略蓝图加成' : ''}` });
    }

    if (winners.length > 0 || game.current_round >= 5)
      return { gameEnded: true, winners };
  }

  if (winners.length > 0) return { gameEnded: true, winners };
  return { gameEnded: false, winners: [] };
}

// ─── Phase advancement ─────────────────────────────────────────────────────────

export function advancePhase(game: GameRoom): GameRoom {
  const order: GamePhase[] = ['question', 'resonance', 'card_generation', 'battle'];
  const idx = game.current_phase ? order.indexOf(game.current_phase) : -1;

  if (idx === order.length - 1 || idx === -1) {
    // Round ends → next round
    const nextRound = game.current_round + 1;
    if (nextRound > 5) return { ...game, status: 'finished' };

    const question = getRandomQuestion(getDepthForRound(nextRound));

    // Apply persistent effects: heal_on_round_start
    const newPlayers = game.players.map(p => {
      let hp = p.hp;
      const heal = p.effects.find(e => e.type === 'heal_on_round_start');
      if (heal && p.is_alive) {
        hp = Math.min(10, hp + (heal.value ?? 1));
      }
      // Tick down rounds_remaining, remove expired
      const newEffects = p.effects
        .map(e => e.rounds_remaining !== undefined ? { ...e, rounds_remaining: e.rounds_remaining - 1 } : e)
        .filter(e => e.rounds_remaining === undefined || e.rounds_remaining > 0);
      return {
        ...p, hp,
        current_answer: null, answer_visibility: null,
        cards_played_this_round: 0, battle_turn_done: false,
        effects: newEffects,
      };
    });

    return {
      ...game, current_round: nextRound, current_phase: 'question',
      current_question: question, current_turn_player_id: null,
      players: newPlayers,
      game_log: [...game.game_log,
        { timestamp: Date.now(), message: `== 第 ${nextRound} 轮开始 ==`, type: 'system' }],
    };
  }

  const next = order[idx + 1];
  let newGame: GameRoom = {
    ...game, current_phase: next,
    game_log: [...game.game_log,
      { timestamp: Date.now(), message: `== 进入阶段：${phaseLabel(next)} ==`, type: 'system' }],
  };

  if (next === 'battle') {
    const first = game.players.find(p => p.is_alive);
    newGame = {
      ...newGame,
      current_turn_player_id: first?.id ?? null,
      players: game.players.map(p => ({ ...p, battle_turn_done: false, cards_played_this_round: 0 })),
    };
  }
  return newGame;
}

// ─── Turn management ───────────────────────────────────────────────────────────

export function advanceTurn(game: GameRoom): GameRoom {
  const alive = game.players.filter(p => p.is_alive);
  if (alive.length === 0) return game;

  let newGame = {
    ...game,
    players: game.players.map(p =>
      p.id === game.current_turn_player_id ? { ...p, battle_turn_done: true } : p),
  };

  const remaining = newGame.players.filter(p => p.is_alive && !p.battle_turn_done);
  if (remaining.length === 0) {
    const win = checkWinConditions(newGame);
    if (win.gameEnded) return { ...newGame, status: 'finished' };
    return advancePhase(newGame);
  }

  return { ...newGame, current_turn_player_id: remaining[0].id };
}

// ─── Initial player ────────────────────────────────────────────────────────────

export function createInitialPlayer(id: string, nickname: string, isHost: boolean): Player {
  return {
    id, nickname, mbti: '', group: 'IN',
    hand: [], deck: [], discard: [], hidden_skill: null,
    hp: 10, cost: 0, exposure: 0, resonance: 0, resonance_with: [],
    is_alive: true, setup_complete: false,
    current_answer: null, answer_visibility: null,
    cards_played_this_round: 0, battle_turn_done: false,
    effects: [], is_host: isHost,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function addLog(game: GameRoom, message: string, type: GameLog['type'], playerId?: string): GameRoom {
  return { ...game, game_log: [...game.game_log, { timestamp: Date.now(), message, type, player_id: playerId }] };
}

function updatePlayer(game: GameRoom, id: string, update: Partial<Player>): GameRoom {
  return { ...game, players: game.players.map(p => p.id === id ? { ...p, ...update } : p) };
}

function phaseLabel(phase: GamePhase): string {
  return ({ question:'问题', resonance:'共鸣', card_generation:'卡牌生成', battle:'战斗' })[phase];
}
