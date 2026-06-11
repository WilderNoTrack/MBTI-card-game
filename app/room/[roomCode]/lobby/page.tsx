'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GameRoom, Player } from '@/lib/types';

export default function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameRoom | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const pid = localStorage.getItem('playerId') || '';
    setPlayerId(pid);

    // Initial fetch
    supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single()
      .then(({ data }) => { if (data) setGame(data as GameRoom); });

    // Realtime subscription
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_rooms',
        filter: `room_code=eq.${roomCode}`,
      }, ({ new: newData }) => {
        setGame(newData as GameRoom);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  // Navigate when game starts
  useEffect(() => {
    if (!game) return;
    if (game.status === 'setup') router.push(`/room/${roomCode}/setup`);
    if (game.status === 'playing') router.push(`/room/${roomCode}/play`);
  }, [game, roomCode, router]);

  async function handleStart() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, playerId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
    } catch {
      setError('操作失败');
    } finally {
      setLoading(false);
    }
  }

  const myPlayer = game?.players.find(p => p.id === playerId);
  const isHost = myPlayer?.is_host;
  const playerCount = game?.players.length ?? 0;

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Room code display */}
        <div className="text-center mb-8">
          <p className="text-gray-500 text-sm mb-1">房间码</p>
          <div className="text-6xl font-mono font-bold tracking-[0.2em] text-white">
            {roomCode}
          </div>
          <p className="text-gray-600 text-xs mt-2">把这个号码分享给朋友</p>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-300 font-semibold">等待玩家加入</h2>
            <span className="text-gray-600 text-sm">{playerCount}/6</span>
          </div>

          <div className="space-y-2 mb-6">
            {game?.players.map((p: Player, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span className="text-white font-medium flex-1">{p.nickname}</span>
                {i === 0 && (
                  <span className="text-xs text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10">
                    房主
                  </span>
                )}
                {p.id === playerId && (
                  <span className="text-xs text-gray-500">（你）</span>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 2 - playerCount) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-800"
              >
                <div className="w-2 h-2 rounded-full bg-gray-700" />
                <span className="text-gray-700 text-sm">等待玩家加入...</span>
              </div>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

          {isHost ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-lg transition-all"
            >
              {loading ? '启动中...' : '开始游戏'}
            </button>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              等待房主开始游戏...
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
