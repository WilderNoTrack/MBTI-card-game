import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { Player } from '@/lib/types';

export async function POST(req: Request) {
  const { roomCode, playerId, targetPlayerId } = await req.json();
  const supabase = createServerClient();

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!room) return NextResponse.json({ error: '房间不存在' }, { status: 404 });
  if (room.current_phase !== 'resonance') return NextResponse.json({ error: '不在共鸣阶段' }, { status: 400 });

  const player = room.players.find((p: Player) => p.id === playerId);
  const target = room.players.find((p: Player) => p.id === targetPlayerId);
  if (!player || !target) return NextResponse.json({ error: '玩家不存在' }, { status: 400 });
  if (target.answer_visibility !== 'public') return NextResponse.json({ error: '对方没有公开回答' }, { status: 400 });

  const updatedPlayers: Player[] = room.players.map((p: Player) => {
    if (p.id === playerId) {
      const newResonanceWith = p.resonance_with.includes(targetPlayerId)
        ? p.resonance_with
        : [...p.resonance_with, targetPlayerId];
      return { ...p, resonance_with: newResonanceWith, resonance: p.resonance + 1 };
    }
    if (p.id === targetPlayerId) {
      const newResonanceWith = p.resonance_with.includes(playerId)
        ? p.resonance_with
        : [...p.resonance_with, playerId];
      return { ...p, resonance_with: newResonanceWith, resonance: p.resonance + 1 };
    }
    return p;
  });

  const log = {
    timestamp: Date.now(),
    message: `${player.nickname} 对 ${target.nickname} 说「我也是」，建立共鸣链接`,
    type: 'info',
  };

  const { error } = await supabase
    .from('game_rooms')
    .update({ players: updatedPlayers, game_log: [...room.game_log, log] })
    .eq('room_code', roomCode);

  if (error) return NextResponse.json({ error: '操作失败' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
