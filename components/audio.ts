export class AudioFx {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  enabled = true;
  private ambient: { gain: GainNode; oscs: OscillatorNode[]; lfo: OscillatorNode; lfoGain: GainNode; filter: BiquadFilterNode } | null = null;

  // AudioContext se nesmi vytvorit pred interakci uzivatele, proto lazy init
  ensure(): boolean {
    if (!this.enabled) return false;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
      } catch { this.enabled = false; return false; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  // zakladni oscilator s volitelnym freq slide, pouzivam pro vetsinu efektu
  private beep(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0) {
    if (!this.ensure() || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  // white noise pres bandpass filtr -- pro exploze a podobne
  private noise(dur: number, vol: number, freq = 600, q = 1) {
    if (!this.ensure() || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur);
  }

  // parametry jsem ladil poslechem, neni veda
  laser()       { this.beep(900, 0.1, 'square', 0.5, -560); this.beep(1400, 0.06, 'square', 0.28, -700); }
  rocket()      { this.beep(220, 0.35, 'sawtooth', 0.5, 120); this.noise(0.3, 0.22, 800, 0.8); }
  explode()     { this.noise(0.6, 0.45, 260, 0.6); this.beep(90, 0.3, 'sawtooth', 0.25, -40); }
  bigExplode()  { this.noise(1.1, 0.55, 160, 0.5); this.beep(60, 0.7, 'square', 0.3, -30); }
  hit()         { this.beep(150, 0.1, 'square', 0.18, -80); }
  pickup()      { this.beep(660, 0.08, 'triangle', 0.2); this.beep(990, 0.12, 'triangle', 0.18); }
  waveStart()   { this.beep(330, 0.15, 'triangle', 0.18); this.beep(495, 0.2, 'triangle', 0.18); }
  gameOver()    { this.beep(440, 0.25, 'sawtooth', 0.2, -200); this.beep(220, 0.5, 'sawtooth', 0.22, -100); }

  startAmbient() {
    if (!this.ensure() || !this.ctx || !this.master || this.ambient) return;
    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 1.5);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 2;
    // LFO na cutoff aby to znelo jako by to "dycha"
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start(t);

    // ctyri oscilatory, testoval jsem ruzne frekvence, tohle znelo nejlip
    const freqs = [55, 82.5, 110, 164.8];
    const types: OscillatorType[] = ['sawtooth', 'sawtooth', 'triangle', 'triangle'];
    const oscs: OscillatorNode[] = [];
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = types[i];
      osc.frequency.value = freqs[i];
      osc.detune.value = (Math.random() - 0.5) * 14;
      osc.connect(filter);
      osc.start(t);
      oscs.push(osc);
    }
    filter.connect(gain).connect(this.master);
    this.ambient = { gain, oscs, lfo, lfoGain, filter };
  }

  stopAmbient() {
    if (!this.ctx || !this.ambient) return;
    const t = this.ctx.currentTime;
    const a = this.ambient;
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setValueAtTime(a.gain.gain.value, t);
    a.gain.gain.linearRampToValueAtTime(0, t + 0.6);
    a.oscs.forEach((o) => o.stop(t + 0.7));
    a.lfo.stop(t + 0.7);
    this.ambient = null;
  }
}
