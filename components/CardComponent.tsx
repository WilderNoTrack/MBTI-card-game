import { Card } from '@/lib/types';
import clsx from 'clsx';

const RARITY_BORDER: Record<string, string> = {
  base:      'border-gray-600',
  signature: 'border-indigo-500',
  common:    'border-gray-500',
  rare:      'border-violet-500',
  hidden:    'border-amber-400',
};

const RARITY_LABEL: Record<string, string> = {
  base:'基础', signature:'专属', common:'普通', rare:'稀有', hidden:'✦ 隐藏',
};

const RARITY_LABEL_COLOR: Record<string, string> = {
  base:'bg-gray-700/80 text-gray-400',
  signature:'bg-indigo-900/80 text-indigo-300',
  common:'bg-gray-700/80 text-gray-300',
  rare:'bg-violet-900/80 text-violet-300',
  hidden:'bg-amber-900/80 text-amber-300',
};

const RARITY_GLOW: Record<string, string> = {
  base:'',
  signature:'shadow-md shadow-indigo-900/60',
  common:'',
  rare:'shadow-md shadow-violet-900/60',
  hidden:'shadow-lg shadow-amber-900/60',
};

const TYPE_ICON: Record<string, string> = {
  info:'🔍', attack:'⚔️', defense:'🛡️', resonance:'💜', utility:'⚡', special:'✦',
};

interface CardProps {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function CardComponent({ card, selected, onClick, disabled, compact }: CardProps) {
  const artSrc = card.mbti
    ? `/characters/${card.mbti}.png`
    : `/card-art/${card.id}.png`;   // per-card unique art

  const artHeight = compact ? 'h-20' : 'h-32';
  const cardWidth  = compact ? 'w-28' : 'w-40';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'relative rounded-xl border overflow-hidden text-left transition-all duration-150',
        'flex flex-col',
        cardWidth,
        RARITY_BORDER[card.rarity] ?? RARITY_BORDER.common,
        RARITY_GLOW[card.rarity],
        selected && 'ring-2 ring-violet-400 -translate-y-2 shadow-xl shadow-violet-900/50 scale-105',
        disabled && !selected && 'opacity-55 cursor-not-allowed',
        onClick && !disabled && 'cursor-pointer hover:brightness-110',
      )}
    >
      {/* ── Illustration with stat overlays ── */}
      <div className={clsx('relative flex-shrink-0 w-full', artHeight)}>
        {/* Art */}
        <img
          src={artSrc}
          alt={card.name}
          className="w-full h-full object-cover object-center"
          onError={e => {
            const img = e.target as HTMLImageElement;
            // Fallback to type art
            if (!img.src.includes('/card-art/')) {
              img.src = `/card-art/${card.type}.png`;
            } else {
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent && !parent.querySelector('.art-fallback')) {
                const fb = document.createElement('div');
                fb.className = 'art-fallback absolute inset-0 flex items-center justify-center text-2xl bg-gradient-to-b from-gray-700/50 to-gray-900/80';
                fb.textContent = TYPE_ICON[card.type] ?? '✦';
                parent.appendChild(fb);
              }
            }
          }}
        />

        {/* Dark gradient scrim at bottom of art */}
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-gray-950/90 to-transparent" />

        {/* Top-left: Cost badge — always show */}
        <div className={clsx(
          'absolute top-1.5 left-1.5 min-w-[22px] h-[22px] px-1 rounded-full border flex items-center justify-center',
          card.cost > 0 ? 'bg-red-600/90 border-red-400/60 shadow-sm shadow-red-900/60'
          : card.cost < 0 ? 'bg-emerald-600/90 border-emerald-400/60 shadow-sm shadow-emerald-900/60'
          : 'bg-gray-700/80 border-gray-600/60',
        )}>
          <span className="text-white font-black leading-none" style={{ fontSize: 10 }}>
            {card.cost > 0 ? `+${card.cost}` : card.cost === 0 ? '0' : card.cost}
          </span>
        </div>

        {/* Top-right: Exposure badge — no "公" prefix */}
        {card.exposure !== 0 && (
          <div className={clsx(
            'absolute top-1.5 right-1.5 min-w-[22px] h-[22px] px-1 rounded-full border flex items-center justify-center shadow-sm',
            card.exposure > 0 ? 'bg-blue-600/90 border-blue-400/60 shadow-blue-900/60'
            : 'bg-gray-600/90 border-gray-400/60',
          )}>
            <span className="text-white font-black leading-none" style={{ fontSize: 10 }}>
              {card.exposure > 0 ? `+${card.exposure}` : card.exposure}
            </span>
          </div>
        )}

        {/* Rarity tag — bottom-left of art */}
        <div className={clsx(
          'absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-semibold leading-none',
          RARITY_LABEL_COLOR[card.rarity] ?? RARITY_LABEL_COLOR.common,
        )}>
          {RARITY_LABEL[card.rarity] ?? card.rarity}
        </div>

        {/* AI-generated badge */}
        {(card.id?.startsWith('ai_') || card.id?.startsWith('hidden_')) && (
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[7px] font-bold leading-none bg-violet-600/80 text-violet-100 border border-violet-400/40 backdrop-blur-sm whitespace-nowrap">
            ✦ AI生成
          </div>
        )}

        {/* Needs-target badge */}
        {card.needsTarget && (
          <div className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-semibold leading-none bg-amber-700/80 text-amber-200">
            需目标
          </div>
        )}
      </div>

      {/* ── Text section — fixed height so all cards are same size ── */}
      <div className={clsx(
        'flex-shrink-0 flex flex-col bg-gray-950/95',
        compact ? 'px-1.5 pt-1 pb-1.5' : 'px-2 pt-1.5 pb-2',
      )}>
        {/* Card name — 1 line fixed */}
        <p className={clsx(
          'font-bold text-white leading-tight truncate',
          compact ? 'text-[11px]' : 'text-xs',
        )}>
          {card.name}
        </p>

        {/* Effect text — always reserve exactly 3 lines */}
        {!compact && (
          <p className="text-gray-400 text-[10px] leading-snug mt-0.5 line-clamp-3"
            style={{ minHeight: '3.6em' }}>
            {card.effect}
          </p>
        )}

        {compact && (
          <p className="text-gray-600 text-[9px] leading-snug mt-0.5 line-clamp-2"
            style={{ minHeight: '2.6em' }}>
            {card.effect}
          </p>
        )}
      </div>
    </button>
  );
}
