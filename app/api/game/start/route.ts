import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getRandomQuestion } from '@/lib/questions';

export async function POST(req: Request) {
  const { roomCode, playerId } = await req.json();
  const supabase = createServerClient();

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!room) return NextResponse.json({ error: '房间不存在' }, { status: 404 });
  if (room.status !== 'waiting') return NextResponse.json({ error: '游戏状态异常' }, { status: 400 });

  const host = room.players[0];
  if (host?.id !== playerId) return NextResponse.json({ error: '只有房主可以开始游戏' }, { status: 403 });
  if (room.players.length < 1) return NextResponse.json({ error: '至少需要1名玩家' }, { status: 400 });

  const { error } = await supabase
    .from('game_rooms')
    .update({
      status: 'setup',
      game_log: [
        ...room.game_log,
        { timestamp: Date.now(), message: '房主开始了游戏，进入人格选择阶段', type: 'system' },
      ],
    })
    .eq('room_code', roomCode);

  if (error) return NextResponse.json({ error: '启动失败' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
