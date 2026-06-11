import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createInitialPlayer } from '@/lib/gameLogic';
import { v4 as uuidv4 } from 'uuid';

function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  const { nickname } = await req.json();
  if (!nickname) return NextResponse.json({ error: '请输入昵称' }, { status: 400 });

  const supabase = createServerClient();
  const playerId = uuidv4();

  // Try up to 5 times to get a unique room code
  for (let attempt = 0; attempt < 5; attempt++) {
    const roomCode = generateRoomCode();
    const player = createInitialPlayer(playerId, nickname, true);

    const { data, error } = await supabase
      .from('game_rooms')
      .insert({
        room_code: roomCode,
        status: 'waiting',
        current_round: 0,
        current_phase: null,
        current_turn_player_id: null,
        current_question: null,
        players: [player],
        game_log: [{
          timestamp: Date.now(),
          message: `${nickname} 创建了房间`,
          type: 'system',
        }],
      })
      .select('id, room_code')
      .single();

    if (!error && data) {
      return NextResponse.json({ roomCode: data.room_code, playerId });
    }

    // If duplicate room code, retry
    if (error?.code !== '23505') {
      console.error('Create room error:', error);
      return NextResponse.json({ error: '创建房间失败' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: '无法生成唯一房间码，请重试' }, { status: 500 });
}
