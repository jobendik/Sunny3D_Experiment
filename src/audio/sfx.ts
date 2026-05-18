// =============================================================
//  SOUND EFFECTS  (procedural WebAudio)
// =============================================================

type WebKitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let audioCtx: AudioContext | null = null;

export function getAudioCtx(): AudioContext | null {
  return audioCtx;
}

export function ensureAudio(): void {
  if (!audioCtx) {
    try {
      const Ctor = window.AudioContext ?? (window as WebKitWindow).webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    } catch {
      /* unsupported */
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') void audioCtx.resume();
}

export function playTone(
  freq: number,
  dur = 0.08,
  type: OscillatorType = 'sine',
  vol = 0.15,
  attack = 0.005,
  release = 0.04,
): void {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.linearRampToValueAtTime(0, t + dur + release);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t);
  o.stop(t + dur + release + 0.01);
}

export function playNoise(dur = 0.08, vol = 0.08, lp = 2000): void {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const len = Math.floor(audioCtx.sampleRate * dur);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const flt = audioCtx.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.value = lp;
  const g = audioCtx.createGain();
  g.gain.value = vol;
  src.connect(flt);
  flt.connect(g);
  g.connect(audioCtx.destination);
  src.start(t);
}

export const sfx = {
  plow:        (): void => { playNoise(0.18, 0.13, 800); playTone(120, 0.1, 'square', 0.06); },
  plant:       (): void => { playTone(620, 0.05, 'square', 0.08); playTone(840, 0.06, 'sine', 0.06); },
  harvest:     (): void => { playTone(880, 0.06, 'square', 0.10); playTone(1320, 0.08, 'sine', 0.08); playNoise(0.06, 0.04, 5000); },
  coin:        (): void => { playTone(1200, 0.05, 'square', 0.10); playTone(1800, 0.08, 'square', 0.08); },
  cantAfford:  (): void => { playTone(220, 0.12, 'square', 0.10); },
  build:       (): void => { playTone(440, 0.08, 'square', 0.10); playTone(330, 0.10, 'square', 0.08); playNoise(0.1, 0.05, 1500); },
  levelup:     (): void => { for (let i = 0; i < 4; i++) setTimeout(() => playTone(660 + i * 220, 0.12, 'triangle', 0.12), i * 80); },
  produce:     (): void => { playTone(540, 0.06, 'triangle', 0.09); playTone(720, 0.08, 'triangle', 0.07); },
  click:       (): void => { playTone(880, 0.03, 'sine', 0.06); },
  error:       (): void => { playTone(180, 0.15, 'square', 0.12); },
  order:       (): void => { playTone(440, 0.06, 'square', 0.1); playTone(660, 0.06, 'square', 0.08); playTone(880, 0.06, 'square', 0.06); },
  splash:      (): void => { playNoise(0.18, 0.12, 1800); playTone(440, 0.06, 'sine', 0.05); },
  fishCatch:   (): void => { for (let i = 0; i < 5; i++) setTimeout(() => playTone(900 + i * 180, 0.08, 'sine', 0.10), i * 45); },
  achievement: (): void => { for (let i = 0; i < 6; i++) setTimeout(() => playTone(523 + i * 70, 0.12, 'triangle', 0.13), i * 60); },
  quest:       (): void => { for (let i = 0; i < 3; i++) setTimeout(() => playTone(440 + i * 220, 0.1, 'triangle', 0.12), i * 70); },
  crow:        (): void => { playTone(380, 0.08, 'sawtooth', 0.10); playTone(290, 0.10, 'sawtooth', 0.08); playNoise(0.08, 0.04, 3000); },
  rain:        (): void => { /* handled by ambient */ },
  bark:        (): void => { playTone(420, 0.05, 'square', 0.10); playTone(330, 0.08, 'square', 0.08); },
  thunder:     (): void => { playNoise(0.6, 0.20, 200); setTimeout(() => playNoise(0.4, 0.16, 400), 120); },
  bell:        (): void => { playTone(1320, 0.15, 'triangle', 0.10); playTone(1760, 0.18, 'sine', 0.08); },
};
