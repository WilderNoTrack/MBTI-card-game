import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { advanceTurn, checkWinConditions } from '@/lib/gameLogic';
import { GameRoom } from '@/lib/types';

export async function POST(req: Request) {
  const { roomCode, playerId } = await req.json();
  const supabase = createServerClient();

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!room) return NextResponse.json({ error: '房间不存在' }, { status: 404 });

  const game = room as GameRoom;
  if (game.current_turn_player_id !== playerId) {
    return NextResponse.json({ error: '还没到你的回合' }, { status: 400 });
  }

  // Enforce must_play: if target has must_play effect and hasn't played yet, block
  const currentPlayer = game.players.find(p => p.id === playerId);
  if (currentPlayer?.effects.some(e => e.type === 'must_play') && currentPlayer.cards_played_this_round === 0) {
    return NextResponse.json({ error: '战略指挥：你必须至少出一张牌才能结束回合！' }, { status: 400 });
  }

  let newGame = advanceTurn(game);
  const { gameEnded, winners } = checkWinConditions(newGame);
  if (gameEnded) newGame = { ...newGame, status: 'finished' };

  const { error } = await supabase
    .from('game_rooms')
    .update({
      status: newGame.status,
      current_round: newGame.current_round,
      current_phase: newGame.current_phase,
      current_question: newGame.current_question,
      current_turn_player_id: newGame.current_turn_player_id,
      players: newGame.players,
      game_log: newGame.game_log,
    })
    .eq('room_code', roomCode);

  if (error) return NextResponse.json({ error: '结束回合失败' }, { status: 500 });
  return NextResponse.json({ ok: true, gameEnded, winners, newPhase: newGame.current_phase });
}
