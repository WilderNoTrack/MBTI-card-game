#!/usr/bin/env node
// 为56张卡牌生成专属插图
// 用法: GRSAI_API_KEY=sk-xxx node scripts/generate-card-art.js
//       GRSAI_API_KEY=sk-xxx node scripts/generate-card-art.js --only in_base_1,es_base_6

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GRSAI_API_KEY || '';
const API_BASE = 'https://grsai.dakka.com.cn';

if (!API_KEY) {
  console.error('❌ 请设置 GRSAI_API_KEY');
  process.exit(1);
}

const BASE = `Low-poly geometric card illustration for an MBTI personality card game.
Dark background (#0a0d14). No text, no characters, no UI. Square 1024x1024.
Flat polygon art style with inner glow. Abstract and symbolic.`;

const CARDS = [
  // ═══════════════════════════════════════════════════════
  // IN 组 基础卡
  // ═══════════════════════════════════════════════════════
  {
    id: 'in_base_1', name: '暗中观察',
    prompt: `${BASE}
A single large geometric eye made of triangular polygons, iris formed by concentric diamond rings,
half-open and shadowed. Violet and deep indigo palette (#7c3aed, #1e1b4b).
A subtle dark silhouette of a figure reflected in the pupil. Mysterious and watchful mood.`,
  },
  {
    id: 'in_base_2', name: '长线预判',
    prompt: `${BASE}
A geometric spider web or trap, made of glowing violet thread lines stretching across the frame.
In the center a glowing diamond trap point. Deep violet (#7c3aed) and black palette.
Angular geometric tension lines radiating outward from the trap. Strategic and cold mood.`,
  },
  {
    id: 'in_base_3', name: '内心防线',
    prompt: `${BASE}
A massive crystalline geometric wall made of interlocking violet and indigo polygon slabs,
an interior light glowing behind the cracks. Fortress-like structure.
Deep violet (#4338ca) and ice white highlights. Defensive and cold mood.`,
  },
  {
    id: 'in_base_4', name: '隐藏档案',
    prompt: `${BASE}
A locked geometric vault door covered in angular glowing runes and polygon patterns.
Indigo and violet (#4338ca, #6d28d9) palette with a thin light leak from the sealed edge.
Classified and secretive atmosphere. Data encoded in geometric shapes.`,
  },
  {
    id: 'in_base_5', name: '静默积累',
    prompt: `${BASE}
Stacking geometric crystals growing upward like a tower, each layer adding another polygon shard.
Violet (#7c3aed) gradient from dark bottom to bright luminous top.
Quiet accumulation of power. Patient and vertical composition.`,
  },
  {
    id: 'in_base_6', name: '深度洞察',
    prompt: `${BASE}
A geometric X-ray vision effect: concentric polygon layers peeling back like an onion being sliced open,
each layer a different shade from indigo outer to violet inner to bright white core.
Penetrating vision aesthetic. Violet (#7c3aed) and cyan highlight palette.`,
  },

  // ═══════════════════════════════════════════════════════
  // IS 组 基础卡
  // ═══════════════════════════════════════════════════════
  {
    id: 'is_base_1', name: '警惕守备',
    prompt: `${BASE}
A geometric hexagonal shield with alert scan lines radiating outward like a radar.
Teal and cyan palette (#0891b2, #06b6d4). Solid angular shield center with watchful energy rings.
Alert defensive posture. Electric scan pattern on the shield surface.`,
  },
  {
    id: 'is_base_2', name: '稳健回收',
    prompt: `${BASE}
A geometric recycling loop: three angular arrows forming a triangle cycle, glowing teal.
Cards or geometric shapes moving along the cycle path.
Teal (#0891b2) and steel blue palette. Stable circular composition. Reliable and methodical mood.`,
  },
  {
    id: 'is_base_3', name: '精确打击',
    prompt: `${BASE}
A geometric crosshair or bullseye with concentric square rings, locked on a glowing target point.
Cyan and cold white palette (#06b6d4, #e2e8f0). Laser precision energy lines converging to center.
Sharp, exact, mechanical mood. No wasted energy.`,
  },
  {
    id: 'is_base_4', name: '资源整理',
    prompt: `${BASE}
Geometric resource crystals being sorted and organized into neat angular stacks.
Before: scattered chaotic shapes. After: perfectly aligned columns.
Teal (#0891b2) and ordered gray palette. Clean and methodical composition.`,
  },
  {
    id: 'is_base_5', name: '静默观察',
    prompt: `${BASE}
A pair of geometric binoculars or telescope made of angular polygons,
looking out from darkness toward a distant glowing target.
Cyan (#0891b2) and dark navy palette. Silent surveillance mood. Diagonal composition.`,
  },
  {
    id: 'is_base_6', name: '持久战备',
    prompt: `${BASE}
A geometric fortress tower with a slow-pulsing healing aura radiating outward in soft teal rings.
The tower is solid and unmoved, built from layered polygon bricks.
Teal and emerald (#0891b2, #059669) palette. Endurance and slow recovery mood.`,
  },

  // ═══════════════════════════════════════════════════════
  // EN 组 基础卡
  // ═══════════════════════════════════════════════════════
  {
    id: 'en_base_1', name: '主动连接',
    prompt: `${BASE}
Two geometric nodes reaching toward each other, a sparkling amber energy beam connecting them.
The beam is made of flowing diamond shapes and light particles.
Warm amber (#d97706) and gold (#fbbf24) palette. Warm connection mood. Hopeful composition.`,
  },
  {
    id: 'en_base_2', name: '情绪感染',
    prompt: `${BASE}
Concentric emotional ripple waves spreading outward from a glowing amber core,
each wave ring made of geometric triangles. Energy radiating and infecting the space.
Amber and warm orange (#d97706, #f97316) palette. Infectious energy mood.`,
  },
  {
    id: 'en_base_3', name: '影响扩散',
    prompt: `${BASE}
A geometric mirror effect: one polygon shape splitting and cloning itself,
copies fanning out in multiple directions with amber connecting lines.
Gold (#fbbf24) and amber palette. Duplication and influence spreading. Expansive mood.`,
  },
  {
    id: 'en_base_4', name: '号召力',
    prompt: `${BASE}
A geometric megaphone or speaker shape made of angular polygon panels,
sound waves expanding outward as glowing amber concentric polygon rings.
Warm amber (#d97706) and bright gold palette. Leadership and broadcast mood.`,
  },
  {
    id: 'en_base_5', name: '共情之力',
    prompt: `${BASE}
Multiple geometric diamond shapes resonating together, connected by pulsing amber threads,
vibrating in perfect harmony. The center connection point blazing bright.
Amber and violet accents (#d97706, #a78bfa). Emotional resonance and unity mood.`,
  },
  {
    id: 'en_base_6', name: '公开演说',
    prompt: `${BASE}
A geometric podium or stage with gold light beams projecting outward and upward,
audience shapes (abstract angular forms) in the background responding.
Gold and warm amber (#fbbf24, #d97706) palette. Spotlight and public presence mood.`,
  },

  // ═══════════════════════════════════════════════════════
  // ES 组 基础卡
  // ═══════════════════════════════════════════════════════
  {
    id: 'es_base_1', name: '直接冲击',
    prompt: `${BASE}
A geometric fist or impact burst exploding outward, red and orange polygon shards flying.
The moment of direct impact frozen in time. Central explosion of crimson energy.
Red (#dc2626) and orange (#f97316) palette. Raw power and direct action mood.`,
  },
  {
    id: 'es_base_2', name: '高速行动',
    prompt: `${BASE}
A geometric lightning bolt cracking diagonally across the frame with red speed lines.
Multiple afterimage polygon shapes trailing behind the bolt.
Vivid red (#ef4444) and electric white palette. Speed and decisive action mood.`,
  },
  {
    id: 'es_base_3', name: '强力出击',
    prompt: `${BASE}
A massive geometric cannon or battering ram made of heavy polygon plates,
fire and red energy erupting from the front as it fires.
Deep red (#dc2626) and fire orange palette. Heavy force and consequence mood.`,
  },
  {
    id: 'es_base_4', name: '现场反应',
    prompt: `${BASE}
A geometric chain reaction: one polygon shard hitting another, triggering a cascade of red sparks.
Domino effect of angular shapes falling and igniting each other.
Red (#ef4444) and orange spark palette. Reactive chain and opportunism mood.`,
  },
  {
    id: 'es_base_5', name: '全力以赴',
    prompt: `${BASE}
A geometric supernova or all-out explosion centered in the frame,
every polygon shard flying outward at maximum force. Crimson core blazing white.
Red (#dc2626) to white at the center. No restraint, maximum output mood.`,
  },
  {
    id: 'es_base_6', name: '直觉攻击',
    prompt: `${BASE}
A geometric coin spinning mid-air, one face glowing red (attack) one face glowing dark (fail).
Lightning strike energy beneath the coin. 50/50 gamble frozen in the moment.
Red and shadow palette. Risk and impulsive action mood.`,
  },

  // ═══════════════════════════════════════════════════════
  // INTJ 专属卡
  // ═══════════════════════════════════════════════════════
  {
    id: 'intj_1', name: '战略蓝图',
    prompt: `${BASE}
A geometric blueprint grid glowing violet, showing a complex strategic plan as interconnected nodes and paths.
Multiple layers of polygon lattice overlapping. Cold calculation aesthetic.
Violet (#7c3aed) blueprint grid on dark background. Masterplan and control mood.`,
  },
  {
    id: 'intj_2', name: '终局推演',
    prompt: `${BASE}
A geometric chess endgame scene: angular chess pieces in a decisive final position,
a single glowing violet path showing the inevitable winning move.
Violet and cold white palette. Inevitability and perfect prediction mood.`,
  },

  // INTP 专属卡
  {
    id: 'intp_1', name: '理论推导',
    prompt: `${BASE}
A geometric diagram of logical equations and proof nodes, connected by glowing violet lines.
Mathematical polygon shapes and formula fragments floating like a thought map.
Violet (#6d28d9) and indigo palette. Pure logic and deep thought mood.`,
  },
  {
    id: 'intp_2', name: '矛盾检测',
    prompt: `${BASE}
Two geometric logic chains approaching each other, one ending in a glowing red ERROR symbol.
The contradiction marked by clashing angles and breaking polygon lines.
Violet and red (#7c3aed, #ef4444) palette. Logic flaw detection and negation mood.`,
  },

  // INFJ 专属卡
  {
    id: 'infj_1', name: '预见',
    prompt: `${BASE}
A geometric crystal ball or scrying orb made of layered polygon facets,
showing a future event as glowing symbols inside. Prophetic purple light radiating.
Deep violet (#6d28d9) and mystical soft white palette. Prophecy and fate mood.`,
  },
  {
    id: 'infj_2', name: '沉默见证',
    prompt: `${BASE}
A geometric invisible watcher: an outline silhouette made only of faint violet polygon edges,
standing and observing without being seen. Empty but present.
Faint violet (#7c3aed) barely visible outlines on dark background. Silent omniscience mood.`,
  },

  // INFP 专属卡
  {
    id: 'infp_1', name: '内心独白',
    prompt: `${BASE}
A geometric open journal or diary, pages made of angular polygon layers with glowing text patterns inside.
Soft violet and lilac light emanating from the open pages.
Soft lilac (#c4b5fd) and violet palette. Vulnerability and healing mood.`,
  },
  {
    id: 'infp_2', name: '创伤转化',
    prompt: `${BASE}
A geometric scar or wound shape transforming into a blazing energy source,
dark jagged polygon cracks filling with violet power from within.
Dark cracked polygon to bright violet (#7c3aed) core. Pain-to-strength transformation mood.`,
  },

  // ═══════════════════════════════════════════════════════
  // ISTJ 专属卡
  // ═══════════════════════════════════════════════════════
  {
    id: 'istj_1', name: '规则审查',
    prompt: `${BASE}
A geometric law book or rulebook with teal glowing pages, a magnifying lens hovering over it.
Angular official-looking polygon document with strict grid patterns.
Teal (#0891b2) and cold white palette. Inspection and compliance mood.`,
  },
  {
    id: 'istj_2', name: '记录在案',
    prompt: `${BASE}
A geometric ledger or file with every action logged as glowing teal data lines.
An angular pen or stamp marking an entry. Comprehensive detailed record.
Teal (#0f766e) and data-green palette. Meticulous recording and memory mood.`,
  },

  // ISTP 专属卡
  {
    id: 'istp_1', name: '精准打击',
    prompt: `${BASE}
A geometric sniper scope crosshair perfectly aligned on a glowing target point.
Clean angular lines converging with absolute precision. Ice cold focus.
Cyan (#06b6d4) and cold white palette on black. Clinical precision and silence mood.`,
  },
  {
    id: 'istp_2', name: '静观其变',
    prompt: `${BASE}
A geometric hawk or eagle silhouette made of angular polygon shapes, perched perfectly still,
watching. Below it the world moves as blurred lines but the hawk is motionless.
Teal (#0891b2) and stone gray palette. Patient observation and perfect timing mood.`,
  },

  // ISFJ 专属卡
  {
    id: 'isfj_1', name: '默默守护',
    prompt: `${BASE}
A large geometric shield wrapping around a smaller polygon shape protectively,
warm teal light emanating from between them. Guardian embrace.
Soft teal (#0d9488) and warm mint palette. Quiet protection and care mood.`,
  },
  {
    id: 'isfj_2', name: '记忆保存',
    prompt: `${BASE}
A geometric memory box or treasure chest made of polygon panels,
glowing teal light seeping from the hinges. Old cards or items floating around it.
Teal (#0891b2) and warm gold accent palette. Preservation and gentle retrieval mood.`,
  },

  // ISFP 专属卡
  {
    id: 'isfp_1', name: '当下共鸣',
    prompt: `${BASE}
A single geometric moment frozen: concentric ripple rings expanding from one center point,
each ring made of turquoise polygon triangles. The present moment made visible.
Turquoise (#0e7490) and seafoam palette. Mindfulness and present-moment mood.`,
  },
  {
    id: 'isfp_2', name: '感性防护',
    prompt: `${BASE}
A soft geometric emotional shield: not hard metal but flowing polygon shapes intertwined,
creating an organic protective barrier of turquoise light.
Turquoise (#0d9488) and soft coral accent palette. Emotional sensitivity as armor mood.`,
  },

  // ═══════════════════════════════════════════════════════
  // ENTJ 专属卡
  // ═══════════════════════════════════════════════════════
  {
    id: 'entj_1', name: '战略指挥',
    prompt: `${BASE}
A geometric command center with an amber glowing pointer or arrow directing smaller shapes.
Military precision map with angular target markers and force lines.
Rich amber (#d97706) and gold palette. Authority, command and decisive direction mood.`,
  },
  {
    id: 'entj_2', name: '意志碾压',
    prompt: `${BASE}
A massive geometric force pressing downward, crushing smaller polygon shapes beneath it.
Overwhelming amber-gold weight descending from above with irresistible pressure.
Amber (#d97706) and dark shadow palette. Dominance and overwhelming will mood.`,
  },

  // ENTP 专属卡
  {
    id: 'entp_1', name: '即兴反制',
    prompt: `${BASE}
A geometric deflection shield bouncing an attack back, amber energy redirected at sharp angle.
The counter-move shown as a lightning bounce off an angled polygon surface.
Bright amber (#fbbf24) and electric spark palette. Quick wit and instant reversal mood.`,
  },
  {
    id: 'entp_2', name: '抬杠',
    prompt: `${BASE}
Two geometric lightning bolts clashing, one being fully reflected and reversed back.
The original attack turned completely against its sender. Debate as energy battle.
Amber and violet (#f59e0b, #7c3aed) palette. Verbal reversal and argument mood.`,
  },

  // ENFJ 专属卡
  {
    id: 'enfj_1', name: '感召',
    prompt: `${BASE}
A geometric beacon or lighthouse made of polygon shapes, sending out golden amber light beams
in multiple directions. Smaller shapes being drawn toward the light.
Warm gold (#fbbf24) and amber palette. Inspiration, leadership and calling mood.`,
  },
  {
    id: 'enfj_2', name: '集体意志',
    prompt: `${BASE}
Multiple geometric shapes flowing together into one unified stream, individual polygon pieces
merging into a single powerful amber current. Collective strength.
Gold (#fbbf24) and warm amber palette. Unity, collective flow and shared purpose mood.`,
  },

  // ENFP 专属卡
  {
    id: 'enfp_1', name: '情绪爆发',
    prompt: `${BASE}
A geometric emotional explosion: feelings bursting outward as amber and orange polygon shards,
energy overwhelming and uncontainable. Joyful chaos.
Bright amber (#fbbf24) and vivid orange (#fb923c) palette. Explosive emotion and enthusiasm mood.`,
  },
  {
    id: 'enfp_2', name: '即兴共鸣',
    prompt: `${BASE}
A sudden spontaneous geometric spark connecting two distant polygon nodes by surprise,
golden energy leaping across the gap unexpectedly. Serendipitous connection.
Gold (#fbbf24) and warm glow palette. Spontaneous and joyful resonance mood.`,
  },

  // ═══════════════════════════════════════════════════════
  // ESTJ 专属卡
  // ═══════════════════════════════════════════════════════
  {
    id: 'estj_1', name: '颁布条令',
    prompt: `${BASE}
A geometric law decree or official document scroll made of polygon shapes,
with a glowing red seal stamp pressed onto it. Rules radiating outward as force lines.
Red (#dc2626) and official gold palette. Authority, law and order mood.`,
  },
  {
    id: 'estj_2', name: '秩序执行',
    prompt: `${BASE}
A geometric enforcement strike: red angular lightning hitting multiple target points simultaneously.
Order being imposed by force. Clean straight lines of punishment.
Vivid red (#ef4444) and dark contrast palette. Enforcement, punishment and rule mood.`,
  },

  // ESTP 专属卡
  {
    id: 'estp_1', name: '豪赌',
    prompt: `${BASE}
A geometric coin or dice exploding mid-throw, surrounded by red and gold energy shards.
The high-stakes moment of gambling frozen in the air. Risk made visible.
Red (#dc2626) and gold (#fbbf24) palette. Gambling, risk and explosive chance mood.`,
  },
  {
    id: 'estp_2', name: '危机本能',
    prompt: `${BASE}
A geometric adrenaline surge: sharp red energy spike rising from a near-zero baseline,
danger signals all around but the center figure blazing with instinctive power.
Crimson (#dc2626) and electric white. Crisis clarity and survival instinct mood.`,
  },

  // ESFJ 专属卡
  {
    id: 'esfj_1', name: '社交网络',
    prompt: `${BASE}
A geometric social web: multiple polygon nodes connected by glowing red-pink threads,
forming a warm interconnected network. Community as living structure.
Warm red (#f43f5e) and rose pink palette. Connection, community and social web mood.`,
  },
  {
    id: 'esfj_2', name: '集体利益',
    prompt: `${BASE}
A geometric resource being divided and shared: one shape splitting into multiple portions,
each piece flowing to different recipients connected by warm lines.
Red-pink (#f43f5e) and warm glow palette. Sacrifice, sharing and collective care mood.`,
  },

  // ESFP 专属卡
  {
    id: 'esfp_1', name: '全场焦点',
    prompt: `${BASE}
A geometric spotlight beam hitting center stage, blinding white-gold light focused on one point.
The rest of the world in shadow, the focal point blazing at maximum intensity.
Gold (#fbbf24) and hot red (#ef4444) spotlight palette. Showstopper and all eyes mood.`,
  },
  {
    id: 'esfp_2', name: '即兴表演',
    prompt: `${BASE}
A geometric wild card or random draw: polygon cards flying in all directions from a central burst,
one glowing card standing out from the chaos, chosen by fate.
Red and multi-color (#dc2626, mixed) palette. Spontaneity, surprise and performance mood.`,
  },
];

