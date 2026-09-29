// Effets sonores synthétisés avec Web Audio : aucun fichier à charger.
// Le son ne démarre qu'après une action du joueur (règle des navigateurs).

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, opts: { type?: OscillatorType; gain?: number; slideTo?: number } = {}): void {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + duration);
  const peak = opts.gain ?? 0.18;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noise(start: number, duration: number, opts: { gain?: number; freq?: number; q?: number; sweepTo?: number } = {}): void {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const length = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(opts.freq ?? 1200, t0);
  if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + duration);
  filter.Q.value = opts.q ?? 0.8;
  const gain = ac.createGain();
  const peak = opts.gain ?? 0.25;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

/** Note cristalline (clochette) : fondamentale + harmoniques qui s'éteignent plus vite. */
function bell(freq: number, start: number, duration: number, gain = 0.09): void {
  tone(freq, start, duration, { type: 'sine', gain });
  tone(freq * 2, start, duration * 0.6, { type: 'sine', gain: gain * 0.35 });
  tone(freq * 3.01, start, duration * 0.35, { type: 'sine', gain: gain * 0.15 });
}

export const sfx = {
  click: () => tone(660, 0, 0.06, { type: 'triangle', gain: 0.08 }),
  /** sachet qui se froisse puis se déchire */
  tear: () => {
    for (let i = 0; i < 6; i++) noise(i * 0.07, 0.06, { gain: 0.12 + i * 0.02, freq: 3500 + Math.random() * 2500, q: 2 });
    noise(0.42, 0.32, { gain: 0.32, freq: 5200, sweepTo: 900, q: 0.7 });
    tone(140, 0.42, 0.35, { type: 'sine', gain: 0.25, slideTo: 60 });
  },
  whoosh: () => noise(0, 0.45, { gain: 0.22, freq: 400, sweepTo: 3200, q: 1.2 }),
  /** éclat de lumière à l'ouverture */
  burst: () => {
    noise(0, 0.9, { gain: 0.14, freq: 7000, sweepTo: 2500, q: 0.5 });
    [1568, 2093, 2637, 3136].forEach((f, i) => bell(f, 0.05 + i * 0.05, 0.9, 0.035));
  },
  /** carte qui glisse hors du sachet */
  deal: () => noise(0, 0.14, { gain: 0.1, freq: 1800, sweepTo: 4200, q: 1.1 }),
  /** claquement net de la carte qu'on retourne */
  flip: () => {
    noise(0, 0.05, { gain: 0.28, freq: 4200, q: 2.2 });
    tone(220, 0, 0.09, { type: 'sine', gain: 0.18, slideTo: 110 });
  },
  /** notes de révélation : plus la carte est rare, plus l'arpège monte et scintille */
  reveal: (tier: number) => {
    const scales = [
      [784, 988],
      [784, 988, 1175],
      [784, 988, 1175, 1568],
      [659, 831, 988, 1319, 1661],
      [523, 659, 784, 1047, 1319, 1568, 2093],
    ];
    const level = Math.max(0, Math.min(4, tier));
    scales[level].forEach((f, i) => bell(f, i * 0.06, 0.55 + i * 0.05, level >= 3 ? 0.08 : 0.07));
    if (level >= 2) noise(0.05, 0.5 + level * 0.15, { gain: 0.04 + level * 0.015, freq: 8000, q: 0.6 });
  },
  drumroll: (duration = 1.6) => {
    for (let i = 0; i < duration / 0.07; i++) noise(i * 0.07, 0.06, { gain: 0.05 + (i * 0.1) / (duration / 0.07), freq: 180, q: 0.7 });
  },
  fanfare: () => {
    const chords = [
      [392, 494, 587],
      [440, 554, 659],
      [523, 659, 784, 1047],
    ];
    chords.forEach((chord, i) => chord.forEach((f) => tone(f, i * 0.22, i === 2 ? 1.3 : 0.24, { type: 'sawtooth', gain: 0.05 })));
    noise(0.44, 1.2, { gain: 0.12, freq: 6000, q: 0.4 });
    tone(65, 0.44, 0.8, { type: 'sine', gain: 0.35, slideTo: 40 });
  },
  coin: () => {
    tone(988, 0, 0.08, { type: 'square', gain: 0.06 });
    tone(1319, 0.08, 0.25, { type: 'square', gain: 0.06 });
  },
  error: () => tone(220, 0, 0.2, { type: 'sawtooth', gain: 0.07, slideTo: 150 }),
  hit: () => {
    tone(110, 0, 0.25, { type: 'sine', gain: 0.35, slideTo: 50 });
    noise(0, 0.15, { gain: 0.2, freq: 800 });
  },
  ulti: () => {
    tone(220, 0, 0.5, { type: 'sawtooth', gain: 0.06, slideTo: 880 });
    noise(0, 0.5, { gain: 0.15, freq: 500, sweepTo: 5000 });
    tone(1760, 0.45, 0.4, { type: 'triangle', gain: 0.08 });
  },
};
