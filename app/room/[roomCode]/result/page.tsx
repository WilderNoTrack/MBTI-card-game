'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GameRoom, Player } from '@/lib/types';
import { checkWinConditions } from '@/lib/gameLogic';
import { MBTI_DESCRIPTIONS, MBTIType, GROUP_INFO, MBTI_TO_GROUP } from '@/lib/cards';

const GROUP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  IN: { bg: 'bg-violet-900/30', border: 'border-violet-500/50', text: 'text-violet-300' },
  IS: { bg: 'bg-cyan-900/30', border: 'border-cyan-500/50', text: 'text-cyan-300' },
  EN: { bg: 'bg-amber-900/30', border: 'border-amber-500/50', text: 'text-amber-300' },
  ES: { bg: 'bg-red-900/30', border: 'border-red-500/50', text: 'text-red-300' },
};

export default function ResultPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameRoom | null>(null);
  const [playerId] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('playerId') || '' : '');

  useEffect(() => {
    supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single()
      .then(({ data }) => { if (data) setGame(data as GameRoom); });
  }, [roomCode]);

  if (!game) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </main>
    );
  }

  const { winners } = checkWinConditions(game);
  const winnerIds = new Set(winners.map(w => w.playerId));
  const myPlayer = game.players.find(p => p.id === playerId);
  const iWon = winnerIds.has(playerId);

  return (
    <main className="min-h-screen p-6 pb-16">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <img src="/result-bg.png" alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-violet-400 text-xs tracking-widest mb-4">游戏结束</p>
          <h1 className="text-4xl font-bold text-white mb-2">
            {winners.length === 0
              ? '平局'
              : winners.length === 1
              ? `${game.players.find(p => p.id === winners[0].playerId)?.nickname} 获胜`
              : `${winners.length} 位玩家获胜`}
          </h1>
          {iWon && (
            <p className="text-amber-400 text-lg mt-2">✦ 你赢了！✦</p>
          )}
        </div>

        {/* Winners */}
        {winners.length > 0 && (
          <div className="mb-10">
            <h2 className="text-gray-500 text-sm mb-4 text-center">胜利条件</h2>
            <div className="space-y-2">
              {winners.map(w => {
                const p = game.players.find(pl => pl.id === w.playerId);
                if (!p) return null;
                return (
                  <div key={w.playerId} className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <span className="text-amber-400 text-xl">✦</span>
                    <div>
                      <span className="text-white font-bold">{p.nickname}</span>
                      <span className="text-gray-400 text-sm ml-2">{p.mbti}</span>
                      <p className="text-amber-300 text-sm">{w.condition}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Player personality cards */}
        <h2 className="text-gray-500 text-sm mb-6 text-center">— 人格映射卡 —</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {game.players.map(p => {
            const group = MBTI_TO_GROUP[p.mbti as MBTIType] || 'IN';
            const colors = GROUP_COLORS[group];
            const desc = MBTI_DESCRIPTIONS[p.mbti as MBTIType];
            const groupInfo = GROUP_INFO[group];
            const isWinner = winnerIds.has(p.id);

            return (
              <div
                key={p.id}
                className={`relative p-5 rounded-2xl border ${colors.bg} ${colors.border} ${
                  !p.is_alive ? 'opacity-60' : ''
                } ${isWinner ? 'ring-2 ring-amber-400/50' : ''}`}
              >
                {isWinner && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-xs">
                    ✦
                  </div>
                )}
                {p.id === playerId && (
                  <div className="absolute top-2 left-2 text-xs text-gray-600">（你）</div>
                )}

                <div className="text-center mb-4 mt-2">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-2 border border-white/10">
                    <img src={`/characters/${p.mbti}.png`} alt={p.mbti} className={`w-full h-full object-cover object-top ${!p.is_alive ? 'grayscale' : ''}`} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div className={`text-2xl font-bold ${colors.text}`}>{p.mbti}</div>
                  <div className="text-gray-400 text-sm">{desc?.name}</div>
                  {!p.is_alive && <div className="text-red-500 text-xs mt-1">已出局</div>}
                </div>

                <div className="text-center text-gray-500 italic text-xs mb-4">
                  "{desc?.tagline}"
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <StatItem label="最终HP" value={p.hp} />
                  <StatItem label="代价槽" value={p.cost} />
                  <StatItem label="公开度" value={p.exposure} />
                  <StatItem label="共鸣值" value={p.resonance} />
                </div>

                {p.resonance_with.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-gray-600 text-xs mb-1">共鸣链接</p>
                    {p.resonance_with.map(id => {
                      const partner = game.players.find(pl => pl.id === id);
                      return partner ? (
                        <span key={id} className="text-violet-400 text-xs mr-2">
                          ♦ {partner.nickname}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {p.hidden_skill && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-gray-600 text-xs mb-1">✦ 隐藏技能</p>
                    <p className="text-violet-300 text-xs font-medium">{p.hidden_skill.name}</p>
                    <p className="text-gray-500 text-xs italic">{p.hidden_skill.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Call to action */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-all"
          >
            回到首页
          </button>
        </div>
      </div>
    </main>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-black/20 rounded-lg px-2 py-1.5 text-center">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className="text-gray-200 font-bold">{value}</div>
    </div>
  );
}