// ─── API & download ───────────────────────────────────────────────────────────

async function generateImage(prompt, aspectRatio = '1024x1024') {
  const res = await fetch(`${API_BASE}/v1/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'gpt-image-2', prompt, aspectRatio, replyType: 'json' }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.status === 'violation') throw new Error('内容违规');
  if (data.status !== 'succeeded' || !data.results?.[0]?.url) throw new Error(`失败: ${JSON.stringify(data)}`);
  return data.results[0].url;
}

async function downloadFile(url, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败 ${res.status}`);
  fs.writeFileSync(filePath, Buffer.from(await res.arrayBuffer()));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Filter ───────────────────────────────────────────────────────────────────

function getTargets() {
  const idx = process.argv.indexOf('--only');
  if (idx === -1) return CARDS;
  const keys = process.argv[idx + 1]?.split(',').map(s => s.trim()) ?? [];
  return CARDS.filter(c => keys.includes(c.id) || keys.includes(c.name));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const targets = getTargets();
  console.log(`\n🎨 准备生成 ${targets.length} 张卡牌插图...\n`);
  let ok = 0, fail = 0;

  for (let i = 0; i < targets.length; i++) {
    const card = targets[i];
    const file = `public/card-art/${card.id}.png`;
    const prefix = `[${i+1}/${targets.length}]`;

    if (fs.existsSync(file)) {
      console.log(`${prefix} ⏭  跳过: ${card.id} (${card.name})`);
      ok++; continue;
    }

    process.stdout.write(`${prefix} ⏳ ${card.id} (${card.name}) ... `);
    try {
      const url = await generateImage(card.prompt);
      await downloadFile(url, file);
      console.log('✓');
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message}`);
      fail++;
    }

    if (i < targets.length - 1) await sleep(1500);
  }

  console.log(`\n完成：${ok} 成功，${fail} 失败\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
