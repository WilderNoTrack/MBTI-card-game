'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { GameRoom, Player, Card, GamePhase } from '@/lib/types';
import {
  playCardPlay, playCardHover, playDamage, playHeal, playResonate,
  playPhaseChange, playTurnStart, playShield, playClick, playVictory,
  playDraw, toggleMute, isMuted, EFFECT_SOUNDS,
} from '@/lib/sounds';
import CardComponent from '@/components/CardComponent';

// ─── Constants ────────────────────────────────────────────────────────────────

const GROUP_GLOW: Record<string, string>   = { IN:'shadow-violet-500/60', IS:'shadow-cyan-500/60', EN:'shadow-amber-500/60', ES:'shadow-red-500/60' };
const GROUP_BORDER: Record<string, string> = { IN:'border-violet-500/50', IS:'border-cyan-500/50', EN:'border-amber-500/50', ES:'border-red-500/50' };
const GROUP_TEXT: Record<string, string>   = { IN:'text-violet-400',      IS:'text-cyan-400',      EN:'text-amber-400',      ES:'text-red-400' };
const GROUP_PARTICLE: Record<string, string> = { IN:'#7c3aed', IS:'#0891b2', EN:'#d97706', ES:'#dc2626' };

const PHASE_BG: Record<string, string> = {
  question:        'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.18) 0%, transparent 70%)',
  resonance:       'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.22) 0%, transparent 70%)',
  card_generation: 'radial-gradient(ellipse at 50% 0%, rgba(8,145,178,0.18) 0%, transparent 70%)',
  battle:          'radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.14) 0%, transparent 70%)',
};

const PHASE_LABELS: Record<string, string> = {
  question:'问题阶段', resonance:'共鸣阶段', card_generation:'生成卡牌', battle:'战斗阶段',
};

type EffectEntry = { type:'damage'|'heal'|'cost'|'resonate'; delta:number; key:number };
type EffectsMap  = Record<string, EffectEntry[]>;

// ─── Animation detection ──────────────────────────────────────────────────────

function useGameAnimations(players:Player[]|undefined): EffectsMap {
  const prevRef = useRef<Player[]>([]);
  const [effects, setEffects] = useState<EffectsMap>({});
  const keyRef = useRef(0);
  useEffect(()=>{
    if(!players||players.length===0) return;
    const prev = prevRef.current;
    if(prev.length===0){ prevRef.current=players; return; }
    const ne: EffectsMap = {};
    players.forEach(curr=>{
      const p = prev.find(x=>x.id===curr.id); if(!p) return;
      const fx:EffectEntry[]=[];
      const hD=curr.hp-p.hp;
      if(hD<0) fx.push({type:'damage',delta:hD,key:keyRef.current++});
      if(hD>0) fx.push({type:'heal',delta:hD,key:keyRef.current++});
      if(curr.cost-p.cost>0) fx.push({type:'cost',delta:curr.cost-p.cost,key:keyRef.current++});
      if(curr.resonance_with.length>p.resonance_with.length) fx.push({type:'resonate',delta:1,key:keyRef.current++});
      if(fx.length) ne[curr.id]=fx;
    });
    if(Object.keys(ne).length){
      setEffects(ne);
      // Trigger sounds for detected events
      const allFx = Object.values(ne).flat();
      if(allFx.some(e=>e.type==='damage')) playDamage();
      else if(allFx.some(e=>e.type==='heal')) playHeal();
      if(allFx.some(e=>e.type==='resonate')) playResonate();
      const t=setTimeout(()=>setEffects({}),1800);
      prevRef.current=players;
      return ()=>clearTimeout(t);
    }
    prevRef.current=players;
  },[players]);
  return effects;
}

// ─── Ambient particles ────────────────────────────────────────────────────────

function AmbientParticles({ phase, players }:{ phase:string|null; players:Player[] }) {
  const particles = useMemo(()=>Array.from({length:28},(_,i)=>{
    const groups = players.map(p=>p.group||'IN');
    const g = groups[i%Math.max(groups.length,1)] || 'IN';
    return {
      id:i, x:Math.random()*100, y:Math.random()*100,
      size:Math.random()*3+1.5,
      dur:Math.random()*10+7,
      delay:Math.random()*6,
      oy:Math.random()*40-20,
      color: GROUP_PARTICLE[g],
    };
  }),[players.length]); // eslint-disable-line

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Phase atmosphere */}
      <motion.div animate={{ opacity:[0.6,1,0.6] }} transition={{repeat:Infinity,duration:4}}
        style={{background: PHASE_BG[phase??''] ?? ''}}
        className="absolute inset-0 transition-all duration-1000" />
      {/* Floating dots */}
      {particles.map(p=>(
        <motion.div key={p.id}
          style={{left:`${p.x}%`,top:`${p.y}%`,width:p.size,height:p.size,background:p.color,borderRadius:'50%'}}
          animate={{y:[0,p.oy,0],opacity:[0.08,0.35,0.08]}}
          transition={{duration:p.dur,delay:p.delay,repeat:Infinity,ease:'easeInOut'}} />
      ))}
      {/* Vignette */}
      <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)'}} />
    </div>
  );
}

// ─── Phase announcement overlay ───────────────────────────────────────────────

function PhaseAnnouncement({ text }:{ text:string|null }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{scale:0.5,opacity:0}} animate={{scale:1,opacity:1}}
            exit={{scale:1.6,opacity:0}} transition={{duration:0.45,type:'spring',stiffness:200}}>
            <div className="px-12 py-6 rounded-3xl border border-violet-500/40 bg-black/70 backdrop-blur-sm text-center">
              <motion.p animate={{opacity:[0.4,1,0.4]}} transition={{repeat:Infinity,duration:1}}
                className="text-violet-400 text-xs tracking-[0.3em] mb-2">PHASE</motion.p>
              <p className="text-4xl font-bold text-white tracking-wide">{text}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Round tracker ────────────────────────────────────────────────────────────

function RoundTracker({ round }:{ round:number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({length:5},(_,i)=>(
        <motion.div key={i}
          animate={i<round ? {scale:[1,1.3,1],opacity:1} : {opacity:0.25}}
          transition={i===round-1 ? {duration:0.4} : {}}
          className={`rounded-full ${i<round?'bg-violet-400':'bg-gray-700'}`}
          style={{width: i===round-1?10:6, height: i===round-1?10:6}} />
      ))}
      <span className="text-gray-600 text-xs ml-1">第{round}/5轮</span>
    </div>
  );
}

// ─── Win condition tracker ────────────────────────────────────────────────────

