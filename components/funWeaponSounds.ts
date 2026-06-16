import { FunWeaponMode } from './funweapons';

// Synthesized shot sounds for the joke weapons that have no audio file.
// Duck = quack, banana = boing, donut = plop. Generated with WebAudio.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

const SYNTH_MODES: FunWeaponMode[] = ['duck', 'banana', 'donut'];

export function hasSynthShot(mode: FunWeaponMode): boolean {
  return SYNTH_MODES.includes(mode);
}

export function playFunWeaponShot(mode: FunWeaponMode): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume().catch(() => undefined);
  const t = audio.currentTime;

  if (mode === 'duck') quack(audio, t);
  else if (mode === 'banana') boing(audio, t);
  else if (mode === 'donut') plop(audio, t);
}

function quack(audio: AudioContext, t: number): void {
  // two short buzzy descending blips
  for (let i = 0; i < 2; i += 1) {
    const start = t + i * 0.07;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, start);
    osc.frequency.exponentialRampToValueAtTime(230, start + 0.08);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
    osc.connect(gain); gain.connect(audio.destination);
    osc.start(start); osc.stop(start + 0.1);
  }
}

function boing(audio: AudioContext, t: number): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(520, t + 0.06);
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.22);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  osc.connect(gain); gain.connect(audio.destination);
  osc.start(t); osc.stop(t + 0.26);
}

function plop(audio: AudioContext, t: number): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.09);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  osc.connect(gain); gain.connect(audio.destination);
  osc.start(t); osc.stop(t + 0.12);
}
