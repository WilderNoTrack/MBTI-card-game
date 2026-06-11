import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInitialDeck, MBTI_TO_GROUP, MBTIType } from '@/lib/cards';
import { getRandomQuestion } from '@/lib/questions';
import { Player } from '@/lib/types';

export async function POST(req: Request) {
  const { roomCode, playerId, mbti } = await req.json();
  if (!mbti) return NextResponse.json({ error: '请选择MBTI类型' }, { status: 400 });

  const supabase = createServerClient();
  const group = MBTI_TO_GROUP[mbti as MBTIType];
  const deck = getInitialDeck(mbti as MBTIType);

  // 乐观锁重试：最多 6 次，防止并发写入互相覆盖
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (!room) return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    if (room.status !== 'setup') return NextResponse.json({ error: '不在选择阶段' }, { status: 400 });

    const updatedPlayers: Player[] = room.players.map((p: Player) => {
      if (p.id !== playerId) return p;
      return {
        ...p,
        mbti,
        group,
        deck: deck.slice(2),
        hand: deck.slice(0, 2),
        setup_complete: true,
      };
    });

    const allReady = updatedPlayers.every((p: Player) => p.setup_complete);
    const update: Record<string, unknown> = { players: updatedPlayers };

    if (allReady) {
      update.status = 'playing';
      update.current_round = 1;
      update.current_phase = 'question';
      update.current_question = getRandomQuestion('icebreaker');
      update.game_log = [
        ...room.game_log,
        { timestamp: Date.now(), message: '所有玩家已选择MBTI，游戏开始！', type: 'system' },
        { timestamp: Date.now() + 1, message: '== 第 1 轮·问题阶段 ==', type: 'system' },
      ];
    }

    // 只在 updated_at 未被其他请求修改时才写入
    const { data: updated } = await supabase
      .from('game_rooms')
      .update(update)
      .eq('room_code', roomCode)
      .eq('updated_at', room.updated_at)
      .select('id')
      .maybeSingle();

    if (updated) {
      return NextResponse.json({ ok: true, allReady });
    }

    // 被别人抢先写了，稍等后重试
    await new Promise(r => setTimeout(r, 60 + Math.random() * 80));
  }

  return NextResponse.json({ error: '写入冲突，请重新提交' }, { status: 409 });
}
