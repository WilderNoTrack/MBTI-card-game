import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createInitialPlayer } from '@/lib/gameLogic';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  const { roomCode, nickname } = await req.json();
  if (!roomCode || !nickname) return NextResponse.json({ error: '参数缺失' }, { status: 400 });

  const supabase = createServerClient();

  const { data: room, error: fetchErr } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (fetchErr || !room) return NextResponse.json({ error: '房间不存在' }, { status: 404 });
  if (room.status !== 'waiting') return NextResponse.json({ error: '游戏已开始，无法加入' }, { status: 400 });
  if (room.players.length >= 6) return NextResponse.json({ error: '房间已满（最多6人）' }, { status: 400 });

  const playerId = uuidv4();
  const player = createInitialPlayer(playerId, nickname, false);
  const newPlayers = [...room.players, player];
  const newLog = [
    ...room.game_log,
    { timestamp: Date.now(), message: `${nickname} 加入了房间`, type: 'system' },
  ];

  const { error: updateErr } = await supabase
    .from('game_rooms')
    .update({ players: newPlayers, game_log: newLog })
    .eq('room_code', roomCode);

  if (updateErr) return NextResponse.json({ error: '加入失败' }, { status: 500 });

  return NextResponse.json({ playerId });
}
