// Classic "case opening" tick sound, generated with WebAudio (no asset needed).
// Ticks fire each time a card crosses the centre pointer, so they naturally
// slow down as the roulette decelerates — just like CS:GO case openings.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

interface SpinSoundOptions {
  durationMs: number;
  totalDistance: number; // px the track travels
  spacing: number;       // px between card centres
  // CSS cubic-bezier control points (P1, P2); P0=(0,0), P3=(1,1)
  p1x: number; p1y: number; p2x: number; p2y: number;
}

export function playCaseSpinSound(opts: SpinSoundOptions): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume().catch(() => undefined);

  const { durationMs, totalDistance, spacing, p1x, p1y, p2x, p2y } = opts;
  if (totalDistance <= 0 || spacing <= 0) return;

  const bx = (s: number) => 3 * (1 - s) * (1 - s) * s * p1x + 3 * (1 - s) * s * s * p2x + s * s * s;
  const by = (s: number) => 3 * (1 - s) * (1 - s) * s * p1y + 3 * (1 - s) * s * s * p2y + s * s * s;

  // invert the easing: find curve param s where y(s) === targetProgress
  const solveS = (targetY: number): number => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (by(mid) < targetY) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  };

  const cards = Math.floor(totalDistance / spacing);
  const start = audio.currentTime + 0.02;
  const durSec = durationMs / 1000;

  for (let k = 1; k <= cards; k += 1) {
    const progress = (k * spacing) / totalDistance;
    if (progress >= 1) break;
    const s = solveS(progress);
    const t = bx(s) * durSec; // time (seconds) when this card crosses centre
    scheduleTick(audio, start + t, k / cards);
  }
}

function scheduleTick(audio: AudioContext, when: number, progress: number): void {
  // a short, dry percussive click; slightly lower & softer as the spin ends
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = 'square';
  osc.frequency.value = 1500 - progress * 600;

  const peak = 0.16 - progress * 0.05;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.02, peak), when + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);

  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(when);
  osc.stop(when + 0.06);
}
