'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GameRoom, Player } from '@/lib/types';
import { MBTI_DESCRIPTIONS, MBTIType, GROUP_INFO, MBTI_TO_GROUP } from '@/lib/cards';

const MBTI_GROUPS: { group: string; types: MBTIType[] }[] = [
  { group: 'IN · 隐者', types: ['INTJ', 'INTP', 'INFJ', 'INFP'] },
  { group: 'IS · 守卫', types: ['ISTJ', 'ISTP', 'ISFJ', 'ISFP'] },
  { group: 'EN · 影响者', types: ['ENTJ', 'ENTP', 'ENFJ', 'ENFP'] },
  { group: 'ES · 行动者', types: ['ESTJ', 'ESTP', 'ESFJ', 'ESFP'] },
];

const GROUP_COLORS: Record<string, string> = {
  IN: 'border-violet-500 bg-violet-500/10 text-violet-300',
  IS: 'border-cyan-500 bg-cyan-500/10 text-cyan-300',
  EN: 'border-amber-500 bg-amber-500/10 text-amber-300',
  ES: 'border-red-500 bg-red-500/10 text-red-300',
};

const GROUP_HOVER: Record<string, string> = {
  IN: 'hover:border-violet-400 hover:bg-violet-500/20',
  IS: 'hover:border-cyan-400 hover:bg-cyan-500/20',
  EN: 'hover:border-amber-400 hover:bg-amber-500/20',
  ES: 'hover:border-red-400 hover:bg-red-500/20',
};

export default function SetupPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameRoom | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [selected, setSelected] = useState<MBTIType | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forceLoading, setForceLoading] = useState(false);

  useEffect(() => {
    const pid = localStorage.getItem('playerId') || '';
    setPlayerId(pid);

    supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single()
      .then(({ data }) => { if (data) setGame(data as GameRoom); });

    const channel = supabase
      .channel(`room-setup:${roomCode}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_rooms',
        filter: `room_code=eq.${roomCode}`,
      }, ({ new: d }) => setGame(d as GameRoom))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  useEffect(() => {
    if (game?.status === 'playing') router.push(`/room/${roomCode}/play`);
  }, [game, roomCode, router]);

  async function handleForceStart() {
    setForceLoading(true);
    try {
      await fetch('/api/game/force-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, playerId }),
      });
    } finally {
      setForceLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch('/api/game/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, playerId, mbti: selected }),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  const myPlayer = game?.players.find(p => p.id === playerId);
  const isHost = game?.players[0]?.id === playerId;
  const takenMbtis = game?.players
    .filter(p => p.id !== playerId && p.setup_complete)
    .map(p => p.mbti) ?? [];

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">{selected}</div>
          <p className="text-gray-400 text-lg mb-2">{MBTI_DESCRIPTIONS[selected!]?.name}</p>
          <p className="text-gray-600 italic text-sm mb-8">"{MBTI_DESCRIPTIONS[selected!]?.tagline}"</p>
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            等待其他玩家选择...
          </div>
          <div className="mt-8 space-y-2">
            {game?.players.map(p => (
              <div key={p.id} className="flex items-center gap-3 justify-center">
                <div className={`w-2 h-2 rounded-full ${p.setup_complete ? 'bg-emerald-400' : 'bg-gray-700'}`} />
                <span className={p.setup_complete ? 'text-gray-300' : 'text-gray-600'}>
                  {p.nickname} {p.setup_complete && p.mbti ? `· ${p.mbti}` : '（选择中...）'}
                </span>
              </div>
            ))}
          </div>
          {isHost && (
            <button
              onClick={handleForceStart}
              disabled={forceLoading}
              className="mt-6 px-6 py-2 rounded-xl border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-all disabled:opacity-40"
            >
              {forceLoading ? '处理中...' : '强制开始（未选玩家随机分配）'}
            </button>
          )}

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">选择你的人格</h1>
          <p className="text-gray-500 text-sm">你的MBTI类型决定了你的初始卡组和胜利条件</p>
        </div>

        <div className="space-y-6">
          {MBTI_GROUPS.map(({ group, types }) => {
            const groupKey = types[0].slice(0, 2) as 'IN' | 'IS' | 'EN' | 'ES';
            const info = GROUP_INFO[groupKey];
            return (
              <div key={group}>
                <div className="flex items-center gap-3 mb-3">
                  <img src={`/emblems/${groupKey}.png`} alt={groupKey} className="w-6 h-6 rounded object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <h2 className={`font-bold ${GROUP_COLORS[groupKey].split(' ')[2]}`}>{group}</h2>
                  <span className="text-gray-600 text-sm">· {info.winCondition}</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {types.map(mbti => {
                    const taken = takenMbtis.includes(mbti);
                    const isSelected = selected === mbti;
                    const desc = MBTI_DESCRIPTIONS[mbti];
                    return (
                      <button
                        key={mbti}
                        disabled={taken}
                        onClick={() => !taken && setSelected(mbti)}
                        className={`p-4 rounded-xl border text-left transition-all duration-150 ${
                          taken
                            ? 'border-gray-800 bg-gray-900/30 opacity-40 cursor-not-allowed'
                            : isSelected
                            ? GROUP_COLORS[groupKey] + ' shadow-lg'
                            : 'border-gray-700 bg-gray-900/50 ' + GROUP_HOVER[groupKey]
                        }`}
                      >
                        <div className="font-bold text-lg text-white">{mbti}</div>
                        <div className="text-xs text-gray-400 mt-1">{desc?.name}</div>
                        {taken && <div className="text-xs text-gray-600 mt-1">已被选择</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="mt-8 p-6 rounded-2xl bg-gray-900/80 border border-gray-800">
            <div className="flex items-center gap-6">
              <img
                src={`/characters/${selected}.png`}
                alt={selected}
                className="w-24 h-24 rounded-2xl object-cover object-top bg-gray-800 flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-white">{selected}</h3>
                <p className="text-gray-400">{MBTI_DESCRIPTIONS[selected]?.name}</p>
                <p className="text-gray-500 italic text-sm mt-1">"{MBTI_DESCRIPTIONS[selected]?.tagline}"</p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-violet-700 hover:bg-violet-600 text-white font-semibold transition-all disabled:opacity-50 flex-shrink-0"
              >
                {loading ? '确认中...' : '确认选择'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
