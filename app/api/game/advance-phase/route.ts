import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { advancePhase } from '@/lib/gameLogic';
import { getCardDepthForRound } from '@/lib/questions';
import { deepseekChat } from '@/lib/deepseek';
import { makeFallbackCard } from '@/lib/fallbackCards';
import { GameRoom, Player, Card } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// ─── System prompts ────────────────────────────────────────────────────────────

const CARD_PROMPT = `你是《人格对战卡牌游戏》的卡牌设计师。根据玩家的真实回答，生成一张专属卡牌。

## 你的任务
读取玩家的回答，提取其中的人格特质、情绪、意象，转化为一张游戏卡牌。
卡牌的名称要诗意化、意象化，效果要与玩家回答的内容主题相关。

## 严格输出JSON格式（不要任何额外文字、解释、markdown标记）

{
  "name": "牌名（2-5个汉字，诗意化、意象化）",
  "description": "卡牌描述（一句话，15字以内，体现回答的情感）",
  "effect": "游戏效果描述（30字以内，清晰可执行）",
  "effect_code": "对应的效果代码（从下方列表选择）",
  "cost": 数字（代价槽变化，common为+1或+2，rare为+2或+3）,
  "exposure": 数字（公开度变化，0-3之间）,
  "type": "info | attack | defense | resonance | utility | special"
}

## 可选 effect_code 及对应的 effect 文字（必须严格匹配！）
- draw_2 → effect写"摸2张牌"
- draw_3 → effect写"摸3张牌"
- damage_2 → effect写"对目标造成2点伤害"
- damage_3 → effect写"对目标造成3点伤害"
- damage_4 → effect写"对目标造成4点伤害"
- damage_5 → effect写"对目标造成5点伤害"
- heal_2 → effect写"回复2点生命值"（不是代价！）
- heal_3 → effect写"回复3点生命值"
- shield_3 → effect写"获得3点护盾，抵挡伤害"
- immunity_round → effect写"本回合免疫所有伤害"
- view_hand_card → effect写"查看目标手牌中的一张"
- view_discard → effect写"查看目标的弃牌堆"
- view_hidden_skill → effect写"查看目标的隐藏技能"
- force_discard → effect写"强制目标弃掉一张手牌"
- build_resonance → effect写"与目标建立共鸣链接，双方共鸣值+1"
- break_all_resonance → effect写"断开自己所有共鸣链接"
- reduce_self_cost_2 → effect写"降低自己代价槽2点"（这个是降代价，不是回血！）
- exposure_to_damage → effect写"将自己公开度的一半转化为伤害"
- cost_to_damage → effect写"将自己代价槽的一半转化为伤害"
- resonance_damage → effect写"共鸣值每有1点造1点伤害"
- copy_last_card → effect写"复制目标上一张出的牌到手牌"
- reflect_last_card → effect写"将目标上一张牌的效果反弹给他自己"
- swap_resource → effect写"与目标互换生命值"

## 严格规则
1. effect_code 和 effect 文字必须一致，heal是回血不是回代价，reduce_self_cost_2才是降代价
2. 牌名从玩家回答中提取意象
3. 必须输出合法JSON，不含markdown`;

const HIDDEN_PROMPT = `你是《人格对战卡牌游戏》的隐藏技能设计师。这是游戏最关键的一张牌。

玩家在最后一轮回答了深层问题，分享了一段真实经历。
你要把这段经历转化为一张专属的"隐藏技能牌"，整局只能用一次。

## 设计原则
1. 这张牌必须有强烈的个人色彩，让玩家觉得"这就是我"
2. 效果强大但不秒杀
3. 牌名要诗意、富有意象，从回答中提取核心意象
4. 激活条件固定：公开度≥7

## 严格输出JSON格式（不含markdown）

{
  "name": "牌名（2-6个汉字，意象化）",
  "description": "卡牌描述（一句话，与玩家经历相关，20字以内）",
  "activation": "发动前玩家需要大声说的一句话（仪式感，与回答主题相关）",
  "effect": "游戏效果（清晰可执行，40字以内）",
  "effect_code": "custom",
  "cost": 3,
  "exposure": 3,
  "type": "special"
}

## 不要让效果太弱，这是终极牌
## 必须从玩家回答中提取核心意象作为牌名`;

// ─── Card generation (direct, no HTTP self-call) ───────────────────────────────

async function generateCardForPlayer(
  player: Player,
  question: string,
  depth: 'common' | 'rare' | 'hidden'
): Promise<Card> {
  const isHidden = depth === 'hidden';
  const systemPrompt = isHidden ? HIDDEN_PROMPT : CARD_PROMPT;

  const userPrompt = isHidden
    ? `玩家信息：
- MBTI：${player.mbti}
- MBTI组别：${player.group}

最后一轮深层问题：${question}

玩家回答：
${player.current_answer}

请为这位玩家生成专属隐藏技能牌。`
    : `玩家信息：
- MBTI类型：${player.mbti}
- 回答方式：${player.answer_visibility === 'public' ? '公开' : '私密'}
- 稀有度等级：${depth}

问题：${question}

玩家回答：
${player.current_answer}

请生成这位玩家的专属卡牌，牌名必须来自回答中的意象。`;

  try {
    const text = await deepseekChat({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 600,
    });

    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    if (!parsed.name || !parsed.effect || !parsed.effect_code) {
      throw new Error('缺少必要字段');
    }

    const needsTarget = ['damage_2','damage_3','damage_4','damage_5','view_hand_card',
      'view_discard','view_hidden_skill','force_discard','build_resonance',
      'copy_last_card','reflect_last_card','resonance_damage','swap_resource'].includes(parsed.effect_code);

    if (isHidden) {
      return {
        ...parsed,
        id: `hidden_${uuidv4().slice(0, 8)}`,
        rarity: 'hidden',
        effect_code: 'custom',
        cost: 3,
        exposure: 3,
        type: 'special',
        needsTarget: false,
        mbti: player.mbti,
      };
    }

    return {
      ...parsed,
      id: `ai_${uuidv4().slice(0, 8)}`,
      rarity: depth,
      needsTarget,
      mbti: player.mbti, // link to player's character art
    };
  } catch (err) {
    console.error(`Card generation failed for ${player.nickname}:`, err);
    const fallback = makeFallbackCard(depth);
    return { ...fallback, mbti: player.mbti };
  }
}

