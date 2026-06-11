'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

function Collapsible({ title, children, icon }: { title: string; children: React.ReactNode; icon?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-gray-900/50 backdrop-blur border border-gray-800/60 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left">
        <div className="flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          <span className="text-white font-bold text-sm">{title}</span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-500 text-sm flex-shrink-0">
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}>
            <div className="px-4 pb-4 pt-1 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PHASES = [
  {
    icon: '💬', color: 'text-violet-400', title: '问题阶段',
    items: [
      '所有人回答同一道问题',
      '选择【公开】回答：+2公开度，其他人可见，可建立共鸣',
      '选择【私密】回答：仅AI可见，生成卡牌降一档',
      '选择【跳过】：本轮不获得AI卡牌',
    ],
  },
  {
    icon: '♦', color: 'text-violet-300', title: '共鸣阶段',
    items: [
      '查看所有人的公开回答',
      '点击"我也是"与有共鸣的玩家建立连接',
      '双方共鸣值各+1，受到伤害时会溅射50%给共鸣对象',
      '共鸣链接越多，风险与收益并存',
    ],
  },
  {
    icon: '✦', color: 'text-amber-400', title: '卡牌生成',
    items: [
      '每人从牌库摸1张牌（手牌补充）',
      'AI根据你的回答再生成1张专属卡牌',
      '每轮共+2张，战斗最多出2张，保持平衡',
      '第1-2轮普通卡 | 第3-4轮稀有卡 | 第5轮隐藏技能',
    ],
  },
  {
    icon: '⚔', color: 'text-red-400', title: '战斗阶段',
    items: [
      '轮流出牌，每人每回合最多出2张',
      '出牌需选择目标（攻击/查看/共鸣类）',
      '代价槽超过10格即被淘汰出局',
      '所有人行动结束后进入下一轮',
    ],
  },
];

const STATS = [
  { name: 'HP', color: 'text-emerald-400', bar: 'bg-emerald-500', desc: '生命值，归零即出局' },
  { name: '代价', color: 'text-red-400', bar: 'bg-red-500', desc: '出牌代价累积，满10淘汰' },
  { name: '公开度', color: 'text-blue-400', bar: 'bg-blue-500', desc: '影响卡牌生成与隐藏技能' },
  { name: '共鸣', color: 'text-violet-400', bar: 'bg-violet-500', desc: '连接数量，可转化为伤害' },
];

