import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInitialDeck, MBTI_TO_GROUP, MBTIType, ALL_MBTI_TYPES } from '@/lib/cards';
import { getRandomQuestion } from '@/lib/questions';
import { Player } from '@/lib/types';

export async function POST(req: Request) {
  const { roomCode, playerId } = await req.json();
  const supabase = createServerClient();

  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!room) return NextResponse.json({ error: '房间不存在' }, { status: 404 });
  if (room.status !== 'setup') return NextResponse.json({ error: '不在选择阶段' }, { status: 400 });

  const host = room.players[0];
  if (host?.id !== playerId) return NextResponse.json({ error: '只有房主可以强制开始' }, { status: 403 });

  const takenMbtis = room.players.filter((p: Player) => p.setup_complete).map((p: Player) => p.mbti);
  const available = ALL_MBTI_TYPES.filter((m: string) => !takenMbtis.includes(m));

  let availableIdx = 0;
  const updatedPlayers: Player[] = room.players.map((p: Player) => {
    if (p.setup_complete) return p;
    const mbti = available[availableIdx++ % available.length] as MBTIType;
    const group = MBTI_TO_GROUP[mbti];
    const deck = getInitialDeck(mbti);
    return {
      ...p,
      mbti,
      group,
      deck: deck.slice(2),
      hand: deck.slice(0, 2),
      setup_complete: true,
    };
  });

  const firstQuestion = getRandomQuestion('icebreaker');

  const { error } = await supabase.from('game_rooms').update({
    players: updatedPlayers,
    status: 'playing',
    current_round: 1,
    current_phase: 'question',
    current_question: firstQuestion,
    game_log: [
      ...room.game_log,
      { timestamp: Date.now(), message: '房主强制开始，未选择玩家已随机分配MBTI', type: 'system' },
      { timestamp: Date.now() + 1, message: '== 第 1 轮·问题阶段 ==', type: 'system' },
    ],
  }).eq('room_code', roomCode);

  if (error) return NextResponse.json({ error: '更新失败' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
