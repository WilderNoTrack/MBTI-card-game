#!/usr/bin/env node
// 为16个MBTI类型生成3帧待机动画精灵图 (1536×512 = 3:1 ratio)
// 用法: GRSAI_API_KEY=sk-xxx node scripts/generate-sprites.js

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GRSAI_API_KEY || '';
const API_BASE = 'https://grsai.dakka.com.cn';

if (!API_KEY) { console.error('请设置 GRSAI_API_KEY'); process.exit(1); }

// 每帧的位置变化描述
const FRAME_DESC = `Three animation frames side by side left-to-right for a sprite sheet:
Frame 1 (leftmost): neutral idle pose, looking forward
Frame 2 (center): very subtle shift — slightly taller/inhale, arms/body microscopically different, same expression
Frame 3 (rightmost): return pose close to frame 1 but mirrored lean, slight exhale
Frames must be EXACTLY the same size, NO dividers, NO labels, seamlessly tiling.
Character fills 70% of each frame height, feet at bottom.`;

const BASE = `Low-poly geometric cartoon character sprite sheet, 16personalities.com style.
Wide image: exactly 3 equal frames arranged LEFT-TO-RIGHT horizontally.
${FRAME_DESC}
Consistent solid dark background (#0a0d14) across all 3 frames.
Flat 2.5D illustration. Clean white/transparent background. Full body visible.
IMPORTANT: exactly 3 frames, no borders between frames, identical frame dimensions.`;

const SPRITES = [
  { mbti:'INTJ', group:'IN',
    desc:`Lone strategist. Arms crossed. Sharp confident eyes. Dark structured coat with angular geometric patterns.
Deep violet and indigo color palette (#7c3aed, #4338ca) with subtle purple glow accents.` },

  { mbti:'INTP', group:'IN',
    desc:`Curious thinker. Hand near chin, round glasses, slightly disheveled. Relaxed curious posture.
Muted violet and slate blue palette (#6d28d9, #475569). Small floating polygon thought bubbles.` },

  { mbti:'INFJ', group:'IN',
    desc:`Serene empathetic figure. Hands gently clasped, gentle closed-eye peaceful expression.
Deep plum and soft violet palette (#6b21a8, #c4b5fd) with warm lavender aura.` },

  { mbti:'INFP', group:'IN',
    desc:`Dreamy idealist. Head slightly tilted, wide eyes, gentle warm smile. Casual flowing silhouette.
Soft lilac and violet palette (#c084fc, #f9a8d4). Small floating star shapes nearby.` },

  { mbti:'ISTJ', group:'IS',
    desc:`Dependable sentinel. Standing upright, arms at sides, composed expression. Neat structured outfit.
Deep teal and cyan palette (#0f766e, #06b6d4). Small geometric shield emblem nearby.` },

  { mbti:'ISTP', group:'IS',
    desc:`Cool-headed craftsperson. Slight crouch stance, one eyebrow raised, analytical calm.
Cyan and slate grey palette (#0891b2, #64748b). Practical utility accessories.` },

  { mbti:'ISFJ', group:'IS',
    desc:`Warm protector. Arms slightly open in welcoming gesture, soft caring smile.
Soft aqua and mint palette (#0d9488, #a7f3d0). Warm gentle light around them.` },

  { mbti:'ISFP', group:'IS',
    desc:`Free-spirited artist. Relaxed stance, head slightly tilted, soft observant eyes.
Turquoise and seafoam palette (#0e7490, #f87171). Casual artistic look.` },

  { mbti:'ENTJ', group:'EN',
    desc:`Bold commander. Forward-facing power stance, sharp confident expression. Strong angular silhouette.
Rich amber and deep gold palette (#d97706, #92400e). Leadership aura.` },

  { mbti:'ENTP', group:'EN',
    desc:`Witty debater. Animated leaning forward posture, grin, one hand gesturing.
Bright amber and warm yellow palette (#f59e0b, #fbbf24). Energetic chaotic energy.` },

  { mbti:'ENFJ', group:'EN',
    desc:`Charismatic leader. Arms slightly open, radiant warm smile. Inspiring confident posture.
Warm gold and amber palette (#d97706, #fcd34d). Golden light emanating from figure.` },

  { mbti:'ENFP', group:'EN',
    desc:`Enthusiastic character. Slightly bouncy posture, huge smile, arms at sides with energy.
Bright sunny yellow and warm amber palette (#fbbf24, #fb923c). Sparkle of energy around them.` },

  { mbti:'ESTJ', group:'ES',
    desc:`Decisive executive. Authoritative standing pose, arms crossed, chin raised.
Bold crimson and deep red palette (#dc2626, #991b1b). Structured blazer-like outfit.` },

  { mbti:'ESTP', group:'ES',
    desc:`Daring risk-taker. Dynamic leaning pose, sly grin, confident body language.
Vivid red and coral palette (#ef4444, #f97316). Streetwise stylish look.` },

  { mbti:'ESFJ', group:'ES',
    desc:`Warm socialite. Hands on hips, bright welcoming smile. Cheerful neat appearance.
Rose red and warm pink palette (#f43f5e, #fb7185). Friendly approachable energy.` },

  { mbti:'ESFP', group:'ES',
    desc:`Spotlight lover. Theatrical relaxed pose, dazzling smile, expressive.
Hot red and vibrant coral palette (#dc2626, #fb923c). Stage-ready glamorous vibe.` },
];

async function generate(prompt) {
  const res = await fetch(`${API_BASE}/v1/api/generate`, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${API_KEY}`},
    body: JSON.stringify({
      model:'gpt-image-2-vip',
      prompt,
      aspectRatio:'1536x512',  // 3:1, custom vip size
      replyType:'json',
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const d = await res.json();
  if (d.status!=='succeeded'||!d.results?.[0]?.url) throw new Error(d.error||d.status);
  return d.results[0].url;
}

async function download(url, file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
  const r = await fetch(url);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function getTargets(){
  const idx = process.argv.indexOf('--only');
  if(idx===-1) return SPRITES;
  const keys = process.argv[idx+1]?.split(',').map(s=>s.trim())??[];
  return SPRITES.filter(s=>keys.includes(s.mbti));
}

async function main(){
  const targets = getTargets();
  console.log(`\n🎬 生成 ${targets.length} 个MBTI待机动画精灵图...\n`);
  let ok=0,fail=0;

  for(let i=0;i<targets.length;i++){
    const s = targets[i];
    const file = `public/sprites/${s.mbti}.png`;
    const prefix = `[${i+1}/${targets.length}]`;

    if(fs.existsSync(file)){
      console.log(`${prefix} ⏭  跳过: ${s.mbti}`);
      ok++; continue;
    }

    const prompt = `${BASE}\n\nCharacter personality: ${s.mbti} (${s.group} group)\n${s.desc}`;
    process.stdout.write(`${prefix} ⏳ ${s.mbti}... `);

    try{
      const url = await generate(prompt);
      await download(url, file);
      console.log('✓');
      ok++;
    } catch(e){
      console.log(`✗ ${e.message}`);
      fail++;
    }

    if(i<targets.length-1) await sleep(2000);
  }

  console.log(`\n完成：${ok} 成功，${fail} 失败\n`);
}

main().catch(e=>{console.error(e);process.exit(1);});
