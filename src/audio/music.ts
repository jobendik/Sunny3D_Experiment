// =============================================================
//  AMBIENT MUSIC  (procedural pentatonic loop)
// =============================================================

import { choice } from '../utils';
import { state } from '../state';
import { getAudioCtx } from './sfx';

let musicTimer: number | null = null;
let musicStep = 0;

const MUSIC_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.26];
const MUSIC_CHORD_BASS = [130.81, 164.81, 196.00, 220.00];

function playMusicStep(): void {
  const audioCtx = getAudioCtx();
  if (!audioCtx || !state.musicOn) return;
  const t = audioCtx.currentTime;

  if (Math.random() > 0.25) {
    const note = choice(MUSIC_SCALE);
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = note;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.55);
  }

  if (musicStep % 4 === 0) {
    const note = MUSIC_CHORD_BASS[Math.floor(musicStep / 4) % 4]!;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = note;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 1.3);
  }
  musicStep++;
}

export function startMusic(): void {
  if (musicTimer !== null) return;
  musicTimer = window.setInterval(playMusicStep, 380);
}

export function stopMusic(): void {
  if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