function WinConditions({ players, myId }:{ players:Player[]; myId:string }) {
  return (
    <div className="space-y-1.5 min-w-[120px]">
      <p className="text-gray-600 text-[10px] tracking-widest mb-2">胜利条件</p>
      {players.filter(p=>p.is_alive).slice(0,4).map(p=>{
        const pct = p.hp / 10;
        const grp = p.group||'IN';
        return (
          <div key={p.id} className="flex items-center gap-2">
            <span className={`text-[9px] w-14 truncate ${p.id===myId?'text-white font-bold':GROUP_TEXT[grp]}`}>{p.nickname}</span>
            <div className="flex-1 h-1 rounded-full bg-gray-800 overflow-hidden">
              <motion.div animate={{width:`${pct*100}%`}} transition={{duration:0.6,type:'spring'}}
                className="h-full rounded-full bg-emerald-500" />
            </div>
            <span className="text-gray-600 text-[9px] w-4 text-right">{p.hp}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Last action display ──────────────────────────────────────────────────────

function LastActionDisplay({ log }:{ log:{message:string;type:string}|null }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[48px]">
      <AnimatePresence mode="wait">
        {log ? (
          <motion.div key={log.message}
            initial={{opacity:0,y:8,scale:0.9}} animate={{opacity:1,y:0,scale:1}}
            exit={{opacity:0,y:-8,scale:0.9}} transition={{duration:0.3}}
            className={`px-4 py-2 rounded-xl border text-xs text-center max-w-xs ${
              log.type==='combat' ? 'border-orange-500/30 bg-orange-500/5 text-orange-300' :
              log.type==='info'   ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300' :
              'border-violet-500/20 bg-violet-500/5 text-violet-300'}`}>
            {log.message}
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{opacity:0}} animate={{opacity:1}}
            className="w-12 h-px bg-gray-800 rounded-full" />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Deck stack ───────────────────────────────────────────────────────────────

function DeckStack({ count }:{ count:number }) {
  const show = Math.min(count,4);
  return (
    <div className="relative" style={{width:28,height:38}}>
      {Array.from({length:show},(_,i)=>(
        <div key={i} className="absolute rounded-md border border-gray-700 bg-gray-800"
          style={{width:24,height:34,bottom:i*2,left:i*1,zIndex:i,
            boxShadow:'0 1px 3px rgba(0,0,0,0.5)'}}>
          <img src="/card-back.png" alt="" className="w-full h-full object-cover rounded-md opacity-80"
            onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
        </div>
      ))}
      {count>0&&<span className="absolute -top-2 -right-2 text-[9px] bg-gray-700 text-gray-400 rounded-full w-4 h-4 flex items-center justify-center z-10">{count}</span>}
    </div>
  );
}

// ─── Combat float ─────────────────────────────────────────────────────────────

function CombatFloat({ effects }:{ effects:EffectEntry[] }) {
  return (
    <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center gap-0.5">
      <AnimatePresence>
        {effects.map(fx=>{
          const color = fx.type==='damage'?'#f87171':fx.type==='heal'?'#34d399':fx.type==='resonate'?'#a78bfa':'#fb923c';
          const text  = fx.type==='damage'?`${fx.delta}`:fx.type==='heal'?`+${fx.delta}`:fx.type==='resonate'?'♦':'+代';
          return (
            <motion.div key={fx.key}
              initial={{opacity:0,y:0,scale:0.5}} animate={{opacity:[0,1,1,0],y:-40,scale:[0.5,1.3,1,0.8]}}
              transition={{duration:1.2,times:[0,0.2,0.7,1]}}
              style={{color,fontWeight:900,fontSize:22,textShadow:`0 0 12px ${color}`,letterSpacing:'-0.5px'}}
              className="absolute whitespace-nowrap drop-shadow-lg">
              {text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ mbti, group, isAlive, isCurrentTurn, isTarget, hasDamage, hasHeal, size='md' }:{
  mbti:string; group:string; isAlive:boolean; isCurrentTurn:boolean;
  isTarget:boolean; hasDamage:boolean; hasHeal:boolean; size?:'sm'|'md'|'lg';
}) {
  const controls = useAnimation();
  const dim = size==='lg'?'w-32 h-32':size==='md'?'w-24 h-24':'w-16 h-16';
  const radius = size==='lg'?'rounded-3xl':size==='md'?'rounded-2xl':'rounded-xl';

  useEffect(()=>{
    if(hasDamage) controls.start({x:[0,-8,8,-7,7,-4,4,-2,2,0],transition:{duration:0.5}});
    if(hasHeal)   controls.start({scale:[1,1.12,0.96,1.04,1],transition:{duration:0.5}});
  },[hasDamage,hasHeal,controls]);

  return (
    <motion.div
      animate={isCurrentTurn
        ? {y:[0,-4,0], transition:{duration:2,repeat:Infinity,ease:'easeInOut'}}
        : isAlive
        ? {y:[0,-2,0], transition:{duration:3+Math.random()*2,repeat:Infinity,ease:'easeInOut',delay:Math.random()*2}}
        : {opacity:0.4}}
      className="relative">
      {/* Glow auras */}
      {isCurrentTurn&&(
        <motion.div animate={{opacity:[0.3,0.7,0.3],scale:[1,1.1,1]}} transition={{repeat:Infinity,duration:1.5}}
          className={`absolute -inset-3 ${radius} blur-xl -z-10`}
          style={{background:`radial-gradient(circle, ${GROUP_PARTICLE[group]}60, transparent)`}} />
      )}
      {isTarget&&<motion.div animate={{scale:[1,1.04,1]}} transition={{repeat:Infinity,duration:0.7}}
        className={`absolute -inset-1 ${radius} border-2 border-amber-400/90`} />}

      {/* Main image */}
      <motion.div animate={controls}
        className={`${dim} ${radius} overflow-hidden border-2 relative
          ${isTarget?'border-amber-400':GROUP_BORDER[group]}
          ${!isAlive?'grayscale':''}
          ${isCurrentTurn?`shadow-xl ${GROUP_GLOW[group]}`:'shadow-md'}`}>
        <AnimatePresence>
          {hasDamage&&<motion.div key="dmg"
            initial={{opacity:0.9}} animate={{opacity:0}} transition={{duration:0.7}}
            className="absolute inset-0 bg-red-500/70 z-10 pointer-events-none" />}
          {hasHeal&&<motion.div key="heal"
            initial={{opacity:0.8}} animate={{opacity:0}} transition={{duration:0.7}}
            className="absolute inset-0 bg-emerald-400/60 z-10 pointer-events-none" />}
        </AnimatePresence>
        <img src={`/characters/${mbti}.png`} alt={mbti}
          className="w-full h-full object-cover object-top"
          onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
        {/* HP danger pulse */}
      </motion.div>

      {isCurrentTurn&&(
        <motion.div animate={{scale:[1,1.5,1],opacity:[0.7,1,0.7]}} transition={{repeat:Infinity,duration:0.8}}
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 shadow-lg shadow-amber-500/60 z-20" />
      )}
    </motion.div>
  );
}

// ─── Opponent hand fan (face-down cards) ─────────────────────────────────────

function OpponentHandFan({ count }: { count: number }) {
  const prevCountRef = useRef(count);
  const [flyingCard, setFlyingCard] = useState(false);

  useEffect(() => {
    if (count < prevCountRef.current) {
      // A card was played — trigger the fly animation briefly
      setFlyingCard(true);
      setTimeout(() => setFlyingCard(false), 600);
    }
    prevCountRef.current = count;
  }, [count]);

  const show = Math.min(count, 8);
  const cardW = 36; // px width of each card back
  const spread = show > 5 ? 12 : 18; // horizontal spread per card

  return (
    <div className="relative flex justify-center mt-2 mb-1"
      style={{ height: 70, width: Math.max(70, show * spread + cardW) }}>
      <AnimatePresence>
        {Array.from({ length: show }).map((_, i) => {
          const offset = i - (show - 1) / 2;
          const rotate = offset * 7;
          const tx = offset * spread;
          return (
            <motion.div
              key={i}
              style={{ rotate, x: tx, zIndex: i, position: 'absolute', bottom: 0,
                transformOrigin: 'bottom center' }}
              initial={{ opacity: 0, y: -20, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, x: tx, scale: 0.5, rotate: rotate + 20,
                transition: { duration: 0.35, ease: 'easeIn' } }}
              transition={{ delay: i * 0.03, type: 'spring', stiffness: 380, damping: 26 }}
              whileHover={{ y: -8, scale: 1.08, zIndex: 20 }}
              className="w-9 h-[52px] rounded-md overflow-hidden shadow-lg"
              // Subtle highlight on top card (last one)
            >
              <div className={`w-full h-full border rounded-md overflow-hidden
                ${i === show - 1 ? 'border-gray-600' : 'border-gray-700/60'}`}>
                <img src="/card-back.png" alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* "Card played" flying indicator */}
      <AnimatePresence>
        {flyingCard && (
          <motion.div
            initial={{ opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 }}
            animate={{ opacity: 0, y: -80, x: 20, scale: 0.6, rotate: 25 }}
            exit={{}}
            transition={{ duration: 0.55, ease: 'easeIn' }}
            className="absolute bottom-0 w-7 h-10 rounded-md overflow-hidden border border-gray-600 shadow-xl z-30 pointer-events-none">
            <img src="/card-back.png" alt="" className="w-full h-full object-cover" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card count badge when > 5 */}
      {count > 5 && (
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center z-30">
          <span className="text-[9px] text-gray-400 font-bold">{count}</span>
        </motion.div>
      )}

      {count === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-800 text-[10px]">无牌</span>
        </motion.div>
      )}
    </div>
  );
}

// ─── Opponent seat ────────────────────────────────────────────────────────────

function OpponentSeat({ player, isCurrentTurn, isTarget, selectable, onSelect,
  showAnswer, myResonanceWith, alreadyResonated, onResonate, effects, onRegister }:{
  player:Player; isCurrentTurn:boolean; isTarget:boolean; selectable:boolean;
  onSelect:()=>void; showAnswer:boolean; myResonanceWith:string[];
  alreadyResonated:boolean; onResonate:()=>void; effects:EffectEntry[];
  onRegister:(el:HTMLElement|null)=>void;
}) {
  const group = player.group||'IN';
  const hasDamage  = effects.some(e=>e.type==='damage');
  const hasHeal    = effects.some(e=>e.type==='heal');
  const hasResonate= effects.some(e=>e.type==='resonate');
  const isLowHp    = player.hp<=3 && player.is_alive;

  return (
    <motion.div
      initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}}
      whileHover={selectable && player.is_alive ? { scale: 1.06, y: -4 } : {}}
      onClick={selectable?onSelect:undefined}
      className={`relative flex flex-col items-center w-44 ${selectable?'cursor-pointer':''}`}>

      {/* Selectable pulse ring — very obvious target hint */}
      {selectable && player.is_alive && !isTarget && (
        <motion.div
          animate={{ opacity:[0.5,1,0.5], scale:[1,1.06,1] }}
          transition={{ repeat:Infinity, duration:0.8 }}
          className="absolute -inset-2 rounded-2xl border-2 border-amber-400 pointer-events-none z-20"
          style={{ boxShadow:'0 0 20px rgba(251,191,36,0.6)' }}
        />
      )}
      {selectable && player.is_alive && (
        <motion.div
          animate={{ opacity:[0.3,0.7,0.3] }}
          transition={{ repeat:Infinity, duration:0.8 }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 whitespace-nowrap z-30">
          点击选择目标
        </motion.div>
      )}

      <CombatFloat effects={effects} />

      {/* Resonate ring burst */}
      {hasResonate&&(
        <motion.div initial={{opacity:1,scale:0.8}} animate={{opacity:0,scale:2.5}}
          transition={{duration:1.2}}
          className="absolute inset-0 rounded-2xl border-2 border-violet-400/80 pointer-events-none" />
      )}
      {/* Low HP warning */}
      {isLowHp&&(
        <motion.div animate={{opacity:[0.3,0.7,0.3]}} transition={{repeat:Infinity,duration:0.7}}
          className="absolute -inset-1 rounded-2xl border border-red-500/60 pointer-events-none" />
      )}

      {/* Avatar + side stats */}
      <div className="flex items-start gap-2 w-full">
        {/* Ref anchored to avatar container for resonance line accuracy */}
        <div ref={(el) => onRegister(el as HTMLElement | null)}>
          <Avatar mbti={player.mbti||'?'} group={group} isAlive={player.is_alive}
            isCurrentTurn={isCurrentTurn} isTarget={isTarget}
            hasDamage={hasDamage} hasHeal={hasHeal} />
        </div>

        {/* Right-side stat bars — same height as avatar (h-24 = 96px) */}
        <div className="flex flex-col justify-between flex-1 min-w-0" style={{height:96}}>
          {/* HP */}
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-gray-600 text-[10px]">HP</span>
              <motion.span key={player.hp}
                initial={{scale:1.6,color:hasDamage?'#f87171':hasHeal?'#34d399':'#9ca3af'}}
                animate={{scale:1,color:'#9ca3af'}} transition={{duration:0.4}}
                className="text-[10px] font-bold">{player.hp}</motion.span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden w-full">
              <motion.div animate={{width:`${(player.hp/10)*100}%`}} transition={{duration:0.5,type:'spring'}}
                className={`h-full rounded-full ${isLowHp?'bg-red-500':hasDamage?'bg-red-400':'bg-emerald-500'}`} />
            </div>
          </div>
          {/* Cost */}
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-gray-600 text-[10px]">代价</span>
              <span className="text-[10px] text-gray-500">{player.cost}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden w-full">
              <motion.div animate={{width:`${(player.cost/10)*100}%`}} transition={{duration:0.5,type:'spring'}}
                className="h-full rounded-full bg-red-500/70" />
            </div>
          </div>
          {/* Exposure */}
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-gray-600 text-[10px]">公开</span>
              <span className="text-[10px] text-gray-500">{player.exposure}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden w-full">
              <motion.div animate={{width:`${(player.exposure/10)*100}%`}} transition={{duration:0.5,type:'spring'}}
                className="h-full rounded-full bg-blue-500/70" />
            </div>
          </div>
          {/* Resonance */}
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-gray-600 text-[10px]">共鸣</span>
              <span className="text-[10px] text-violet-400">{player.resonance}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden w-full">
              <motion.div animate={{width:`${(player.resonance/10)*100}%`}} transition={{duration:0.5,type:'spring'}}
                className="h-full rounded-full bg-violet-500/70" />
            </div>
          </div>
        </div>
      </div>

      {/* Fan of face-down card backs */}
      <OpponentHandFan count={player.hand?.length??0} />

      <div className="mt-1 text-center">
        <p className="text-white text-sm font-semibold truncate max-w-[9rem]">{player.nickname}</p>
        <p className={`text-xs ${GROUP_TEXT[group]}`}>{player.mbti||'?'}</p>
      </div>

      {/* Resonance answer */}
      {showAnswer&&player.answer_visibility==='public'&&player.current_answer&&(
        <motion.div initial={{opacity:0,y:6,scale:0.9}} animate={{opacity:1,y:0,scale:1}}
          className="mt-2 p-2 rounded-lg bg-gray-900/90 border border-gray-700 w-full">
          <p className="text-gray-300 text-xs line-clamp-3 leading-snug">{player.current_answer}</p>
          {!alreadyResonated?(
            <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
              onClick={e=>{e.stopPropagation();onResonate();}}
              className="mt-1 text-violet-400 hover:text-violet-300 text-xs transition-colors">
              我也是 ♦
            </motion.button>
          ):<p className="mt-1 text-violet-400 text-xs">♦ 已共鸣</p>}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── My seat ─────────────────────────────────────────────────────────────────

function MySeat({ me, isMyTurn, effects, onRegister }:{ me:Player; isMyTurn:boolean; effects:EffectEntry[]; onRegister:(el:HTMLElement|null)=>void }) {
  const group = me.group||'IN';
  const hasDamage  = effects.some(e=>e.type==='damage');
  const hasHeal    = effects.some(e=>e.type==='heal');
  const isLowHp    = me.hp<=3 && me.is_alive;

  return (
    <div className="flex-shrink-0 flex flex-col items-center w-28 relative">
      <CombatFloat effects={effects} />

      {isMyTurn&&(
        <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}}
          className="text-xs text-amber-400 mb-1 font-bold tracking-wide">▶ 你的回合</motion.div>
      )}

      {/* Ref on avatar only for accurate resonance line anchoring */}
      <div ref={(el) => onRegister(el as HTMLElement | null)}>
        <Avatar mbti={me.mbti||'?'} group={group} isAlive={me.is_alive}
          isCurrentTurn={isMyTurn} isTarget={false}
          hasDamage={hasDamage} hasHeal={hasHeal} size="lg" />
      </div>

      <p className="text-white text-xs font-bold mt-1.5 truncate max-w-[8rem]">{me.nickname}</p>
      <p className={`text-[10px] ${GROUP_TEXT[group]}`}>{me.mbti}</p>
    </div>
  );
}

// ─── Card fan ─────────────────────────────────────────────────────────────────

function CardFan({ cards, selectedId, onSelect, disabled, playingCardId }:{
  cards:Card[]; selectedId:string|null; onSelect:(c:Card)=>void;
  disabled:boolean; playingCardId:string|null;
}) {
  const total = cards.length;
  // Overlap so all cards always fit in one row
  // Card width ~160px (w-40). Allow up to ~700px total visible width.
  const CARD_W = 160;
  const overlapPx = total > 1 ? Math.min(0, Math.floor((700 - total * CARD_W) / (total - 1))) : 0;

  return (
    <div className="flex items-end justify-center" style={{ overflow: 'visible' }}>
      <AnimatePresence initial={false}>
        {cards.map((card, i) => {
          const isSelected = selectedId === card.id;
          const isPlaying  = playingCardId === card.id;
          return (
            <motion.div key={card.id}
              initial={
                card.id?.startsWith('ai_') || card.id?.startsWith('hidden_')
                  ? { opacity: 0, y: -80, scale: 0.5, rotate: -15 }  // AI cards drop from above with spin
                  : { opacity: 0, y: 40, scale: 0.7 }
              }
              animate={isPlaying
                ? { y: -300, opacity: 0, scale: 1.2, rotate: 10 }
                : { y: isSelected ? -24 : 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.6, transition: { duration: 0.2 } }}
              whileHover={!isPlaying ? {
                y: (isSelected ? -24 : 0) - 20,
                scale: disabled ? 1.03 : 1.07,
                filter: disabled ? 'brightness(1.05)' : 'brightness(1.2)',
                zIndex: 60,
              } : {}}
              onHoverStart={() => !disabled && !isPlaying && playCardHover()}
              onClick={() => !disabled && !isPlaying && onSelect(card)}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              style={{
                zIndex: isSelected ? 50 : i,
                marginLeft: i === 0 ? 0 : overlapPx,
                flexShrink: 0,
              }}
              className={`${disabled || isPlaying ? 'cursor-default' : 'cursor-pointer'} relative`}>
              <CardComponent card={card} selected={isSelected} compact={total > 7} />
            </motion.div>
          );
        })}
      </AnimatePresence>
      {cards.length === 0 && (
        <p className="text-gray-800 text-sm py-4">手牌为空</p>
      )}
    </div>
  );
}

// ─── Sprite idle component ────────────────────────────────────────────────────

function SpriteIdle({ mbti, size = 200, group = 'IN' }: {
  mbti: string; size?: number; group?: string;
}) {
  const glowColors: Record<string, string> = {
    IN: '#7c3aed', IS: '#0891b2', EN: '#d97706', ES: '#dc2626',
  };
  const glow = glowColors[group] ?? '#7c3aed';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow aura */}
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.12, 1] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-3xl blur-2xl -z-10"
        style={{ background: `radial-gradient(circle, ${glow}50, transparent 70%)` }}
      />
      {/* Shadow */}
      <motion.div
        animate={{ scaleX: [1, 0.85, 1], opacity: [0.3, 0.15, 0.3] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-3 rounded-full blur-md"
        style={{ background: glow }}
      />
      {/* Sprite — try /sprites/MBTI.png (3-frame sheet), fallback to /characters/MBTI.png */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        className="w-full h-full rounded-3xl overflow-hidden border-2"
        style={{ borderColor: glow + '60' }}>
        <div
          className="sprite-idle-anim w-full h-full"
          style={{ backgroundImage: `url('/sprites/${mbti}.png')` }}
          onError={undefined}
        />
        {/* Fallback: show character image if sprite doesn't exist (via CSS bg error we use a wrapper img) */}
        <img
          src={`/characters/${mbti}.png`}
          alt={mbti}
          className="w-full h-full object-cover object-top absolute inset-0"
          style={{ display: 'none' }}
          id={`sprite-fallback-${mbti}`}
        />
      </motion.div>
    </div>
  );
}

// Try sprite sheet, fall back to character image
function SpriteOrCharacter({ mbti, size = 200, group = 'IN', cropTop = false }: {
  mbti: string; size?: number; group?: string; cropTop?: boolean;
}) {
  const [useFallback, setUseFallback] = useState(false);
  const [frame, setFrame] = useState(0);
  const FRAMES = 3;
  const glow = ({ IN:'#7c3aed', IS:'#0891b2', EN:'#d97706', ES:'#dc2626' } as Record<string,string>)[group] ?? '#7c3aed';

  // Portrait dimensions: show upper 60% of the character image
  const w = size;
  const h = size;

  useEffect(() => {
    const img = new Image();
    img.onerror = () => setUseFallback(true);
    img.src = `/sprites/${mbti}.png`;
  }, [mbti]);

  useEffect(() => {
    if (useFallback) return;
    const id = setInterval(() => setFrame(f => (f + 1) % FRAMES), 380);
    return () => clearInterval(id);
  }, [useFallback]);

  return (
    <div className="relative" style={{ width: w, height: h }}>
      <motion.div animate={{ opacity:[0.3,0.7,0.3], scale:[1,1.12,1] }}
        transition={{ repeat:Infinity, duration:2.4, ease:'easeInOut' }}
        className="absolute inset-0 rounded-3xl blur-2xl -z-10"
        style={{ background:`radial-gradient(circle, ${glow}50, transparent 70%)` }}
      />
      <motion.div animate={{ scaleX:[1,0.82,1], opacity:[0.25,0.1,0.25] }}
        transition={{ repeat:Infinity, duration:2.4, ease:'easeInOut' }}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2/3 h-3 rounded-full blur-md"
        style={{ background: glow }}
      />
      <motion.div animate={{ y:[0,-10,0] }}
        transition={{ repeat:Infinity, duration:2.4, ease:'easeInOut' }}
        className="w-full h-full rounded-3xl overflow-hidden border-2"
        style={{ borderColor: glow+'70', boxShadow:`0 0 32px ${glow}40` }}>
        {!useFallback ? (
          // Sprite sheet: show frame, cropped to portrait if needed
          <div style={{
            width: '100%', height: '100%',
            backgroundImage: `url('/sprites/${mbti}.png')`,
            // Scale each frame to fill the width, maintain aspect
            backgroundSize: `${w * FRAMES}px ${w}px`,
            // Horizontal: select frame; Vertical: show from top
            backgroundPosition: `${-frame * w}px 0px`,
            backgroundRepeat: 'no-repeat',
          }} />
        ) : (
          // Character image: object-top so head is always visible
          <img src={`/characters/${mbti}.png`} alt={mbti}
            className="w-full h-full object-cover"
            style={{ objectPosition: 'top center' }} />
        )}
      </motion.div>
    </div>
  );
}

// ─── Discard pile icon ───────────────────────────────────────────────────────

function DiscardPileIcon({ discard, onView }: { discard: Card[]; onView: () => void }) {
  const top = discard[discard.length - 1];
  const count = discard.length;

  return (
    <motion.button
      onClick={onView}
      whileHover={count > 0 ? { scale: 1.06, y: -4 } : {}}
      whileTap={count > 0 ? { scale: 0.96 } : {}}
      className={`flex-shrink-0 flex flex-col items-center gap-1 ${count > 0 ? 'cursor-pointer' : 'cursor-default opacity-40'}`}
      title={count > 0 ? `弃牌堆（${count}张）—— 点击查看` : '弃牌堆为空'}>

      {/* Stack visual */}
      <div className="relative w-16 h-[88px]">
        {/* Shadow cards behind */}
        {count > 2 && <div className="absolute inset-0 rounded-lg border border-gray-700 bg-gray-800/60" style={{ transform: 'rotate(-4deg) translate(-2px, 2px)' }} />}
        {count > 1 && <div className="absolute inset-0 rounded-lg border border-gray-700 bg-gray-800/70" style={{ transform: 'rotate(-2deg) translate(-1px, 1px)' }} />}

        {/* Top card */}
        <AnimatePresence mode="wait">
          {top ? (
            <motion.div key={top.id}
              initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: -1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 rounded-lg overflow-hidden border border-gray-600 shadow-lg">
              <img
                src={top.mbti ? `/characters/${top.mbti}.png` : `/card-art/${top.id}.png`}
                alt={top.name}
                className="w-full h-full object-cover object-top"
                onError={e => { (e.target as HTMLImageElement).src = `/card-art/${top.type}.png`; }}
              />
              {/* Card name overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1 pb-1 pt-3">
                <p className="text-white text-[8px] font-bold truncate text-center">{top.name}</p>
              </div>
            </motion.div>
          ) : (
            <div className="absolute inset-0 rounded-lg border-2 border-dashed border-gray-800 flex items-center justify-center">
              <span className="text-gray-700 text-lg">♻</span>
            </div>
          )}
        </AnimatePresence>

        {/* Count badge */}
        {count > 0 && (
          <motion.div
            key={count}
            initial={{ scale: 1.5 }} animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center z-10">
            <span className="text-gray-300 text-[9px] font-bold">{count}</span>
          </motion.div>
        )}
      </div>

      <span className="text-gray-700 text-[9px]">弃牌堆</span>
    </motion.button>
  );
}

// ─── Center character (battle phase spotlight) ───────────────────────────────

function CenterCharacter({ mbti, group, size = 160 }: { mbti: string; group: string; size?: number }) {
  const glow = ({ IN:'#7c3aed', IS:'#0891b2', EN:'#d97706', ES:'#dc2626' } as Record<string,string>)[group] ?? '#7c3aed';
  const border = ({ IN:'border-violet-500/60', IS:'border-cyan-500/60', EN:'border-amber-500/60', ES:'border-red-500/60' } as Record<string,string>)[group] ?? 'border-violet-500/60';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow aura */}
      <motion.div animate={{ opacity:[0.3,0.7,0.3], scale:[1,1.15,1] }}
        transition={{ repeat:Infinity, duration:2.5, ease:'easeInOut' }}
        className="absolute inset-0 rounded-3xl blur-2xl -z-10"
        style={{ background:`radial-gradient(circle, ${glow}55, transparent 70%)` }}
      />
      {/* Ground shadow */}
      <motion.div animate={{ scaleX:[1,0.75,1], opacity:[0.3,0.1,0.3] }}
        transition={{ repeat:Infinity, duration:2.5, ease:'easeInOut' }}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3/4 h-3 rounded-full blur-md"
        style={{ background: glow }}
      />
      {/* Floating character */}
      <motion.div animate={{ y:[0,-12,0] }}
        transition={{ repeat:Infinity, duration:2.5, ease:'easeInOut' }}
        className={`w-full h-full rounded-3xl overflow-hidden border-2 ${border}`}
        style={{ boxShadow:`0 0 40px ${glow}50` }}>
        <img
          src={`/characters/${mbti}.png`}
          alt={mbti}
          className="w-full h-full object-cover"
          style={{ objectPosition:'top center' }}
          onError={e => { (e.target as HTMLImageElement).style.opacity='0'; }}
        />
      </motion.div>
    </div>
  );
}

// ─── Battle center ────────────────────────────────────────────────────────────

function BattleCenter({ game, me, isMyTurn, error, lastLog }:{
  game:GameRoom; me:Player; isMyTurn:boolean; error:string;
  lastLog:{message:string;type:string}|null;
}) {
  const cur = game.players.find(p=>p.id===game.current_turn_player_id);
  return (
    <div className="text-center px-4 space-y-2">

      {/* Current player spotlight */}
      <AnimatePresence mode="wait">
        {cur && (
          <motion.div key={cur.id}
            initial={{opacity:0,scale:0.8,y:20}} animate={{opacity:1,scale:1,y:0}}
            exit={{opacity:0,scale:0.8,y:-20}} transition={{type:'spring',stiffness:240,damping:22}}
            className="flex flex-col items-center gap-2">

            {/* Turn label above */}
            {isMyTurn ? (
              <motion.div
                animate={{boxShadow:['0 0 0px #f59e0b00','0 0 20px #f59e0b60','0 0 0px #f59e0b00']}}
                transition={{repeat:Infinity,duration:1.8}}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-sm mb-1">
                <motion.span animate={{rotate:[0,20,-20,0]}} transition={{repeat:Infinity,duration:1.5}}>⚔️</motion.span>
                你的回合
              </motion.div>
            ) : (
              <motion.div animate={{opacity:[0.6,1,0.6]}} transition={{repeat:Infinity,duration:1.2}}
                className="text-gray-400 text-sm mb-1">
                {cur.nickname} 正在出牌...
              </motion.div>
            )}

            {/* Big character — single image with float animation, no frame jumps */}
            <CenterCharacter mbti={cur.mbti||'INTJ'} group={cur.group||'IN'} size={200} />

            {/* Name + MBTI */}
            <div>
              <p className="text-white font-bold text-base">{cur.nickname}</p>
              <p className={`text-sm ${GROUP_TEXT[cur.group||'IN']}`}>{cur.mbti}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LastActionDisplay log={lastLog} />

      {/* Player turn status */}
      <div className="flex flex-wrap justify-center gap-2">
        {game.players.map((p,i)=>(
          <motion.div key={p.id}
            initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={{delay:i*0.05}}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all
              ${!p.is_alive?'opacity-25 border-gray-800 text-gray-700':
                game.current_turn_player_id===p.id?'border-amber-500/60 bg-amber-500/10 text-amber-300':
                p.battle_turn_done?'border-gray-700 text-gray-600 bg-gray-800/20':
                'border-gray-800 text-gray-500'}`}>
            <motion.div
              animate={game.current_turn_player_id===p.id&&p.is_alive
                ?{scale:[1,1.5,1],opacity:[0.5,1,0.5]}:{}}
              transition={{repeat:Infinity,duration:0.9}}
              className={`w-1.5 h-1.5 rounded-full ${
                !p.is_alive?'bg-gray-700':
                p.battle_turn_done?'bg-emerald-700':
                game.current_turn_player_id===p.id?'bg-amber-400':'bg-gray-600'}`} />
            {p.nickname}
            {p.battle_turn_done&&p.is_alive&&<span className="text-emerald-600 text-[10px]">✓</span>}
          </motion.div>
        ))}
      </div>
      {error&&<motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-red-400 text-sm">{error}</motion.p>}
    </div>
  );
}

// ─── Question phase ───────────────────────────────────────────────────────────

function QuestionPhase({ question, answer, onAnswerChange, hasAnswered, onSubmit,
  loading, players, myId, isHost, onAdvance }:{
  question:string; answer:string; onAnswerChange:(v:string)=>void;
  hasAnswered:boolean; onSubmit:(v:'public'|'private'|'skipped')=>void;
  loading:boolean; players:Player[]; myId:string; isHost:boolean; onAdvance:()=>void;
}) {
  const done  = players.filter(p=>p.is_alive&&p.answer_visibility!==null).length;
  const total = players.filter(p=>p.is_alive).length;
  return (
    <div className="px-4">
      <motion.div className="text-center mb-5" initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}>
        <p className="text-violet-400 text-xs tracking-widest mb-2">这一轮的问题</p>
        <h2 className="text-xl font-bold text-white leading-relaxed">{question}</h2>
      </motion.div>
      <AnimatePresence mode="wait">
        {!hasAnswered?(
          <motion.div key="input" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-3">
            <textarea value={answer} onChange={e=>onAnswerChange(e.target.value)}
              placeholder="写下你的回答..." rows={3}
              className="w-full px-4 py-3 rounded-xl bg-gray-900/80 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none text-sm" />
            <div className="grid grid-cols-3 gap-2">
              {([
                {v:'public'  as const,label:'公开',sub:'公开度+2',cls:'bg-violet-700 hover:bg-violet-600 text-white'},
                {v:'private' as const,label:'私密',sub:'仅AI可见',cls:'bg-gray-700 hover:bg-gray-600 text-white'},
                {v:'skipped' as const,label:'跳过',sub:'无卡牌',  cls:'bg-gray-800 hover:bg-gray-700 text-gray-400'},
              ]).map(({v,label,sub,cls})=>(
                <motion.button key={v} whileHover={{scale:1.04}} whileTap={{scale:0.95}}
                  onClick={()=>onSubmit(v)} disabled={loading||(v!=='skipped'&&!answer.trim())}
                  className={`py-2.5 rounded-xl ${cls} disabled:opacity-40 text-sm font-medium`}>
                  {label}<span className="block text-xs opacity-60">{sub}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ):(
          <motion.div key="done" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="text-center py-4">
            <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:400}}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-3">✓ 已提交</motion.div>
            {/* Progress bar */}
            <div className="flex items-center gap-2 justify-center">
              <div className="w-32 h-1 rounded-full bg-gray-800 overflow-hidden">
                <motion.div animate={{width:`${(done/total)*100}%`}} transition={{duration:0.4}}
                  className="h-full bg-violet-500 rounded-full" />
              </div>
              <span className="text-gray-600 text-xs">{done}/{total}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isHost&&(
        <div className="mt-4 text-center">
          <button onClick={onAdvance} disabled={loading}
            className="text-gray-700 hover:text-gray-400 text-xs underline transition-colors">跳过等待 →</button>
        </div>
      )}
    </div>
  );
}

// ─── Resonance phase ──────────────────────────────────────────────────────────

function ResonancePhase({ players, myId, myResonanceWith, onResonate, isHost, onAdvance, loading }:{
  players:Player[]; myId:string; myResonanceWith:string[];
  onResonate:(id:string)=>void; isHost:boolean; onAdvance:()=>void; loading:boolean;
}) {
  const pub = players.filter(p=>p.id!==myId&&p.answer_visibility==='public');
  return (
    <div className="px-4">
      <div className="text-center mb-4">
        <p className="text-violet-400 text-xs tracking-widest mb-1">共鸣阶段</p>
        <p className="text-gray-500 text-sm">有共鸣就点「我也是」</p>
      </div>
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {pub.length===0&&<p className="text-center text-gray-700 py-4">这一轮没有公开回答</p>}
        <AnimatePresence>
          {pub.map((p,i)=>{
            const resonated = myResonanceWith.includes(p.id);
            return (
              <motion.div key={p.id} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}}
                transition={{delay:i*0.08}}
                className="p-3 rounded-xl bg-gray-900/70 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img src={`/characters/${p.mbti}.png`} alt="" className="w-6 h-6 rounded-full object-cover object-top bg-gray-800"
                      onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
                    <span className="text-gray-200 text-sm font-medium">{p.nickname}</span>
                    <span className="text-gray-600 text-xs">{p.mbti}</span>
                  </div>
                  <motion.button onClick={()=>onResonate(p.id)} disabled={resonated}
                    whileHover={!resonated?{scale:1.08}:{}} whileTap={!resonated?{scale:0.94}:{}}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      resonated?'bg-violet-500/20 text-violet-300 border-violet-500/30':
                      'bg-gray-800 hover:bg-violet-500/15 text-gray-400 hover:text-violet-300 border-gray-700'}`}>
                    {resonated?'♦ 已共鸣':'我也是'}
                  </motion.button>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{p.current_answer}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {isHost&&(
        <div className="mt-4 text-center">
          <button onClick={onAdvance} disabled={loading}
            className="text-gray-700 hover:text-gray-400 text-xs underline transition-colors">结束共鸣，生成卡牌 →</button>
        </div>
      )}
    </div>
  );
}

// ─── Card interaction projectile system ──────────────────────────────────────

type InteractionType = 'damage' | 'heal' | 'steal' | 'shield' | 'resonate' | 'view' | 'discard' | 'special';

interface Interaction {
  id: number;
  type: InteractionType;
  fromId: string;
  toId?: string;
}

const EFFECT_TO_INTERACTION: Record<string, InteractionType> = {
  damage_2:'damage', damage_3:'damage', damage_4:'damage', damage_5:'damage',
  fixed_damage_2:'damage', damage_3_drawback:'damage', gamble_damage:'damage',
  coin_flip_damage:'damage', pierce_damage_3:'damage', crisis_instinct:'damage',
  pressure_damage:'damage', exposure_to_damage:'damage', cost_to_damage:'damage',
  resonance_damage:'damage', cancel_contradictory:'damage', rule_enforcement:'damage',
  heal_2:'heal', heal_3:'heal', inner_monologue_heal:'heal', heal_over_time_2:'heal',
  draw_1_heal_1:'heal', social_heal:'heal', collective_benefit:'heal',
  shield_1:'shield', shield_2x1:'shield', shield_3:'shield', immunity_round:'shield',
  resonance_immunity:'shield', cancel_next_effect_on_self:'shield',
  build_resonance:'resonate', force_resonance:'resonate', mass_resonance:'resonate',
  random_resonance:'resonate', collective_will:'resonate',
  view_hand_card:'view', view_all_hand:'view', view_discard:'view', view_hidden_skill:'view',
  retrieve_any_discard:'steal', copy_last_card:'steal', rule_audit:'steal',
  force_discard:'discard', reflect_last_card:'discard', redirect_to_caster:'discard',
  override_next_card:'special', declare_victory_condition:'special', foresight:'special',
  long_term_trap:'special', record_keeper:'special', silent_witness:'special',
  spotlight:'special', random_card:'special', skip_for_boost:'special',
  declare_rule:'special', force_play:'special', extra_action:'special',
};

const INTERACTION_VISUAL: Record<InteractionType, { emoji: string; color: string; trail: string }> = {
  damage:  { emoji:'⚔',  color:'#ef4444', trail:'rgba(239,68,68,0.4)' },
  heal:    { emoji:'✦',  color:'#10b981', trail:'rgba(16,185,129,0.4)' },
  steal:   { emoji:'📄', color:'#a78bfa', trail:'rgba(167,139,250,0.4)' },
  shield:  { emoji:'🛡', color:'#60a5fa', trail:'rgba(96,165,250,0.4)' },
  resonate:{ emoji:'♦',  color:'#c084fc', trail:'rgba(192,132,252,0.4)' },
  view:    { emoji:'👁', color:'#67e8f9', trail:'rgba(103,232,249,0.4)' },
  discard: { emoji:'💨', color:'#fb923c', trail:'rgba(251,146,60,0.4)' },
  special: { emoji:'✦',  color:'#fbbf24', trail:'rgba(251,191,36,0.4)' },
};

function InteractionLayer({ interactions, seatRefs }:{
  interactions: Interaction[];
  seatRefs: React.RefObject<Map<string,HTMLElement>>;
}) {
  return (
    <>
      {interactions.map(ix => (
        <InteractionProjectile key={ix.id} ix={ix} seatRefs={seatRefs} />
      ))}
    </>
  );
}

function InteractionProjectile({ ix, seatRefs }:{
  ix: Interaction;
  seatRefs: React.RefObject<Map<string,HTMLElement>>;
}) {
  const fromEl = seatRefs.current?.get(ix.fromId);
  const toEl   = ix.toId ? seatRefs.current?.get(ix.toId) : null;
  if (!fromEl) return null;

  const fr = fromEl.getBoundingClientRect();
  const from = { x: fr.left + fr.width/2, y: fr.top + fr.height/2 };
  const to   = toEl ? (() => { const r = toEl.getBoundingClientRect(); return { x: r.left+r.width/2, y: r.top+r.height/2 }; })() : from;
  const vis  = INTERACTION_VISUAL[ix.type];
  const hasTarget = toEl && (Math.abs(to.x-from.x) > 20 || Math.abs(to.y-from.y) > 20);

  return (
    <motion.div className="fixed pointer-events-none z-[60]"
      style={{ left: from.x - 16, top: from.y - 16, width:32, height:32 }}
      initial={{ scale: 0.2, opacity: 0 }}
      animate={hasTarget
        ? { x: to.x - from.x, y: to.y - from.y, scale: [0.2, 1.4, 0.9], opacity: [0, 1, 1, 0] }
        : { scale: [0.5, 1.5, 1.2, 0], opacity: [0, 1, 1, 0], y: [0, -40, -70] }}
      transition={{ duration: hasTarget ? 0.65 : 0.8, ease: hasTarget ? 'easeIn' : 'easeOut' }}>
      {/* Trail glow */}
      <div className="absolute inset-0 rounded-full blur-md" style={{ background: vis.trail, transform:'scale(2)' }} />
      {/* Icon */}
      <div className="relative flex items-center justify-center w-full h-full text-lg font-bold"
        style={{ color: vis.color, textShadow: `0 0 12px ${vis.color}, 0 0 24px ${vis.color}` }}>
        {vis.emoji}
      </div>
      {/* Impact burst when reaches target */}
      {hasTarget && (
        <motion.div className="absolute inset-0 rounded-full"
          style={{ background: vis.trail }}
          initial={{ scale: 0 }}
          animate={{ scale: [0,0,3], opacity: [0,0,0.7,0] }}
          transition={{ duration: 0.65, ease: 'easeIn' }} />
      )}
    </motion.div>
  );
}

// ─── Resonance overlay (SVG lines between connected players) ─────────────────

function ResonanceOverlay({ game, seatRefs, positionTick }:{
  game:GameRoom;
  seatRefs:React.RefObject<Map<string,HTMLElement>>;
  positionTick:number;
}) {
  const [lines, setLines] = useState<{key:string;from:{x:number;y:number};to:{x:number;y:number}}[]>([]);

  useEffect(()=>{
    const pairs = new Set<string>();
    game.players.forEach(p=>{
      p.resonance_with.forEach(tid=>{
        pairs.add([p.id,tid].sort().join('|'));
      });
    });

    const newLines = Array.from(pairs).map(key=>{
      const [aId,bId] = key.split('|');
      const aEl = seatRefs.current?.get(aId);
      const bEl = seatRefs.current?.get(bId);
      if(!aEl||!bEl) return null;
      // Use the img element for accurate position (accounts for CSS transforms/animation)
      const aImg = aEl.querySelector('img') ?? aEl;
      const bImg = bEl.querySelector('img') ?? bEl;
      const a = aImg.getBoundingClientRect();
      const b = bImg.getBoundingClientRect();
      return {
        key,
        from:{ x:a.left+a.width/2, y:a.top+a.height/2 },
        to:  { x:b.left+b.width/2, y:b.top+b.height/2 },
      };
    }).filter(Boolean) as {key:string;from:{x:number;y:number};to:{x:number;y:number}}[];

    setLines(newLines);
  },[game.players, positionTick, seatRefs]);

  if(lines.length===0) return null;

  return (
    <svg className="fixed inset-0 w-screen h-screen pointer-events-none z-20" style={{overflow:'visible'}}>
      <defs>
        <filter id="resonance-glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="resonance-glow-strong">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {lines.map(ln=>(
        <ResonanceLine key={ln.key} from={ln.from} to={ln.to} />
      ))}
    </svg>
  );
}

function ResonanceLine({ from, to }:{ from:{x:number;y:number}; to:{x:number;y:number} }) {
  // Control point: arc upward between the two seats, waves ±20px
  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2 - 50;
  const cyHigh = cy - 20;   // wave up
  const cyLow  = cy + 20;   // wave down

  const bx = (t: number) => (1-t)*(1-t)*from.x + 2*(1-t)*t*cx + t*t*to.x;
  const by = (t: number) => (1-t)*(1-t)*from.y + 2*(1-t)*t*cy + t*t*to.y;

  // Arc-length parameterized sampling — gives truly uniform speed
  const DENSE = 80; // dense sample to build length table
  const lens: number[] = [0];
  for (let i = 1; i <= DENSE; i++) {
    const t0 = (i-1)/DENSE, t1 = i/DENSE;
    const dx = bx(t1)-bx(t0), dy = by(t1)-by(t0);
    lens.push(lens[i-1] + Math.sqrt(dx*dx+dy*dy));
  }
  const total = lens[DENSE];

  const NUM = 16; // keyframes for animation
  const pxAB: number[] = [], pyAB: number[] = [];
  for (let i = 0; i <= NUM; i++) {
    const target = (i/NUM) * total;
    let lo = 0, hi = DENSE;
    while (lo < hi - 1) { const m = (lo+hi)>>1; lens[m] < target ? lo=m : hi=m; }
    const frac = (target - lens[lo]) / (lens[hi] - lens[lo] || 1);
    const tVal = (lo + frac) / DENSE;
    pxAB.push(bx(tVal));
    pyAB.push(by(tVal));
  }
  const pxBA = [...pxAB].reverse();
  const pyBA = [...pyAB].reverse();

  const mid = { x: bx(0.5), y: by(0.5) };
  const path  = `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`;
  const pathH = `M${from.x},${from.y} Q${cx},${cyHigh} ${to.x},${to.y}`;
  const pathL = `M${from.x},${from.y} Q${cx},${cyLow}  ${to.x},${to.y}`;
  const waveVals = `${path};${pathH};${path};${pathL};${path}`;

  return (
    <g filter="url(#resonance-glow)">
      {/* Soft glow halo — morphs with wave */}
      <path d={path} fill="none" stroke="rgba(167,139,250,0.12)" strokeWidth={12}>
        <animate attributeName="d" values={waveVals} dur="4s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"/>
        <animate attributeName="stroke-opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite"/>
      </path>
      {/* Core dashed line — morphs + scrolling dash */}
      <path d={path} fill="none" stroke="rgba(167,139,250,0.6)" strokeWidth={1.5} strokeDasharray="5 7">
        <animate attributeName="d" values={waveVals} dur="4s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"/>
        <animate attributeName="stroke-dashoffset" from="0" to="-48" dur="1.8s" repeatCount="indefinite" calcMode="linear"/>
      </path>

      {/* Dense particle stream */}
      {Array.from({length:28},(_,i)=>{
        const fills = ['#c4b5fd','#a78bfa','#ddd6fe','#7c3aed','#ede9fe','#8b5cf6'];
        const fill = fills[i % fills.length];
        const dir  = i % 2 === 0 ? 1 : -1;
        const xs   = dir === 1 ? pxAB : pxBA;
        const ys   = dir === 1 ? pyAB : pyBA;
        const dur  = 2.5 + (i * 0.31) % 3.5;          // 2.5–6s spread
        const delay= (i * 0.37) % dur;                  // stagger across full cycle
        const r    = 1 + (i % 5) * 0.5;                // 1–3px
        const maxO = 0.4 + (i % 4) * 0.15;             // 0.4–0.85
        const opacities = xs.map((_,j)=>{
          const frac = j/NUM;
          const fade = frac<0.1 ? frac/0.1 : frac>0.9 ? (1-frac)/0.1 : 1;
          return fade * maxO;
        });
        return (
          <motion.circle key={i} r={r} fill={fill}
            filter={r>2?'url(#resonance-glow-strong)':'url(#resonance-glow)'}
            animate={{cx:xs, cy:ys, opacity:opacities}}
            transition={{repeat:Infinity, duration:dur, delay, ease:'linear'}}
          />
        );
      })}

      {/* Midpoint pulse badge */}
      <motion.g style={{transformOrigin:`${mid.x}px ${mid.y}px`}}
        animate={{scale:[1,1.25,1], opacity:[0.5,1,0.5]}}
        transition={{repeat:Infinity, duration:2.5, ease:'easeInOut'}}>
        <circle cx={mid.x} cy={mid.y} r={5}
          fill="rgba(109,40,217,0.5)" stroke="rgba(196,181,253,0.9)" strokeWidth={1}/>
        <text x={mid.x} y={mid.y} fontSize={7} fill="#ddd6fe"
          textAnchor="middle" dominantBaseline="middle">♦</text>
      </motion.g>
    </g>
  );
}

// ─── Card showcase (plays in center when you play a card) ─────────────────────

// ─── Card effect VFX overlay ──────────────────────────────────────────────────
// Shows a fullscreen particle burst matching the card type

const EFFECT_VFX: Record<string, { color:string; label:string; emoji:string }> = {
  // Draw
  draw_2:               { color:'#a78bfa', label:'摸 2 张牌',            emoji:'🃏' },
  draw_3:               { color:'#a78bfa', label:'摸 3 张牌',            emoji:'🃏' },
  draw_3_limit_1:       { color:'#a78bfa', label:'摸3张 · 本回合限出1张', emoji:'🃏' },
  draw_1_heal_1:        { color:'#a78bfa', label:'摸1张 + 回复1血',       emoji:'🃏' },
  random_card:          { color:'#fb923c', label:'即兴表演 · 随机抽牌',   emoji:'🎲' },
  recover_from_discard: { color:'#a78bfa', label:'从弃牌堆取回1张',       emoji:'♻' },
  retrieve_any_discard: { color:'#a78bfa', label:'记忆保存 · 取回弃牌',   emoji:'♻' },
  copy_last_card:       { color:'#e879f9', label:'影响扩散 · 复制上一张', emoji:'📋' },
  // Heal
  heal_2:               { color:'#34d399', label:'回复 2 点生命',         emoji:'💚' },
  heal_3:               { color:'#34d399', label:'回复 3 点生命',         emoji:'💚' },
  inner_monologue_heal: { color:'#34d399', label:'内心独白 · 回复3血',    emoji:'💚' },
  heal_over_time_2:     { color:'#6ee7b7', label:'接下来2回合每回合回血', emoji:'⏳' },
  social_heal:          { color:'#c084fc', label:'社交网络 · 共鸣+双方回血', emoji:'💚' },
  collective_benefit:   { color:'#fb923c', label:'集体利益 · 共鸣+代价减', emoji:'🤝' },
  // Defense
  shield_1:             { color:'#60a5fa', label:'获得 1 点护盾',         emoji:'🛡' },
  shield_2x1:           { color:'#60a5fa', label:'获得 2 层护盾',         emoji:'🛡' },
  shield_3:             { color:'#60a5fa', label:'获得 3 点护盾',         emoji:'🛡' },
  immunity_round:       { color:'#60a5fa', label:'本回合免疫所有伤害',    emoji:'🛡' },
  cancel_next_effect_on_self: { color:'#60a5fa', label:'内心防线激活',    emoji:'🛡' },
  resonance_immunity:   { color:'#c084fc', label:'感性防护 · 本回合免疫', emoji:'🛡' },
  // Resonance
  build_resonance:      { color:'#c084fc', label:'建立共鸣链接',           emoji:'♦' },
  force_resonance:      { color:'#c084fc', label:'强制感召 · 建立共鸣',    emoji:'♦' },
  mass_resonance:       { color:'#c084fc', label:'号召力 · 全场共鸣+1',    emoji:'♦' },
  random_resonance:     { color:'#c084fc', label:'随机获得共鸣值',         emoji:'♦' },
  resonance_damage:     { color:'#e879f9', label:'情绪感染 · 共鸣值转伤害', emoji:'⚡' },
  resonance_boost:      { color:'#c084fc', label:'共情之力激活 · 效果+2',  emoji:'✦' },
  break_all_resonance:  { color:'#9ca3af', label:'断开所有共鸣链接',        emoji:'✂' },
  // Utility
  extra_action:         { color:'#fbbf24', label:'高速行动 · 额外出牌+1',  emoji:'⚡' },
  skip_for_boost:       { color:'#fbbf24', label:'静观其变 · 下回合效果+2', emoji:'⏭' },
  reduce_self_cost_2:   { color:'#fb923c', label:'资源整理 · 代价 -2',     emoji:'↓' },
  collective_will:      { color:'#fb923c', label:'集体意志 · 本回合代价大减', emoji:'↓' },
  mass_exposure:        { color:'#38bdf8', label:'公开演说 · 全场公开度+1', emoji:'📣' },
  exposure_heal:        { color:'#34d399', label:'当下共鸣 · 公开度转回血', emoji:'💚' },
  spotlight:            { color:'#fbbf24', label:'全场焦点！公开度至10',   emoji:'⭐' },
  force_discard:        { color:'#6b7280', label:'强制对手弃牌',           emoji:'🗑' },
  swap_resource:        { color:'#e879f9', label:'交换双方生命值！',        emoji:'🔄' },
  // Info/Special attacks
  reflect_last_card:    { color:'#f97316', label:'抬杠 · 完整反弹上一张',  emoji:'↩' },
  redirect_to_caster:   { color:'#f97316', label:'即兴反制 · 效果转移',    emoji:'↩' },
  reactive_damage:      { color:'#ef4444', label:'现场反应 · 追加1伤已设置', emoji:'⚡' },
  pressure_damage:      { color:'#ef4444', label:'意志碾压！',             emoji:'💥' },
  crisis_instinct:      { color:'#ef4444', label:'危机本能激活！',          emoji:'🔥' },
  gamble_damage:        { color:'#fbbf24', label:'直觉攻击 · 50/50',        emoji:'🎲' },
  coin_flip_damage:     { color:'#fbbf24', label:'豪赌！',                  emoji:'🎲' },
  pierce_damage_3:      { color:'#ef4444', label:'精准打击 · 穿透护盾',    emoji:'⚔' },
  damage_3_drawback:    { color:'#ef4444', label:'强力出击！',              emoji:'⚔' },
  exposure_to_damage:   { color:'#ef4444', label:'情绪爆发 · 公开度转伤害', emoji:'💥' },
  cost_to_damage:       { color:'#ef4444', label:'创伤转化 · 代价转伤害',   emoji:'💥' },
  fixed_damage_2:       { color:'#ef4444', label:'精确打击 · 固定2伤',     emoji:'⚔' },
  // Info
  view_hand_card:       { color:'#67e8f9', label:'暗中观察 · 查看手牌',    emoji:'👁' },
  view_all_hand:        { color:'#67e8f9', label:'查看全部手牌',            emoji:'👁' },
  view_discard:         { color:'#67e8f9', label:'隐藏档案 · 查看弃牌',    emoji:'👁' },
  view_hidden_skill:    { color:'#67e8f9', label:'深度洞察 · 查看隐藏技能', emoji:'👁' },
  silent_witness:       { color:'#67e8f9', label:'沉默见证 · 追踪行动',    emoji:'👁' },
  record_keeper:        { color:'#67e8f9', label:'记录在案 · 出牌被追踪',   emoji:'📝' },
  rule_audit:           { color:'#fbbf24', label:'规则审查',                emoji:'🔍' },
  // INTJ/INFJ traps
  long_term_trap:       { color:'#ef4444', label:'长线预判 · 陷阱已布置',   emoji:'⚠' },
  foresight:            { color:'#a78bfa', label:'预见 · 陷阱已布置',       emoji:'🔮' },
  override_next_card:   { color:'#a78bfa', label:'终局推演 · 预设对方下张', emoji:'♟' },
  cancel_contradictory: { color:'#a78bfa', label:'矛盾检测！',              emoji:'❌' },
  declare_victory_condition: { color:'#a78bfa', label:'战略蓝图激活',       emoji:'📐' },
  declare_rule:         { color:'#ef4444', label:'颁布条令！全场代价+1',    emoji:'⚖' },
  rule_enforcement:     { color:'#ef4444', label:'秩序执行！代价高者受罚',  emoji:'⚖' },
  force_play:           { color:'#fbbf24', label:'战略指挥 · 强制对方出牌', emoji:'🎯' },
  // Hidden skill
  custom:               { color:'#fbbf24', label:'✦ 隐藏技能发动！',        emoji:'✦' },
};

function CardShowcase({ card }:{ card:Card|null }) {
  return (
    <AnimatePresence>
      {card&&(
        <motion.div
          initial={{opacity:0,scale:0.3,y:100,rotate:-15}}
          animate={{opacity:1,scale:1,y:0,rotate:0}}
          exit={{opacity:0,scale:1.3,y:-80,rotate:8}}
          transition={{type:'spring',stiffness:280,damping:22}}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
          {/* Background vignette */}
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="absolute inset-0 bg-black/30" />
          <div className="relative">
            {/* Glow ring */}
            <motion.div
              animate={{scale:[1,1.15,1],opacity:[0.5,0.9,0.5]}}
              transition={{repeat:Infinity,duration:1.2}}
              className="absolute -inset-6 rounded-3xl blur-2xl"
              style={{background:'radial-gradient(circle, rgba(124,58,237,0.5) 0%, transparent 70%)'}} />
            {/* The card (large) */}
            <motion.div className="relative" style={{transform:'scale(1.6)'}}>
              <div className={`w-40 p-3 rounded-xl border text-left shadow-2xl ${
                card.rarity==='hidden'?'border-amber-400 bg-amber-900/20':
                card.rarity==='rare'?'border-violet-500 bg-violet-900/30':
                card.rarity==='signature'?'border-indigo-500 bg-indigo-900/30':
                'border-gray-600 bg-gray-800/80'}`}>
                <p className={`text-xs mb-1 ${
                  card.rarity==='hidden'?'text-amber-400':
                  card.rarity==='rare'?'text-violet-400':
                  card.rarity==='signature'?'text-indigo-400':'text-gray-500'}`}>
                  {card.rarity==='hidden'?'✦ 隐藏':card.rarity==='rare'?'稀有':card.rarity==='signature'?'专属':'普通'}
                </p>
                <div className="h-16 rounded-lg mb-2 flex items-center justify-center bg-gradient-to-b from-gray-700/50 to-gray-900/50">
                  {card.mbti?(
                    <img src={`/characters/${card.mbti}.png`} alt="" className="w-full h-full object-cover object-top rounded-lg" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
                  ):<span className="text-3xl">⚔️</span>}
                </div>
                <p className="font-bold text-white text-sm leading-tight mb-1">{card.name}</p>
                <p className="text-gray-300 text-xs leading-snug">{card.effect}</p>
              </div>
            </motion.div>
            {/* "出牌!" label */}
            <motion.div
              initial={{opacity:0,y:20}} animate={{opacity:1,y:-60}} exit={{opacity:0}}
              transition={{delay:0.2,duration:0.4}}
              className="absolute left-1/2 -translate-x-1/2 bottom-0 whitespace-nowrap">
              <span className="text-amber-300 font-black text-xl tracking-wider"
                style={{textShadow:'0 0 20px rgba(251,191,36,0.8)'}}>出牌！</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Card generation ──────────────────────────────────────────────────────────

function CardGeneration({ round }:{ round:number }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="relative w-20 h-20">
        <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1.6,ease:'linear'}}
          className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent" />
        <motion.div animate={{rotate:-360}} transition={{repeat:Infinity,duration:2.4,ease:'linear'}}
          className="absolute inset-2 rounded-full border-3 border-cyan-500/40 border-b-transparent" />
        <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:3.2,ease:'linear'}}
          className="absolute inset-4 rounded-full border-2 border-violet-400/30 border-l-transparent" />
        <motion.div animate={{scale:[1,1.3,1],opacity:[0.4,1,0.4]}}
          transition={{repeat:Infinity,duration:1.4}}
          className="absolute inset-0 flex items-center justify-center text-2xl">✦</motion.div>
      </div>
      <div className="text-center">
        <p className="text-gray-200 font-semibold mb-1">卡牌生成阶段</p>
        <p className="text-gray-500 text-xs mb-2">每人摸1张牌 · AI根据回答生成1张专属卡牌</p>
        <motion.p animate={{opacity:[0.4,1,0.4]}} transition={{repeat:Infinity,duration:1.6}}
          className="text-gray-600 text-sm">
          {round<=2?'普通卡':round<=4?'稀有卡':'✦ 隐藏技能牌 ✦'}
        </motion.p>
      </div>
      {/* Fake card deal animation */}
      <div className="flex gap-2">
        {[0,1,2].map(i=>(
          <motion.div key={i}
            animate={{y:[0,-12,0],rotateY:[0,180,360]}}
            transition={{repeat:Infinity,duration:1.8,delay:i*0.3,ease:'easeInOut'}}
            className="w-8 h-12 rounded-md border border-gray-700 bg-gray-800 overflow-hidden">
            <img src="/card-back.png" alt="" className="w-full h-full object-cover opacity-60"
              onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameRoom | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [answer, setAnswer] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);
  const [phaseAnnouncement, setPhaseAnnouncement] = useState<string | null>(null);
  const [lastCombatLog, setLastCombatLog] = useState<{message:string;type:string}|null>(null);
  const [showcasedCard, setShowcasedCard] = useState<Card | null>(null);
  const [effectVFX, setEffectVFX] = useState<{ label:string; color:string; emoji:string } | null>(null);
  const [newCardToast, setNewCardToast] = useState<string | null>(null);
  const prevHandLenRef = useRef(0);
  const [revealPopup, setRevealPopup] = useState<string | null>(null);
  const [revealedCards, setRevealedCards] = useState<Card[]>([]);
  const [revealLabel, setRevealLabel] = useState<string>('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const interactionKeyRef = useRef(0);
  const prevPhaseRef = useRef<string|null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const seatRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [positionTick, setPositionTick] = useState(0);

  const effects = useGameAnimations(game?.players);

  const registerSeat = useMemo(() => (id: string) => (el: HTMLElement | null) => {
    if (el) seatRefs.current.set(id, el);
    else seatRefs.current.delete(id);
  }, []);

  function addInteraction(type: InteractionType, fromId: string, toId?: string) {
    const id = interactionKeyRef.current++;
    setInteractions(prev => [...prev, { id, type, fromId, toId }]);
    setTimeout(() => setInteractions(prev => prev.filter(ix => ix.id !== id)), 900);
  }

  useEffect(()=>{
    const pid = localStorage.getItem('playerId')||'';
    setPlayerId(pid);
    supabase.from('game_rooms').select('*').eq('room_code',roomCode).single()
      .then(({data})=>{ if(data) setGame(data as GameRoom); });

    const ch = supabase.channel(`room-play:${roomCode}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'game_rooms',filter:`room_code=eq.${roomCode}`},
        ({new:d})=>{
          const next = d as GameRoom;
          setGame(prev=>{
            // Phase change announcement
            if(next.current_phase && next.current_phase!==prevPhaseRef.current){
              setPhaseAnnouncement(PHASE_LABELS[next.current_phase]??null);
              prevPhaseRef.current = next.current_phase;
              playPhaseChange();
              setTimeout(()=>setPhaseAnnouncement(null),2200);
            }
            // Combat log toast (guard against undefined game_log)
            const nextLog = next.game_log ?? [];
            const prevLogLen = prev?.game_log?.length ?? 0;
            if(nextLog.length > prevLogLen){
              const last = nextLog[nextLog.length-1];
              if(last&&(last.type==='combat'||last.type==='action')){
                setLastCombatLog(last);
                setTimeout(()=>setLastCombatLog(null),3000);
              }
              const infoKeywords = ['发现', '查看了', '看透', '翻阅', '洞察', '沉默见证', '记录'];
              const infoLog = nextLog.slice(prevLogLen)
                .find(l => infoKeywords.some(k => l.message.includes(k)));
              if(infoLog){
                setRevealPopup(infoLog.message);
                setTimeout(()=>setRevealPopup(null), 4000);
              }
            }
            return next;
          });
          setSelectedCard(null); setTargetId(null);
        }).subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[roomCode]);

  useEffect(()=>{
    if(game?.status==='finished'){
      playVictory();
      setTimeout(()=>router.push(`/room/${roomCode}/result`), 1200);
    }
  },[game?.status, roomCode, router]);
  useEffect(()=>{ if(logOpen) logEndRef.current?.scrollIntoView({behavior:'smooth'}); },[game?.game_log,logOpen]);
  // Continuously track avatar positions (accounts for float animation + scroll)
  useEffect(()=>{
    const id = setInterval(()=>setPositionTick(n=>n+1), 50); // ~20fps
    return ()=>clearInterval(id);
  },[]);
  useEffect(()=>{
    const update = ()=>setPositionTick(n=>n+1);
    window.addEventListener('scroll', update, {passive:true});
    window.addEventListener('resize', update);
    return ()=>{ window.removeEventListener('scroll',update); window.removeEventListener('resize',update); };
  },[]);

  // Detect opponent card plays and show interaction animation
  const prevPlayersRef = useRef<Player[]>([]);
  useEffect(()=>{
    if(!game?.players) return;
    const prev = prevPlayersRef.current;
    if(prev.length > 0 && game.current_phase === 'battle'){
      game.players.forEach(curr=>{
        if(curr.id === playerId) return; // skip self (handled in playCard)
        const p = prev.find(x=>x.id===curr.id);
        if(!p) return;
        // Hand shrank → they played a card; try to infer animation type from latest discard
        if(curr.hand.length < p.hand.length && curr.discard.length > p.discard.length){
          const playedCard = curr.discard[curr.discard.length - 1];
          if(playedCard){
            const ixType = EFFECT_TO_INTERACTION[playedCard.effect_code] ?? 'special';
            // Target: if the effect involves a target, try to find who was affected
            // (best guess: look at HP changes)
            const victim = game.players.find(x=>
              x.id !== curr.id && prev.find(pp=>pp.id===x.id && pp.hp > x.hp)
            );
            setTimeout(()=>addInteraction(ixType, curr.id, victim?.id ?? me?.id), 200);
          }
        }
      });
    }
    prevPlayersRef.current = game.players;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[game?.players]);

  const me        = game?.players?.find(p=>p.id===playerId);
  const opponents = game?.players?.filter(p=>p.id!==playerId)??[];
  const isMyTurn  = game?.current_turn_player_id===playerId;

  // Detect new cards entering hand → show toast + sound
  useEffect(()=>{
    if(!me) return;
    const curr = me.hand.length;
    const prev = prevHandLenRef.current;
    if(curr > prev && prev > 0){
      const added = curr - prev;
      // Check if AI card (last card has id starting with ai_ or hidden_)
      const lastCard = me.hand[me.hand.length - 1];
      const isAI = lastCard?.id?.startsWith('ai_') || lastCard?.id?.startsWith('hidden_');
      setNewCardToast(isAI ? `✦ AI生成专属卡牌：${lastCard.name}` : `🃏 摸牌 +${added}`);
      setTimeout(()=>setNewCardToast(null), 2500);
      playDraw();
    }
    prevHandLenRef.current = curr;
  },[me?.hand.length]);

  // Turn start sound
  const prevTurnRef = useRef<string|null>(null);
  useEffect(()=>{
    if(isMyTurn && game?.current_turn_player_id !== prevTurnRef.current){
      playTurnStart();
    }
    prevTurnRef.current = game?.current_turn_player_id ?? null;
  },[game?.current_turn_player_id, isMyTurn]);

  async function submitAnswer(visibility:'public'|'private'|'skipped'){
    setLoading(true); setError('');
    try{
      const res=await fetch('/api/game/answer',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({roomCode,playerId,answer:visibility==='skipped'?null:answer,visibility})});
      const data=await res.json();
      if(!res.ok)setError(data.error); else setAnswer('');
    }finally{setLoading(false);}
  }
  async function clickResonate(id:string){
    await fetch('/api/game/resonate',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({roomCode,playerId,targetPlayerId:id})});
  }
  async function advancePhase(){
    setLoading(true);
    try{ await fetch('/api/game/advance-phase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomCode})}); }
    finally{setLoading(false);}
  }
  async function playCard(){
    if(!selectedCard)return;
    if(selectedCard.needsTarget&&!targetId){setError('请选择目标');return;}
    const cardToShow = selectedCard;
    playCardPlay();
    // Play additional effect-specific sound
    const extraSound = EFFECT_SOUNDS[cardToShow.effect_code];
    if (extraSound) setTimeout(extraSound, 120);
    setPlayingCardId(selectedCard.id); setLoading(true); setError('');
    try{
      const res=await fetch('/api/game/play-card',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({roomCode,playerId,cardId:selectedCard.id,targetId})});
      const data=await res.json();
      if(!res.ok){setError(data.error);setPlayingCardId(null);}
      else{
        // Show revealed cards for view-type cards
        if(data.revealedCards?.length){
          const tgt = game?.players.find(p=>p.id===targetId);
          setRevealLabel(`👁 ${tgt?.nickname ?? '对手'} 的牌`);
          setRevealedCards(data.revealedCards);
        }
        setSelectedCard(null);setTargetId(null);
        setShowcasedCard(cardToShow);
        setTimeout(()=>setPlayingCardId(null),500);
        setTimeout(()=>setShowcasedCard(null),2400);
        // Card effect VFX banner
        const vfx = EFFECT_VFX[cardToShow.effect_code];
        if(vfx){ setTimeout(()=>{ setEffectVFX(vfx); setTimeout(()=>setEffectVFX(null),1800); }, 800); }
        // Trigger projectile animation
        const ixType = EFFECT_TO_INTERACTION[cardToShow.effect_code] ?? 'special';
        addInteraction(ixType, playerId, targetId ?? undefined);
      }
    }finally{setLoading(false);}
  }
  async function endTurn(){
    setLoading(true);
    try{ await fetch('/api/game/end-turn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomCode,playerId})}); }
    finally{setLoading(false);}
  }

  if(!game||!me){
    return(
      <main className="min-h-screen flex items-center justify-center bg-[#080b12]">
        <motion.div animate={{opacity:[0.2,1,0.2]}} transition={{repeat:Infinity,duration:1.5}}
          className="text-violet-400">加载中...</motion.div>
      </main>
    );
  }

  const phase  = game.current_phase;
  const round  = game.current_round;
  const myCards= me.is_alive?[...me.hand,...(me.hidden_skill&&me.exposure>=7?[me.hidden_skill]:[])]:[];

  return (
    <main className="h-screen flex flex-col overflow-hidden select-none relative" style={{backgroundColor:'#06080f'}}>
      {/* Board background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img src="/home-bg.png" alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at center, transparent 30%, #06080f 100%)'}} />
      </div>
      <AmbientParticles phase={phase} players={game.players} />
      <PhaseAnnouncement text={phaseAnnouncement} />
      <ResonanceOverlay game={game} seatRefs={seatRefs} positionTick={positionTick} />
      <CardShowcase card={showcasedCard} />
      <InteractionLayer interactions={interactions} seatRefs={seatRefs} />

      {/* New card toast */}
      <AnimatePresence>
        {newCardToast && (
          <motion.div
            initial={{ opacity:0, y:30, x:'-50%' }}
            animate={{ opacity:1, y:0, x:'-50%' }}
            exit={{ opacity:0, y:-20, x:'-50%' }}
            className="fixed bottom-32 left-1/2 z-50 pointer-events-none">
            <div className={`px-4 py-2 rounded-2xl text-sm font-bold backdrop-blur border shadow-lg ${
              newCardToast.startsWith('✦')
                ? 'bg-violet-900/90 border-violet-500/50 text-violet-200 shadow-violet-900/50'
                : 'bg-gray-900/90 border-gray-600/50 text-gray-300'
            }`}>
              {newCardToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card effect VFX banner */}
      <AnimatePresence>
        {effectVFX && (
          <motion.div
            initial={{ opacity:0, scale:0.5, y:20 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:1.3, y:-30 }}
            transition={{ type:'spring', stiffness:300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] pointer-events-none text-center">
            <motion.div
              animate={{ scale:[1,1.1,1] }} transition={{ repeat:2, duration:0.3 }}
              className="text-5xl mb-2">{effectVFX.emoji}</motion.div>
            <motion.div
              className="px-6 py-2 rounded-2xl font-black text-xl tracking-wide"
              style={{ color: effectVFX.color, textShadow:`0 0 30px ${effectVFX.color}`, border:`2px solid ${effectVFX.color}50`, background:`${effectVFX.color}15` }}>
              {effectVFX.label}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revealed cards modal */}
      <AnimatePresence>
        {revealedCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setRevealedCards([])}>
            <motion.div
              initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="bg-gray-900/95 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl shadow-cyan-900/40 max-w-3xl w-full mx-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-cyan-400 text-xs font-bold tracking-widest mb-1">👁 信息查看</p>
                  <p className="text-white font-bold text-lg">{revealLabel}</p>
                </div>
                <button onClick={() => setRevealedCards([])}
                  className="text-gray-500 hover:text-gray-300 text-2xl transition-colors">×</button>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {revealedCards.map((card, i) => (
                  <motion.div key={card.id + i}
                    initial={{ opacity: 0, y: 20, rotate: -5 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ delay: i * 0.08, type: 'spring' }}>
                    <CardComponent card={card} />
                  </motion.div>
                ))}
              </div>
              <p className="text-center text-gray-600 text-xs mt-4">点击任意处关闭</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info reveal popup */}
      <AnimatePresence>
        {revealPopup && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-2 pointer-events-none">
            <div className="bg-cyan-950/95 border border-cyan-500/50 rounded-2xl px-5 py-4 backdrop-blur shadow-2xl shadow-cyan-900/40">
              <p className="text-cyan-400 text-xs font-bold mb-1 tracking-widest">👁 信息揭示</p>
              <p className="text-gray-200 text-sm leading-snug">{revealPopup}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-5 py-2.5 bg-black/50 border-b border-white/5 backdrop-blur">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="w-9 h-9 opacity-90 drop-shadow-lg" onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
          <RoundTracker round={round} />
        </div>
        <AnimatePresence mode="wait">
          <motion.span key={phase}
            initial={{opacity:0,y:-6,scale:0.85}} animate={{opacity:1,y:0,scale:1}}
            exit={{opacity:0,y:6}} transition={{duration:0.25}}
            className="absolute left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
            {PHASE_LABELS[phase??'']??''}
          </motion.span>
        </AnimatePresence>
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={()=>{ const m=toggleMute(); setMuted(m); }}
            className="text-gray-600 hover:text-gray-300 text-base transition-colors"
            title={muted?'开启音效':'关闭音效'}>
            {muted?'🔇':'🔊'}
          </button>
          <button onClick={()=>setLogOpen(v=>!v)} className="text-gray-600 hover:text-gray-300 text-xs transition-colors">
            {logOpen?'收起日志':'日志 ↑'}
          </button>
        </div>
      </header>

      {/* Log */}
      <AnimatePresence>
        {logOpen&&(
          <motion.div initial={{height:0}} animate={{height:130}} exit={{height:0}} transition={{duration:0.25}}
            className="relative z-10 flex-shrink-0 border-b border-white/5 bg-black/80 overflow-y-auto px-4 py-2 space-y-0.5">
            <AnimatePresence initial={false}>
              {(game.game_log??[]).slice(-50).map((log,i)=>(
                <motion.p key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
                  className={`text-xs ${log.type==='system'?'text-violet-400':log.type==='combat'?'text-orange-300':log.type==='info'?'text-cyan-400':'text-gray-500'}`}>
                  {log.message}
                </motion.p>
              ))}
            </AnimatePresence>
            <div ref={logEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3-column desktop layout ── */}
      <div className="relative z-10 flex-1 flex min-h-0">

        {/* LEFT PANEL: Activity feed */}
        <div className="hidden lg:flex flex-col w-48 flex-shrink-0 border-r border-white/5 bg-black/20 backdrop-blur-sm p-3 gap-3 overflow-y-auto">
          {/* Round tracker */}
          <div>
            <RoundTracker round={round} />
          </div>

          {/* Current question context */}
          {game.current_question && (
            <div className="p-2.5 rounded-xl bg-violet-500/8 border border-violet-500/15">
              <p className="text-violet-500 text-[9px] tracking-widest mb-1.5">本轮问题</p>
              <p className="text-gray-400 text-xs leading-snug italic">
                "{game.current_question.text}"
              </p>
            </div>
          )}

          {/* Recent actions — last 8 only */}
          <div className="flex-1 min-h-0 space-y-1.5 overflow-hidden">
            <p className="text-gray-700 text-[9px] tracking-widest">最近动作</p>
            <AnimatePresence initial={false}>
              {(game.game_log??[]).filter(l=>l.type!=='system').slice(-8).map((log,i)=>(
                <motion.p key={i}
                  initial={{opacity:0,x:-8,height:0}} animate={{opacity:1,x:0,height:'auto'}}
                  exit={{opacity:0,height:0}}
                  className={`text-xs leading-snug ${
                    log.type==='combat'?'text-orange-300/90':
                    log.type==='info'?'text-cyan-400/90':'text-gray-500'}`}>
                  {log.message}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>

          {/* Phase events — system logs */}
          <div className="flex-shrink-0 space-y-1">
            {(game.game_log??[]).filter(l=>l.type==='system').slice(-3).map((log,i)=>(
              <p key={i} className="text-violet-400/70 text-[10px] leading-snug">{log.message}</p>
            ))}
          </div>
        </div>

        {/* CENTER: Table */}
        <div className="flex-1 flex flex-col min-h-0 p-2 lg:p-3 gap-2">

          {/* Opponents */}
          <div className="flex-shrink-0 flex justify-center items-end gap-4 lg:gap-5 flex-wrap">
            <AnimatePresence>
              {opponents.map(p=>(
                <OpponentSeat key={p.id} player={p}
                  isCurrentTurn={game.current_turn_player_id===p.id}
                  isTarget={targetId===p.id}
                  selectable={phase==='battle'&&isMyTurn&&!!selectedCard?.needsTarget&&p.is_alive}
                  onSelect={()=>setTargetId(p.id===targetId?null:p.id)}
                  showAnswer={phase==='resonance'}
                  myResonanceWith={me.resonance_with}
                  alreadyResonated={me.resonance_with.includes(p.id)}
                  onResonate={()=>clickResonate(p.id)}
                  effects={effects[p.id]??[]}
                  onRegister={registerSeat(p.id)} />
              ))}
            </AnimatePresence>
          </div>

          {/* Equal flexible spacers sandwich the phase content — true center */}
          <div className="flex-1 min-h-0" />

          {/* Phase content — natural height */}
          <div className="flex justify-center items-center">
            <AnimatePresence mode="wait">
              <motion.div key={phase??'loading'}
                initial={{opacity:0,scale:0.92,y:16}} animate={{opacity:1,scale:1,y:0}}
                exit={{opacity:0,scale:0.92,y:-16}} transition={{duration:0.3,type:'spring',stiffness:240,damping:24}}
                className="w-full max-w-xl">
                {phase==='question'&&<QuestionPhase question={game.current_question?.text??''} answer={answer}
                  onAnswerChange={setAnswer} hasAnswered={me.answer_visibility!==null} onSubmit={submitAnswer}
                  loading={loading} players={game.players} myId={playerId} isHost={me.is_host} onAdvance={advancePhase} />}
                {phase==='resonance'&&<ResonancePhase players={game.players} myId={playerId}
                  myResonanceWith={me.resonance_with} onResonate={clickResonate}
                  isHost={me.is_host} onAdvance={advancePhase} loading={loading} />}
                {phase==='card_generation'&&<CardGeneration round={round} />}
                {phase==='battle'&&<BattleCenter game={game} me={me} isMyTurn={isMyTurn} error={error} lastLog={lastCombatLog} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* My row — MySeat absolutely positioned left, cards use full width centered */}
          <div className="flex-shrink-0 relative" style={{overflow:'visible'}}>
            {/* MySeat pinned to left, doesn't affect card centering */}
            <div className="absolute left-0 top-0 z-10">
              <MySeat me={me} isMyTurn={isMyTurn} effects={effects[me.id]??[]} onRegister={registerSeat(me.id)} />
            </div>
            {/* Cards — full width, truly centered */}
            <div className="w-full flex flex-col">
              {phase==='battle'&&me.is_alive&&(
                <>
                  {(() => {
                    const hasLimit = me.effects.some(e=>e.type==='limit_plays_1');
                    const hasExtra = me.effects.some(e=>e.type==='extra_play_this_round');
                    const maxPlays = hasLimit ? 1 : hasExtra ? 3 : 2;
                    const remaining = maxPlays - me.cards_played_this_round;
                    return (
                      <div className="flex items-center justify-center gap-4 mb-1">
                        <span className="text-gray-600 text-xs">
                          手牌 {me.hand.length}张
                          {me.hidden_skill&&me.exposure>=7&&(
                            <motion.span animate={{opacity:[0.6,1,0.6]}} transition={{repeat:Infinity,duration:1}}
                              className="ml-1 text-amber-400"> + 隐藏技能</motion.span>
                          )}
                        </span>
                        <span className={`text-xs font-semibold ${
                          remaining <= 0 ? 'text-red-500' :
                          hasLimit ? 'text-amber-400' : 'text-gray-700'
                        }`}>
                          {hasLimit && <span className="mr-1">⚠ 限出</span>}
                          已出 {me.cards_played_this_round}/{maxPlays}
                          {remaining > 0 && <span className="text-gray-600 font-normal ml-1">(还可出{remaining}张)</span>}
                          {remaining <= 0 && <span className="ml-1">· 已达上限</span>}
                        </span>
                      </div>
                    );
                  })()}
                  <div className="flex items-end gap-4 justify-center">
                    {/* Discard pile icon */}
                    <DiscardPileIcon
                      discard={me.discard}
                      onView={()=>{
                        if(!me.discard.length) return;
                        setRevealLabel(`♻ 我的弃牌堆（${me.discard.length}张）`);
                        setRevealedCards(me.discard);
                      }}
                    />
                    <CardFan cards={myCards} selectedId={selectedCard?.id??null}
                      onSelect={c=>setSelectedCard(selectedCard?.id===c.id?null:c)}
                      disabled={!isMyTurn||loading} playingCardId={playingCardId} />
                  </div>
                </>
              )}
              {phase==='battle'&&!me.is_alive&&(
                <motion.p animate={{opacity:[0.3,0.6,0.3]}} transition={{repeat:Infinity,duration:2}}
                  className="text-gray-700 text-sm text-center py-4">已出局 · 观战中</motion.p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: My detailed stats (desktop always-on) */}
        <div className="hidden lg:flex flex-col w-56 flex-shrink-0 border-l border-white/5 bg-black/25 backdrop-blur-sm p-3 gap-3 overflow-y-auto">

          {/* My avatar + core stats */}
          <div>
            <p className="text-gray-600 text-[10px] tracking-widest mb-2">我的状态</p>
            {/* Large avatar */}
            <div className="w-full aspect-square rounded-2xl overflow-hidden border border-white/10 mb-3 shadow-lg">
              <img src={`/characters/${me.mbti}.png`} alt="" className="w-full h-full object-cover object-top"
                onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
            </div>
            <p className="text-white text-sm font-bold mb-0.5">{me.nickname}</p>
            <p className={`text-xs mb-3 ${GROUP_TEXT[me.group||'IN']}`}>{me.mbti} · {me.group}</p>
            {[
              {label:'HP',    value:me.hp,        max:10, color:'bg-emerald-500'},
              {label:'代价',  value:me.cost,      max:10, color:'bg-red-500'},
              {label:'公开度',value:me.exposure,  max:10, color:'bg-blue-500'},
              {label:'共鸣值',value:me.resonance, max:10, color:'bg-violet-500'},
            ].map(s=>(
              <div key={s.label} className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400 text-xs">{s.label}</span>
                  <span className="text-gray-300 text-xs font-semibold">{s.value}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                  <motion.div animate={{width:`${(s.value/s.max)*100}%`}} transition={{duration:0.5,type:'spring'}}
                    className={`h-full rounded-full ${s.color}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Active effects */}
          {me.effects.length>0&&(
            <div>
              <p className="text-gray-600 text-[10px] tracking-widest mb-2">持续效果</p>
              <div className="space-y-1">
                {me.effects.map((e,i)=>(
                  <motion.div key={i} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}}
                    className="flex items-center justify-between px-2 py-1 rounded-lg bg-gray-800/60 border border-gray-700/50">
                    <span className="text-gray-300 text-[10px] truncate">{effectLabel(e.type)}</span>
                    {e.rounds_remaining!==undefined&&(
                      <span className="text-gray-600 text-[9px] ml-1">{e.rounds_remaining}轮</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden skill */}
          {me.hidden_skill&&(
            <div>
              <p className="text-gray-500 text-xs tracking-widest mb-2">隐藏技能</p>
              <motion.div animate={me.exposure>=7?{boxShadow:['0 0 0px #f59e0b00','0 0 20px #f59e0b70','0 0 0px #f59e0b00']}:{}}
                transition={{repeat:Infinity,duration:2}}
                className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <p className="text-amber-400 text-sm font-bold mb-1">✦ {me.hidden_skill.name}</p>
                <p className="text-gray-400 text-xs leading-snug">{me.hidden_skill.description}</p>
                <p className="text-gray-600 text-xs mt-1 italic">{me.hidden_skill.activation}</p>
                {me.exposure>=7
                  ?<motion.p animate={{opacity:[0.7,1,0.7]}} transition={{repeat:Infinity,duration:1}}
                    className="text-amber-300 text-xs mt-1.5 font-bold">✓ 可发动</motion.p>
                  :<p className="text-gray-600 text-xs mt-1.5">公开度需≥7（当前{me.exposure}）</p>}
              </motion.div>
            </div>
          )}

          {/* Resonance links */}
          {me.resonance_with.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs tracking-widest mb-2">共鸣链接 ({me.resonance_with.length})</p>
              {me.resonance_with.map(id=>{
                const p=game.players.find(x=>x.id===id);
                return p?(
                  <motion.div key={id} initial={{scale:0}} animate={{scale:1}}
                    className="flex items-center gap-2 mb-1.5 px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <span className="text-violet-400 text-sm">♦</span>
                    <span className="text-violet-300 text-xs font-medium">{p.nickname}</span>
                    <span className="text-gray-600 text-[10px] ml-auto">{p.mbti}</span>
                  </motion.div>
                ):null;
              })}
            </div>
          )}

          {/* HP comparison */}
          <div>
            <p className="text-gray-500 text-xs tracking-widest mb-2">HP对比</p>
            <WinConditions players={game.players} myId={playerId} />
          </div>

          {/* Deck + Discard info */}
          <div className="pt-1 border-t border-white/5 space-y-2">
            <div className="flex items-center gap-3">
              <DeckStack count={me.deck?.length??0} />
              <div className="flex-1">
                <p className="text-gray-400 text-xs">牌库 {me.deck?.length??0}张</p>
                <p className="text-gray-500 text-[10px] mt-0.5">战斗开始自动摸2张</p>
              </div>
            </div>
            {/* Discard pile — clickable to view */}
            <button
              onClick={()=>{
                if((me.discard?.length??0)===0) return;
                setRevealLabel(`♻ 我的弃牌堆（${me.discard.length}张）`);
                setRevealedCards(me.discard);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-colors ${
                (me.discard?.length??0)>0
                  ? 'border-gray-700 bg-gray-800/40 hover:bg-gray-700/40 cursor-pointer text-gray-400'
                  : 'border-gray-800 text-gray-700 cursor-default'
              }`}>
              <span className="text-xs">弃牌堆 {me.discard?.length??0}张</span>
              {(me.discard?.length??0)>0&&<span className="text-[10px] text-gray-600">点击查看 →</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Floating action bar */}
      <AnimatePresence>
        {phase==='battle'&&isMyTurn&&selectedCard&&(
          <motion.div key="action"
            initial={{y:80,opacity:0}} animate={{y:0,opacity:1}} exit={{y:80,opacity:0}}
            transition={{type:'spring',stiffness:320,damping:28}}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-900/95 border border-violet-500/30 backdrop-blur shadow-2xl z-50">
            {selectedCard.needsTarget&&!targetId?(
              <motion.span animate={{opacity:[0.5,1,0.5]}} transition={{repeat:Infinity,duration:1}} className="text-amber-400 text-sm">请点击一名对手作为目标</motion.span>
            ):(
              <motion.button onClick={playCard} whileHover={{scale:1.05,boxShadow:'0 0 20px rgba(124,58,237,0.5)'}}
                whileTap={{scale:0.95}} disabled={loading||(selectedCard.needsTarget&&!targetId)}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold transition-colors">
                ⚔️ 出牌：{selectedCard.name}
              </motion.button>
            )}
            <motion.button onClick={endTurn} whileHover={{scale:1.05}} whileTap={{scale:0.95}} disabled={loading}
              className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors">
              结束回合
            </motion.button>
          </motion.div>
        )}
        {phase==='battle'&&isMyTurn&&!selectedCard&&(
          <motion.div key="endonly"
            initial={{y:80,opacity:0}} animate={{y:0,opacity:1}} exit={{y:80,opacity:0}}
            transition={{type:'spring',stiffness:320,damping:28}}
            className="fixed bottom-5 right-6 z-50">
            <motion.button onClick={endTurn} whileHover={{scale:1.06}} whileTap={{scale:0.94}} disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 text-sm">
              结束回合
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function effectLabel(type: string): string {
  const map: Record<string,string> = {
    shield:'护盾', immune_this_round:'本回合免疫',
    extra_play_this_round:'额外出牌+1', limit_plays_1:'只能出1张',
    cost_reduction:'代价减免', heal_on_round_start:'每回合回血',
    all_effects_plus_2:'效果+2', all_effects_plus_2_this_round:'本回合效果+2',
    double_effects_this_round:'效果翻倍', spotlight_used:'焦点已用',
    trap_attack:'陷阱（攻击受伤）', foresight_trap:'预见陷阱',
    recorded:'被记录中', must_play:'必须出牌', override_next_play:'下张被预设',
    draw_less_1:'少摸1张', reactive_damage_1:'追加1伤',
  };
  return map[type] ?? type;
}
