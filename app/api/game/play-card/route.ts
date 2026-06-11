import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { canPlayCard, executeCard, advanceTurn, checkWinConditions } from '@/lib/gameLogic';
import { GameRoom } from '@/lib/types';

export async function POST(req: Request) {
  const { roomCode, playerId, cardId, targetId } = await req.json();
  const supabase = createServerClient();

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (!room) return NextResponse.json({ error: '房间不存在' }, { status: 404 });

    const game = room as GameRoom;
    const player = game.players.find(p => p.id === playerId);
    if (!player) return NextResponse.json({ error: '玩家不存在' }, { status: 404 });

    const card = player.hand.find(c => c.id === cardId) ?? player.hidden_skill;
    if (!card) return NextResponse.json({ error: '手牌不存在' }, { status: 400 });

    const { ok, reason } = canPlayCard(game, playerId, card, targetId);
    if (!ok) return NextResponse.json({ error: reason }, { status: 400 });

    // Double-check play count against active limits (belt-and-suspenders)
    const hasLimit = player.effects.some(e => e.type === 'limit_plays_1');
    const hasExtra = player.effects.some(e => e.type === 'extra_play_this_round');
    const maxAllowed = hasLimit ? 1 : hasExtra ? 3 : 2;
    if (player.cards_played_this_round >= maxAllowed) {
      return NextResponse.json({
        error: `本回合限制：最多出 ${maxAllowed} 张牌（已出 ${player.cards_played_this_round} 张）`,
      }, { status: 400 });
    }

    let newGame = executeCard(game, playerId, cardId, targetId);
    const revealedCards = (newGame as any).__revealedCards ?? null;
    delete (newGame as any).__revealedCards;

    const { gameEnded, winners } = checkWinConditions(newGame);
    if (gameEnded) newGame = { ...newGame, status: 'finished' };

    const { data: updated } = await supabase
      .from('game_rooms')
      .update({
        status: newGame.status,
        current_turn_player_id: newGame.current_turn_player_id,
        players: newGame.players,
        game_log: newGame.game_log,
      })
      .eq('room_code', roomCode)
      .eq('updated_at', room.updated_at)
      .select('id')
      .maybeSingle();

    if (updated) return NextResponse.json({ ok: true, gameEnded, winners, revealedCards });

    await new Promise(r => setTimeout(r, 60 + Math.random() * 80));
  }

  return NextResponse.json({ error: '写入冲突，请重试' }, { status: 409 });
}
