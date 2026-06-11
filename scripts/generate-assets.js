#!/usr/bin/env node
// 批量生成游戏所有媒体素材
// 用法: GRSAI_API_KEY=your_key node scripts/generate-assets.js
//       GRSAI_API_KEY=your_key node scripts/generate-assets.js --only characters
//       GRSAI_API_KEY=your_key node scripts/generate-assets.js --only INTJ,INTP

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GRSAI_API_KEY || '';
const API_BASE = 'https://grsai.dakka.com.cn';

if (!API_KEY) {
  console.error('❌ 请设置环境变量 GRSAI_API_KEY');
  console.error('   用法: GRSAI_API_KEY=sk-xxx node scripts/generate-assets.js');
  process.exit(1);
}

// ─── 所有素材定义 ───────────────────────────────────────────────────────────

const ASSETS = [

  // ── Logo ──────────────────────────────────────────────────────────────────
  {
    tag: 'logo',
    file: 'public/logo.png',
    aspectRatio: '1024x1024',
    prompt: `Minimalist geometric logo for a card game called Personality Duel.
A stylized 16-segment radial symbol made of low-poly triangles arranged in a circle,
divided into four quadrants: top-left violet (#7c3aed), top-right cyan (#0891b2),
bottom-left amber (#d97706), bottom-right red (#dc2626).
Dark background (#0a0a0f). Clean vector-style flat polygon illustration.
Slight inner glow on each segment. No text. No gradients, flat polygon fill only.`,
  },

  // ── 卡背 ──────────────────────────────────────────────────────────────────
  {
    tag: 'card-back',
    file: 'public/card-back.png',
    aspectRatio: '2:3',
    prompt: `Card back design for a personality card game.
Dark navy background (#0d0d1a) with a central geometric mandala pattern
made entirely of low-poly triangles and hexagons.
The mandala has four equal sections: violet top-left, cyan top-right,
amber bottom-left, red bottom-right — all muted and subtle.
Thin geometric border frame in muted gold around the edges.
Mysterious elegant design suitable for a face-down playing card.
No text. Flat 2D illustration with very subtle inner glow.`,
  },

  // ── 主页背景 ────────────────────────────────────────────────────────────────
  {
    tag: 'home-bg',
    file: 'public/home-bg.png',
    aspectRatio: '16:9',
    prompt: `Full screen background for a card game homepage.
Dark atmospheric low-poly landscape. Vast geometric starfield above.
Faint low-poly mountain terrain silhouette at the bottom edge.
Scattered glowing polygon shapes floating mid-air: violet, cyan, amber, red.
Very dark navy base (#070712). Subtle depth and mystery.
No text, no characters. Pure atmospheric environment art.
Wide 16:9 format. Flat polygon illustration style.`,
  },

  // ── 结果页背景 ──────────────────────────────────────────────────────────────
  {
    tag: 'result-bg',
    file: 'public/result-bg.png',
    aspectRatio: '1024x1024',
    prompt: `Victory screen illustration for a personality card game.
A lone geometric low-poly character silhouette standing on a mountain peak
made of polygon triangles, arms raised in triumph.
Sky behind is a dramatic low-poly aurora in four-color gradients:
violet top-left, cyan top-right, amber bottom-right, red bottom-left.
Majestic and celebratory mood. Flat polygon art style. No text.`,
  },

  // ── 阵营徽章 ─────────────────────────────────────────────────────────────────
  {
    tag: 'emblem-IN',
    file: 'public/emblems/IN.png',
    aspectRatio: '1024x1024',
    prompt: `Emblem icon for IN personality group — the Recluses.
A low-poly geometric eye symbol, half-open, with an abstract labyrinth
pattern inside the iris. Deep violet and indigo colors (#7c3aed, #4338ca).
Minimal dark background, strong geometric lines. Flat vector icon.
No text. Square composition, centered symbol.`,
  },
  {
    tag: 'emblem-IS',
    file: 'public/emblems/IS.png',
    aspectRatio: '1024x1024',
    prompt: `Emblem icon for IS personality group — the Sentinels.
A low-poly geometric shield with a mountain peak silhouette inside.
Teal and cyan color palette (#0891b2, #06b6d4). Solid and dependable.
Minimal dark background, strong geometric lines. Flat vector icon.
No text. Square composition, centered symbol.`,
  },
  {
    tag: 'emblem-EN',
    file: 'public/emblems/EN.png',
    aspectRatio: '1024x1024',
    prompt: `Emblem icon for EN personality group — the Influencers.
A low-poly geometric sun or radiant starburst with triangular rays.
Warm amber and golden yellow colors (#d97706, #f59e0b). Energetic.
Minimal dark background, strong geometric lines. Flat vector icon.
No text. Square composition, centered symbol.`,
  },
  {
    tag: 'emblem-ES',
    file: 'public/emblems/ES.png',
    aspectRatio: '1024x1024',
    prompt: `Emblem icon for ES personality group — the Explorers.
A low-poly geometric lightning bolt or bold forward-pointing arrow.
Vivid red and orange-red colors (#dc2626, #ef4444). Dynamic and bold.
Minimal dark background, strong geometric lines. Flat vector icon.
No text. Square composition, centered symbol.`,
  },

  // ── 阶段横幅 ─────────────────────────────────────────────────────────────────
  {
    tag: 'phase-question',
    file: 'public/phases/question.png',
    aspectRatio: '16:9',
    prompt: `Wide banner illustration for a card game question phase.
Abstract low-poly scene: a large question mark formed from triangles
hovering in dark space, surrounded by soft floating polygon particles.
Deep navy background (#0a0a1a) with subtle starfield.
Muted purple and blue tones. No text. Contemplative mood. 16:9 ratio.`,
  },
  {
    tag: 'phase-resonance',
    file: 'public/phases/resonance.png',
    aspectRatio: '16:9',
    prompt: `Wide banner illustration for a card game resonance phase.
Abstract low-poly scene: two glowing polygon heart shapes connected
by geometric link lines, resonating energy waves as outward triangles.
Deep navy background. Violet and soft pink glow tones (#7c3aed, #ec4899).
No text. Warm connected feeling. 16:9 ratio.`,
  },
  {
    tag: 'phase-battle',
    file: 'public/phases/battle.png',
    aspectRatio: '16:9',
    prompt: `Wide banner illustration for a card game battle phase.
Abstract low-poly scene: two geometric sword shapes clashing in center,
explosion of colorful triangles bursting outward in red, violet, amber, cyan.
Dark background with dynamic energy. No text. Intense action mood. 16:9 ratio.`,
  },

  // ── 16 角色插图 ────────────────────────────────────────────────────────────
  {
    tag: 'INTJ',
    file: 'public/characters/INTJ.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Lone strategist standing with arms crossed, slight confident smirk.
Dark structured coat with angular geometric patterns.
Deep violet and indigo palette (#7c3aed, #4338ca) with subtle purple glow.
Minimalist background with faint geometric grid. Sharp eyes, cool expression.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'INTP',
    file: 'public/characters/INTP.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Curious thinker seated on floating geometric shapes, hand on chin.
Small orbiting light dots around them. Round glasses, slightly disheveled.
Muted violet and slate blue palette (#6d28d9, #475569).
Abstract thought bubbles as geometric polygons floating nearby.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'INFJ',
    file: 'public/characters/INFJ.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Serene empathetic figure with hands clasped, gentle closed-eye smile.
Soft aura radiating from silhouette in concentric polygon rings.
Deep plum and soft violet palette (#6b21a8, #c4b5fd) with warm lavender glow.
Flowing minimal outfit with geometric trim. Peaceful wise expression.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'INFP',
    file: 'public/characters/INFP.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Dreamy idealist reaching toward floating geometric stars, eyes wide with wonder.
Soft lilac, dusty rose and violet palette (#c084fc, #f9a8d4).
Casual flowing silhouette, gentle warm smile.
Small butterfly shapes as low-poly nearby. Flat 2.5D illustration.
Clean white background. Full body visible.`,
  },
  {
    tag: 'ISTJ',
    file: 'public/characters/ISTJ.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Dependable sentinel standing upright, holding geometric clipboard.
Steady composed expression. Deep teal and cyan palette (#0f766e, #06b6d4).
Neat structured outfit, precise posture.
Small shield motif in background as low-poly polygon.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'ISTP',
    file: 'public/characters/ISTP.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Cool-headed craftsperson in half-crouch stance, holding geometric tools.
One eyebrow raised, analytical calm expression.
Cyan and slate grey palette (#0891b2, #64748b) with icy blue highlights.
Practical jacket, utility accessories as geometric shapes.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'ISFJ',
    file: 'public/characters/ISFJ.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Warm protector with arms slightly open in welcoming gesture, soft caring smile.
Gentle teal aura of light around them.
Soft aqua and mint palette (#0d9488, #a7f3d0) with warm cream accents.
Cozy layered outfit, nurturing posture.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'ISFP',
    file: 'public/characters/ISFP.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Free-spirited artist standing relaxed, head slightly tilted.
Holding small geometric palette, soft observant eyes.
Turquoise, seafoam and coral palette (#0e7490, #f87171).
Casual artistic outfit, gentle confident stance.
Small bird shapes as low-poly accents. Flat 2.5D illustration.
Clean white background. Full body visible.`,
  },
  {
    tag: 'ENTJ',
    file: 'public/characters/ENTJ.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Bold commander striding forward, one fist raised, sharp confident expression.
Geometric cape flowing behind. Rich amber and deep gold palette (#d97706, #92400e).
Strong angular silhouette, powerful leadership pose.
Small crown shape as low-poly geometric motif.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'ENTP',
    file: 'public/characters/ENTP.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Witty debater leaning forward with a grin, one finger raised making a point.
Surrounded by small floating question mark polygons.
Bright amber and warm yellow palette (#f59e0b, #fbbf24).
Animated expressive face, casual smart outfit.
Chaotic but fun geometric shapes orbiting them.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'ENFJ',
    file: 'public/characters/ENFJ.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Charismatic leader with arms wide open, radiant warm smile.
Golden light emanating from chest as expanding polygon rings.
Warm gold and amber palette (#d97706, #fcd34d) with soft bronze highlights.
Inspiring confident posture, connection-focused gesture.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'ENFP',
    file: 'public/characters/ENFP.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Enthusiastic figure mid-jump, arms out, huge smile.
Surrounded by bursting confetti as colorful low-poly triangles.
Bright sunny yellow, warm amber and peach palette (#fbbf24, #fb923c).
Energetic playful pose, expressive eyes full of excitement.
Stars and sparkles as geometric polygon bursts.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'ESTJ',
    file: 'public/characters/ESTJ.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Decisive executive standing with authority, arms crossed, chin raised.
Wearing structured geometric-patterned blazer.
Bold crimson and deep red palette (#dc2626, #991b1b).
Sharp focused expression, organized powerful stance.
Small briefcase shape as low-poly nearby.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'ESTP',
    file: 'public/characters/ESTP.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Daring risk-taker in dynamic action pose, leaning forward with sly grin.
One hand gesturing boldly toward viewer.
Vivid red and coral palette (#ef4444, #f97316) with energetic orange-red.
Streetwise confident look, stylish casual outfit with geometric details.
Speed lines as angular polygon shapes nearby.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'ESFJ',
    file: 'public/characters/ESFJ.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Warm socialite with hands on hips, bright welcoming smile.
Surrounded by small floating geometric heart and star shapes.
Rose red and warm pink palette (#f43f5e, #fb7185). Friendly coral accents.
Neat cheerful outfit, approachable body language.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  {
    tag: 'ESFP',
    file: 'public/characters/ESFP.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric cartoon character, 16personalities.com style.
Spotlight-loving performer in theatrical pose, one arm raised, one leg kicked back.
Dazzling smile, confetti exploding as colorful triangles around them.
Hot red and vibrant coral palette (#dc2626, #fb923c) with gold spotlight accents.
Glamorous expressive outfit, pure stage energy.
Flat 2.5D illustration. Clean white background. Full body visible.`,
  },
  // ── 卡牌类型插图（6张，用于卡牌 art 区域） ────────────────────────────────────
  {
    tag: 'card-art-attack',
    file: 'public/card-art/attack.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric card illustration for an ATTACK type card in a personality card game.
A sharp crystalline sword or blade made entirely of geometric triangles and polygons,
crackling with red and orange energy fragments exploding outward.
Dynamic diagonal composition. Dark background (#0a0d14).
Vivid red (#ef4444) and deep crimson energy shards.
No characters, no text. Square composition. Pure abstract geometric action art.
Flat polygon illustration with dramatic inner glow on the blade edges.`,
  },
  {
    tag: 'card-art-defense',
    file: 'public/card-art/defense.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric card illustration for a DEFENSE type card in a personality card game.
A hexagonal shield made of interlocking geometric polygons, emanating cyan and blue energy.
Concentric protective rings of triangles expanding outward from center.
Stable centered composition. Dark background (#0a0d14).
Deep teal (#0891b2) and ice blue (#60a5fa) color palette.
No characters, no text. Square composition. Abstract geometric fortress art.
Flat polygon illustration with cool inner radiance.`,
  },
  {
    tag: 'card-art-resonance',
    file: 'public/card-art/resonance.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric card illustration for a RESONANCE type card in a personality card game.
Two geometric diamond shapes connected by flowing energy lines and polygon chains.
Intertwined violet light streams forming an infinity-like bond between the shapes.
Soft centered composition. Dark background (#0a0d14).
Deep violet (#7c3aed) and soft lavender (#c4b5fd) palette with warm pink accents.
No characters, no text. Square composition. Abstract geometric connection art.
Flat polygon illustration with glowing resonance energy between the two shapes.`,
  },
  {
    tag: 'card-art-info',
    file: 'public/card-art/info.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric card illustration for an INFO / RECON type card in a personality card game.
A stylized geometric eye made of triangular polygons, iris formed by concentric diamond rings.
Rays of cyan light radiating outward from the pupil like searchlight beams.
Mysterious centered composition. Dark background (#0a0d14).
Teal cyan (#67e8f9) and deep navy palette with subtle electric highlights.
No characters, no text. Square composition. Abstract geometric surveillance art.
Flat polygon illustration with eerie inner glow in the pupil.`,
  },
  {
    tag: 'card-art-utility',
    file: 'public/card-art/utility.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric card illustration for a UTILITY type card in a personality card game.
An open geometric book or journal made of angular polygon shapes, pages fanning out
as triangular layers with abstract glowing runes or symbols on each page.
Warm centered composition. Dark background (#0a0d14).
Amber (#f59e0b) and warm gold (#fbbf24) palette with soft orange glow.
No characters, no text. Square composition. Abstract geometric wisdom art.
Flat polygon illustration with warm inner light emanating from the pages.`,
  },
  {
    tag: 'card-art-special',
    file: 'public/card-art/special.png',
    aspectRatio: '1024x1024',
    prompt: `Low-poly geometric card illustration for a SPECIAL type card in a personality card game.
A radiant geometric star or mandala made of layered triangular polygon rings,
with multiple diamond shapes orbiting the center like satellites.
Cosmic mystical composition. Dark background (#0a0d14).
Deep violet (#7c3aed), gold (#f59e0b) and white highlights forming a spectrum.
No characters, no text. Square composition. Abstract geometric cosmic art.
Flat polygon illustration with brilliant multi-color inner glow at center.`,
  },
];

// ─── API 调用 ────────────────────────────────────────────────────────────────

async function generateImage(prompt, aspectRatio) {
  const res = await fetch(`${API_BASE}/v1/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      aspectRatio,
      replyType: 'json',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();

  if (data.status === 'violation') throw new Error('内容违规');
  if (data.status === 'failed') throw new Error(data.error || '生成失败');
  if (data.status !== 'succeeded' || !data.results?.[0]?.url) {
    throw new Error(`未知状态: ${JSON.stringify(data)}`);
  }

  return data.results[0].url;
}

async function downloadFile(url, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);

  const buf = await res.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(buf));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── 过滤参数解析 ─────────────────────────────────────────────────────────────

function getTargetAssets() {
  const onlyIdx = process.argv.indexOf('--only');
  if (onlyIdx === -1) return ASSETS;

  const filter = process.argv[onlyIdx + 1];
  if (!filter) return ASSETS;

  const keys = filter.split(',').map(s => s.trim().toLowerCase());
  return ASSETS.filter(a =>
    keys.some(k =>
      a.tag.toLowerCase() === k ||
      a.tag.toLowerCase().startsWith(k + '-') ||
      a.file.toLowerCase().includes(k)
    )
  );
}

// ─── 主程序 ───────────────────────────────────────────────────────────────────

async function main() {
  const targets = getTargetAssets();
  console.log(`\n🎨 准备生成 ${targets.length} 张素材...\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < targets.length; i++) {
    const asset = targets[i];
    const prefix = `[${i + 1}/${targets.length}]`;

    // 已存在则跳过
    if (fs.existsSync(asset.file)) {
      console.log(`${prefix} ⏭  跳过 (已存在): ${asset.file}`);
      ok++;
      continue;
    }

    process.stdout.write(`${prefix} ⏳ 生成中: ${asset.file} ... `);

    try {
      const url = await generateImage(asset.prompt, asset.aspectRatio);
      await downloadFile(url, asset.file);
      console.log('✓');
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
    }

    // 避免频率限制
    if (i < targets.length - 1) await sleep(1500);
  }

  console.log(`\n完成: ${ok} 成功, ${fail} 失败\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