const WIN_CONDITIONS = [
  { group: 'IN · 隐者', color: 'text-violet-400', border: 'border-violet-700/40', bg: 'bg-violet-900/20', cond: '第5轮结束时公开度最高且≥7', tip: '多公开回答，用信息类卡牌查看他人' },
  { group: 'IS · 守卫', color: 'text-cyan-400', border: 'border-cyan-700/40', bg: 'bg-cyan-900/20', cond: '第5轮结束时存活玩家中HP最高', tip: '多用护盾和治疗，减少代价累积' },
  { group: 'EN · 影响者', color: 'text-amber-400', border: 'border-amber-700/40', bg: 'bg-amber-900/20', cond: '第5轮结束时共鸣链接最多', tip: '主动建立共鸣，用共鸣类卡牌扩大连接' },
  { group: 'ES · 行动者', color: 'text-red-400', border: 'border-red-700/40', bg: 'bg-red-900/20', cond: '游戏中击败任意2名玩家', tip: '主动攻击，优先打代价高的目标' },
];

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!nickname.trim()) { setError('请输入你的昵称'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      localStorage.setItem('playerId', data.playerId);
      localStorage.setItem('playerNickname', nickname.trim());
      router.push(`/room/${data.roomCode}/lobby`);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!nickname.trim()) { setError('请输入你的昵称'); return; }
    if (!roomCode.trim()) { setError('请输入房间码'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), roomCode: roomCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      localStorage.setItem('playerId', data.playerId);
      localStorage.setItem('playerNickname', nickname.trim());
      router.push(`/room/${roomCode.trim()}/lobby`);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="h-screen overflow-hidden grid grid-cols-[1fr_420px_1fr]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <img src="/home-bg.png" alt="" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      {/* 3-column fills full screen — no wrapper div needed */}

        {/* LEFT rules — 2 boxes */}
        <div className="relative z-10 hidden lg:flex flex-col justify-center gap-4 p-8 text-sm">
          <Collapsible title="游戏简介 · 属性说明" icon="📖">
            <p className="text-gray-500 leading-snug mb-3">共5轮，每轮4个阶段。选择MBTI人格，AI根据你的回答生成专属卡牌，用来攻击、防御、建立共鸣。</p>
            <div className="space-y-2">
              {STATS.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.bar}`} />
                  <span className={`font-bold w-10 flex-shrink-0 ${s.color}`}>{s.name}</span>
                  <span className="text-gray-600 text-sm">{s.desc}</span>
                </div>
              ))}
            </div>
          </Collapsible>

          <Collapsible title="每轮四个阶段" icon="🔄">
            <div className="space-y-3">
              {PHASES.map((phase, i) => (
                <div key={i}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>{phase.icon}</span>
                    <span className={`font-semibold text-sm ${phase.color}`}>{phase.title}</span>
                  </div>
                  <ul className="pl-5 space-y-0.5">
                    {phase.items.map((item, j) => (
                      <li key={j} className="text-gray-600 text-xs leading-snug flex gap-1">
                        <span className="text-gray-700 flex-shrink-0">·</span><span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Collapsible>
        </div>

        {/* CENTER: Logo + Login */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-10 border-x border-white/5 bg-black/20 backdrop-blur-sm">
          <div className="text-center mb-6">
            <img src="/logo.png" alt="人格对战" className="w-16 h-16 mx-auto mb-3 drop-shadow-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h1 className="text-4xl font-bold tracking-tight mb-1 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              人格对战
            </h1>
            <p className="text-gray-500 text-xs tracking-widest mb-3">MBTI CARD BATTLE</p>
            <div className="h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent mb-3" />
            <p className="text-gray-400 text-xs italic">
              "你愿意暴露多少真实的自己，决定了你能调用多少力量。"
            </p>
          </div>

        {/* Card */}
        <div className="w-full bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {mode === 'menu' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('create')}
                className="w-full py-4 rounded-xl bg-violet-700 hover:bg-violet-600 text-white font-semibold text-lg transition-all duration-200 hover:shadow-lg hover:shadow-violet-900/50"
              >
                创建房间
              </button>
              <button
                onClick={() => setMode('join')}
                className="w-full py-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-lg transition-colors"
              >
                加入房间
              </button>
            </div>
          )}

          {(mode === 'create' || mode === 'join') && (
            <div className="space-y-4">
              <button
                onClick={() => { setMode('menu'); setError(''); }}
                className="text-gray-500 hover:text-gray-300 text-sm flex items-center gap-1 transition-colors"
              >
                ← 返回
              </button>

              <div>
                <label className="block text-gray-400 text-sm mb-2">你的昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
                  placeholder="起个名字吧"
                  maxLength={12}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              {mode === 'join' && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">房间码</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={e => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    placeholder="6位数字"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors text-center text-2xl tracking-widest font-mono"
                  />
                </div>
              )}

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                onClick={mode === 'create' ? handleCreate : handleJoin}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold text-lg transition-all duration-200"
              >
                {loading ? '处理中...' : mode === 'create' ? '创建房间' : '加入游戏'}
              </button>
            </div>
          )}
        </div>

          {/* Stats row below card */}
          <div className="flex gap-5 justify-center mt-4">
            {[['👥','2-6人'],['⏱','30-45分钟'],['✦','每局独一无二']].map(([icon,label])=>(
              <div key={label} className="flex items-center gap-1 text-gray-700 text-[10px]">
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT rules — 2 boxes */}
        <div className="relative z-10 hidden lg:flex flex-col justify-center gap-4 p-8 text-sm">
          <Collapsible title="各阵营胜利条件" icon="🏆">
            <div className="space-y-2.5">
              {WIN_CONDITIONS.map((w, i) => (
                <div key={i} className={`p-2.5 rounded-xl border ${w.border} ${w.bg}`}>
                  <p className={`font-bold text-sm mb-0.5 ${w.color}`}>{w.group}</p>
                  <p className="text-gray-300 text-sm mb-1">{w.cond}</p>
                  <p className="text-gray-600 text-xs">💡 {w.tip}</p>
                </div>
              ))}
            </div>
          </Collapsible>

          <Collapsible title="重要规则" icon="⚠">
            <ul className="space-y-2 text-gray-500 text-sm leading-snug">
              <li className="flex gap-1.5"><span className="text-violet-500 flex-shrink-0">▸</span>卡牌生成阶段：每人摸1张+AI生成1张，共+2张</li>
              <li className="flex gap-1.5"><span className="text-violet-500 flex-shrink-0">▸</span>共鸣连接：受伤时共鸣对象承受50%溅射</li>
              <li className="flex gap-1.5"><span className="text-violet-500 flex-shrink-0">▸</span>代价槽满10格立即淘汰出局</li>
              <li className="flex gap-1.5"><span className="text-violet-500 flex-shrink-0">▸</span>隐藏技能每局限用1次，需公开度≥7发动</li>
              <li className="flex gap-1.5"><span className="text-violet-500 flex-shrink-0">▸</span>ES行动者击败2人即时获胜，不用等第5轮</li>
              <li className="flex gap-1.5"><span className="text-violet-500 flex-shrink-0">▸</span>第5轮结束时统一判定其余阵营的胜负</li>
            </ul>
          </Collapsible>
        </div>

    </main>
  );
}
