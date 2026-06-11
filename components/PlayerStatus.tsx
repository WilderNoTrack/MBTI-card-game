import { Player } from '@/lib/types';
import clsx from 'clsx';

const GROUP_COLORS: Record<string, string> = {
  IN: 'border-violet-600/50',
  IS: 'border-cyan-600/50',
  EN: 'border-amber-600/50',
  ES: 'border-red-600/50',
};

const GROUP_TEXT: Record<string, string> = {
  IN: 'text-violet-400',
  IS: 'text-cyan-400',
  EN: 'text-amber-400',
  ES: 'text-red-400',
};

interface PlayerStatusProps {
  player: Player;
  isCurrentTurn?: boolean;
  isTarget?: boolean;
  selectable?: boolean;
  onSelect?: () => void;
  showAnswer?: boolean;
  alreadyResonated?: boolean;
  onResonate?: () => void;
  myResonanceWith?: string[];
}

export default function PlayerStatus({
  player, isCurrentTurn, isTarget, selectable, onSelect,
  showAnswer, alreadyResonated, onResonate, myResonanceWith = [],
}: PlayerStatusProps) {
  const group = player.group || 'IN';

  return (
    <div
      onClick={selectable ? onSelect : undefined}
      className={clsx(
        'p-3 rounded-xl border transition-all duration-150',
        !player.is_alive && 'opacity-40',
        isTarget && 'border-amber-400/80 bg-amber-500/10 ring-1 ring-amber-400/50',
        isCurrentTurn && !isTarget && 'border-violet-400/50 bg-violet-500/5',
        !isTarget && !isCurrentTurn && GROUP_COLORS[group],
        selectable && player.is_alive && 'cursor-pointer hover:border-amber-400/60 hover:bg-amber-500/5'
      )}
    >
      {/* Name + MBTI */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={clsx(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            player.is_alive ? 'bg-emerald-400' : 'bg-gray-700'
          )} />
          {player.mbti && (
            <img
              src={`/characters/${player.mbti}.png`}
              alt={player.mbti}
              className="w-6 h-6 rounded-full object-cover object-top flex-shrink-0 bg-gray-800"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span className="text-gray-200 text-sm font-medium truncate">{player.nickname}</span>
        </div>
        <span className={clsx('text-xs font-mono flex-shrink-0', GROUP_TEXT[group])}>
          {player.mbti || '?'}
        </span>
      </div>

      {/* Stats bars */}
      <div className="space-y-1.5">
        <MiniBar value={player.hp} max={10} color="bg-emerald-500" />
        <MiniBar value={player.cost} max={10} color="bg-red-500" />
      </div>

      {/* Numbers */}
      <div className="flex justify-between mt-1.5">
        <span className="text-emerald-500 text-xs">{player.hp}HP</span>
        <span className="text-blue-400 text-xs">{player.exposure}公</span>
        <span className="text-violet-400 text-xs">{player.resonance}共</span>
      </div>

      {/* Resonance links */}
      {myResonanceWith.includes(player.id) && (
        <div className="mt-1.5 text-xs text-violet-400 flex items-center gap-1">
          <span>♦</span> 共鸣中
        </div>
      )}

      {/* Answer in resonance phase */}
      {showAnswer && player.answer_visibility === 'public' && player.current_answer && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-gray-400 text-xs leading-snug line-clamp-3">
            {player.current_answer}
          </p>
          {onResonate && !alreadyResonated && (
            <button
              onClick={e => { e.stopPropagation(); onResonate(); }}
              className="mt-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              我也是
            </button>
          )}
        </div>
      )}

      {showAnswer && player.answer_visibility === 'private' && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-gray-700 text-xs italic">私密回答</p>
        </div>
      )}

      {showAnswer && player.answer_visibility === 'skipped' && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-gray-700 text-xs italic">跳过</p>
        </div>
      )}

      {/* Turn / status indicator */}
      {isCurrentTurn && (
        <div className="mt-1.5 text-xs text-amber-400 flex items-center gap-1">
          <span className="animate-pulse">▶</span> 出牌中
        </div>
      )}

      {isTarget && (
        <div className="mt-1.5 text-xs text-amber-300 font-medium">⚠ 已锁定目标</div>
      )}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  );
}
