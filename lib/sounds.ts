// Programmatic sound effects using Web Audio API — no audio files needed

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function gain(ac: AudioContext, value: number) {
  const g = ac.createGain();
  g.gain.value = value;
  return g;
}

// ─── Individual sounds ────────────────────────────────────────────────────────

/** Soft card slide when hovering a card */
export function soundCardHover() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
  g.gain.setValueAtTime(0.04, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(g); g.connect(ac.destination);
  osc.start(now); osc.stop(now + 0.06);
}

/** Satisfying whoosh when playing a card */
export function soundCardPlay() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;

  // Noise burst (whoosh)
  const buf = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(400, now + 0.12);
  filter.Q.value = 0.5;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.3, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  src.connect(filter); filter.connect(g); g.connect(ac.destination);
  src.start(now); src.stop(now + 0.12);

  // Click accent
  const osc = ac.createOscillator();
  const g2 = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
  g2.gain.setValueAtTime(0.2, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(g2); g2.connect(ac.destination);
  osc.start(now); osc.stop(now + 0.08);
}

/** Sharp impact for damage */
export function soundDamage() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;

  // Sub kick
  const kick = ac.createOscillator();
  const kg = ac.createGain();
  kick.type = 'sine';
  kick.frequency.setValueAtTime(180, now);
  kick.frequency.exponentialRampToValueAtTime(40, now + 0.18);
  kg.gain.setValueAtTime(0.7, now);
  kg.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  kick.connect(kg); kg.connect(ac.destination);
  kick.start(now); kick.stop(now + 0.18);

  // High crack noise
  const buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const crack = ac.createBufferSource();
  crack.buffer = buf;
  const hpf = ac.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 3000;
  const cg = ac.createGain();
  cg.gain.setValueAtTime(0.4, now);
  cg.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  crack.connect(hpf); hpf.connect(cg); cg.connect(ac.destination);
  crack.start(now); crack.stop(now + 0.05);
}

/** Warm rising tone for heal */
export function soundHeal() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now + i * 0.05);
    g.gain.linearRampToValueAtTime(0.12 / (i + 1), now + i * 0.05 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + i * 0.1);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now + i * 0.05);
    osc.stop(now + 0.8);
  });
}

/** Crystal bell for resonance */
export function soundResonate() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;
  const freqs = [440, 554, 659, 880];
  freqs.forEach((f, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.08 / (i * 0.5 + 1), now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now); osc.stop(now + 1.2);
  });
}

/** Dramatic sweep for phase change */
export function soundPhaseChange() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;

  // Reverse swell
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.25, now + 0.25);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  const lpf = ac.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(300, now);
  lpf.frequency.linearRampToValueAtTime(1200, now + 0.4);
  osc.connect(lpf); lpf.connect(g); g.connect(ac.destination);
  osc.start(now); osc.stop(now + 0.5);

  // Ding on top
  setTimeout(() => {
    const ac2 = getCtx(); if (!ac2) return;
    const t = ac2.currentTime;
    const o2 = ac2.createOscillator();
    const g2 = ac2.createGain();
    o2.type = 'sine';
    o2.frequency.value = 880;
    g2.gain.setValueAtTime(0.2, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o2.connect(g2); g2.connect(ac2.destination);
    o2.start(t); o2.stop(t + 0.6);
  }, 200);
}

/** Soft ping for turn start */
export function soundTurnStart() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
  g.gain.setValueAtTime(0.18, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(g); g.connect(ac.destination);
  osc.start(now); osc.stop(now + 0.4);
}

/** Victory fanfare */
export function soundVictory() {
  const ac = getCtx(); if (!ac) return;
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    const delay = i * 0.12;
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g); g.connect(ac.destination);
    osc.start(t); osc.stop(t + 0.5);
  });
}

/** Card draw — shuffling deal sound */
export function soundDraw() {
  const ac = getCtx(); if (!ac) return;
  [0, 0.06, 0.12].forEach(delay => {
    const t = ac.currentTime + delay;
    const buf = ac.createBuffer(1, ac.sampleRate * 0.04, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1;
    const g = ac.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(f); f.connect(g); g.connect(ac.destination);
    src.start(t); src.stop(t + 0.04);
  });
}

/** Info/reveal — mysterious ascending tone */
export function soundInfo() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;
  [440, 550, 660].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now + i * 0.08);
    g.gain.linearRampToValueAtTime(0.1, now + i * 0.08 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now + i * 0.08); osc.stop(now + 0.6);
  });
}