// ─── Main route ────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { roomCode } = await req.json();
  const supabase = createServerClient();

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!room) return NextResponse.json({ error: '房间不存在' }, { status: 404 });

  const currentGame = room as GameRoom;
  let newGame = advancePhase(currentGame);

  // Write phase change immediately so clients see the spinner
  await supabase.from('game_rooms').update({
    status: newGame.status,
    current_round: newGame.current_round,
    current_phase: newGame.current_phase,
    current_question: newGame.current_question,
    current_turn_player_id: newGame.current_turn_player_id,
    players: newGame.players,
    game_log: newGame.game_log,
  }).eq('room_code', roomCode);

  // If entering card_generation, do it NOW (await, not fire-and-forget)
  if (newGame.current_phase === 'card_generation') {
    const depth = getCardDepthForRound(newGame.current_round);
    const question = newGame.current_question?.text ?? '';

    // Each alive player draws 1 card (0 if they have draw_less_1 effect)
    const playersAfterDraw = newGame.players.map((p: Player) => {
      if (!p.is_alive || p.deck.length === 0) return p;
      const hasDrawLess = p.effects.some(e => e.type === 'draw_less_1');
      if (hasDrawLess) {
        // Skip draw this round, remove the effect
        return { ...p, effects: p.effects.filter(e => e.type !== 'draw_less_1') };
      }
      const drawn = p.deck[0];
      return { ...p, hand: [...p.hand, drawn].slice(0, 7), deck: p.deck.slice(1) };
    });

    newGame = {
      ...newGame,
      players: playersAfterDraw,
      game_log: [...newGame.game_log, {
        timestamp: Date.now(),
        message: `🃏 卡牌生成阶段：每位玩家摸1张牌，AI生成1张专属卡牌`,
        type: 'system' as const,
      }],
    };

    const playersToGenerate = newGame.players.filter(
      (p: Player) => p.is_alive && p.answer_visibility !== 'skipped' && p.current_answer
    );

    // Add log entries showing generation is happening
    const genLogs = playersToGenerate.map(p => ({
      timestamp: Date.now() + 1,
      message: `🤖 正在为 ${p.nickname} 生成专属卡牌...`,
      type: 'system' as const,
    }));

    await supabase.from('game_rooms').update({
      players: newGame.players,
      game_log: [...newGame.game_log, ...genLogs],
    }).eq('room_code', roomCode);

    // Generate cards in parallel for all players
    const cardResults = await Promise.allSettled(
      playersToGenerate.map(async (player) => {
        const card = await generateCardForPlayer(player, question, depth);
        return { playerId: player.id, card, playerName: player.nickname };
      })
    );

    // Fetch fresh state to avoid overwriting concurrent changes
    const { data: freshRoom } = await supabase
      .from('game_rooms').select('*').eq('room_code', roomCode).single();

    if (!freshRoom) return NextResponse.json({ ok: true });

    const resultLogs: typeof newGame.game_log = [];
    const updatedPlayers = freshRoom.players.map((p: Player) => {
      const result = cardResults.find(
        r => r.status === 'fulfilled' && r.value.playerId === p.id
      );
      if (!result || result.status !== 'fulfilled') return p;

      const { card } = result.value;
      const isFallback = card.id.startsWith('fallback_');
      const logMsg = depth === 'hidden'
        ? `✦ ${p.nickname} 获得隐藏技能牌：【${card.name}】`
        : `✨ ${p.nickname} 获得${isFallback ? '备用' : 'AI生成'}卡牌：【${card.name}】— ${card.description}`;

      resultLogs.push({ timestamp: Date.now(), message: logMsg, type: 'info', player_id: p.id });

      if (depth === 'hidden') {
        return { ...p, hidden_skill: card };
      }
      return { ...p, hand: [...p.hand, card].slice(0, 7) };
    });

    // Advance to battle
    const advancedGame = advancePhase({
      ...freshRoom, players: updatedPlayers,
      game_log: [...freshRoom.game_log, ...resultLogs],
    } as GameRoom);

    await supabase.from('game_rooms').update({
      current_phase: advancedGame.current_phase,
      current_turn_player_id: advancedGame.current_turn_player_id,
      players: advancedGame.players,
      game_log: advancedGame.game_log,
    }).eq('room_code', roomCode);
  }

  return NextResponse.json({ ok: true, phase: newGame.current_phase });
}
