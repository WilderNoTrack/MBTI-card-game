import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { Player } from '@/lib/types';

export async function POST(req: Request) {
  const { roomCode, playerId, answer, visibility } = await req.json();
  const supabase = createServerClient();

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (!room) return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    if (room.current_phase !== 'question') return NextResponse.json({ error: '不在提问阶段' }, { status: 400 });

    const exposureGain = visibility === 'public' ? 2 : 0;
    const updatedPlayers: Player[] = room.players.map((p: Player) => {
      if (p.id !== playerId) return p;
      return {
        ...p,
        current_answer: answer || null,
        answer_visibility: visibility,
        exposure: Math.min(10, p.exposure + exposureGain),
      };
    });

    const allAnswered = updatedPlayers
      .filter((p: Player) => p.is_alive)
      .every((p: Player) => p.answer_visibility !== null);

    const update: Record<string, unknown> = { players: updatedPlayers };
    if (allAnswered) {
      update.current_phase = 'resonance';
      update.game_log = [
        ...room.game_log,
        { timestamp: Date.now(), message: '== 进入阶段：共鸣 ==', type: 'system' },
      ];
    }

    const { data: updated } = await supabase
      .from('game_rooms')
      .update(update)
      .eq('room_code', roomCode)
      .eq('updated_at', room.updated_at)
      .select('id')
      .maybeSingle();

    if (updated) return NextResponse.json({ ok: true, allAnswered });

    await new Promise(r => setTimeout(r, 60 + Math.random() * 80));
  }

  return NextResponse.json({ error: '写入冲突，请重新提交' }, { status: 409 });
}