/** Special/utility — magical shimmer */
export function soundSpecial() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;
  [523, 784, 1047, 1319].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq * 0.8, now + i * 0.04);
    osc.frequency.linearRampToValueAtTime(freq, now + i * 0.04 + 0.1);
    g.gain.setValueAtTime(0.08 / (i + 1), now + i * 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.5);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now + i * 0.04); osc.stop(now + 0.8);
  });
}

/** Discard — card crumple */
export function soundDiscard() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;
  const buf = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  const src = ac.createBufferSource(); src.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
  const g = ac.createGain(); g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  src.connect(f); f.connect(g); g.connect(ac.destination);
  src.start(now); src.stop(now + 0.1);
}

/** Button click */
export function soundClick() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  g.gain.setValueAtTime(0.06, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  osc.connect(g); g.connect(ac.destination);
  osc.start(now); osc.stop(now + 0.04);
}

/** Shield absorb */
export function soundShield() {
  const ac = getCtx(); if (!ac) return;
  const now = ac.currentTime;
  [300, 400, 350].forEach((f, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, now + i * 0.04);
    g.gain.setValueAtTime(0.12, now + i * 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.1);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now + i * 0.04); osc.stop(now + i * 0.04 + 0.1);
  });
}

/** Mute all (user preference) */
let muted = false;
export function toggleMute() { muted = !muted; return muted; }
export function isMuted() { return muted; }

// Wrap all exports with mute check
const wrap = (fn: () => void) => () => { if (!muted) fn(); };
export const playCardHover   = wrap(soundCardHover);
export const playCardPlay    = wrap(soundCardPlay);
export const playDamage      = wrap(soundDamage);
export const playHeal        = wrap(soundHeal);
export const playResonate    = wrap(soundResonate);
export const playPhaseChange = wrap(soundPhaseChange);
export const playTurnStart   = wrap(soundTurnStart);
export const playVictory     = wrap(soundVictory);
export const playClick       = wrap(soundClick);
export const playShield      = wrap(soundShield);
export const playDraw        = wrap(soundDraw);
export const playInfo        = wrap(soundInfo);
export const playSpecial     = wrap(soundSpecial);
export const playDiscard     = wrap(soundDiscard);

// Map effect codes → extra sound to play alongside playCardPlay()
export const EFFECT_SOUNDS: Record<string, () => void> = {
  draw_2: soundDraw, draw_3: soundDraw, draw_3_limit_1: soundDraw,
  draw_1_heal_1: soundDraw, recover_from_discard: soundDraw,
  retrieve_any_discard: soundDraw, copy_last_card: soundDraw, random_card: soundDraw,
  heal_2: soundHeal, heal_3: soundHeal, inner_monologue_heal: soundHeal,
  heal_over_time_2: soundHeal, social_heal: soundHeal, collective_benefit: soundHeal,
  shield_1: soundShield, shield_2x1: soundShield, shield_3: soundShield,
  immunity_round: soundShield, cancel_next_effect_on_self: soundShield,
  resonance_immunity: soundShield,
  build_resonance: soundResonate, force_resonance: soundResonate,
  mass_resonance: soundResonate, random_resonance: soundResonate,
  view_hand_card: soundInfo, view_all_hand: soundInfo, view_discard: soundInfo,
  view_hidden_skill: soundInfo, silent_witness: soundInfo, record_keeper: soundInfo,
  force_discard: soundDiscard, reflect_last_card: soundDiscard,
  redirect_to_caster: soundDiscard, break_all_resonance: soundDiscard,
  extra_action: soundSpecial, skip_for_boost: soundSpecial,
  resonance_boost: soundSpecial, exposure_heal: soundSpecial,
  mass_exposure: soundSpecial, spotlight: soundSpecial,
  collective_will: soundSpecial, declare_rule: soundSpecial,
  rule_enforcement: soundDamage, cancel_contradictory: soundDamage,
  override_next_card: soundSpecial, declare_victory_condition: soundSpecial,
  long_term_trap: soundSpecial, foresight: soundSpecial,
  force_play: soundSpecial, rule_audit: soundSpecial,
  swap_resource: soundSpecial, custom: soundSpecial,
};
