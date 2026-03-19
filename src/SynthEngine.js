/**
 * SynthEngine — real-time synthesised music tracks using Web Audio API.
 * No external files needed; everything is generated procedurally.
 */
export class SynthEngine {
  constructor(audioContext, outputNode) {
    this.ctx = audioContext;
    this.out = outputNode;

    this.isPlaying = false;
    this.trackId   = null;
    this._stopFns  = [];

    // Shared convolution reverb
    this._reverb     = this._buildReverb(2.0);
    this._reverbGain = this.ctx.createGain();
    this._reverbGain.gain.value = 0.22;
    this._reverb.connect(this._reverbGain);
    this._reverbGain.connect(this.out);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  play(trackId) {
    this.stop();
    this.trackId   = trackId;
    this.isPlaying = true;
    const builders = {
      'nebula-drift' : () => this._startNebulaDrift(),
    };
    (builders[trackId] || builders['nebula-drift'])();
  }

  stop() {
    this._stopFns.forEach(fn => { try { fn(); } catch(_) {} });
    this._stopFns = [];
    this.isPlaying = false;
  }


  // ─── Track: Nebula Drift (ambient) ──────────────────────────────────────────

  _startNebulaDrift() {
    const chords = [
      [110, 138.6, 164.8],  // A2 C#3 E3
      [98,  130.8, 164.8],  // G2 C3  E3
      [123.5, 155.6, 185],  // B2 Eb3 F#3
      [116.5, 146.8, 174.6],// Bb2 D3 F3
    ];
    let chordIdx = 0;

    const playChord = () => {
      const t   = this.ctx.currentTime;
      const ch  = chords[chordIdx % chords.length];
      ch.forEach(freq => this._pad(freq, t, 5.5, 0.12));
      // High shimmer
      this._shimmer(null, t);
      chordIdx++;
    };

    playChord();
    const id = setInterval(playChord, 5000);

    // Sub-bass drone
    const droneOsc = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    droneOsc.frequency.value = 55;
    droneOsc.type = 'sine';
    droneGain.gain.value = 0.18;
    droneOsc.connect(droneGain);
    droneGain.connect(this.out);
    droneOsc.start();

    this._stopFns.push(() => { clearInterval(id); droneOsc.stop(); });
  }


  // ─── Instrument primitives ───────────────────────────────────────────────────

  _kick(t, gain = 0.9) {
    const osc  = this.ctx.createOscillator();
    const g    = this.ctx.createGain();
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(g); g.connect(this.out);
    osc.start(t); osc.stop(t + 0.5);
  }

  _snare(t, gain = 0.45) {
    // Noise burst + pitched body
    const bufSize = this.ctx.sampleRate * 0.25;
    const buf     = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bpf   = this.ctx.createBiquadFilter();
    bpf.type    = 'bandpass';
    bpf.frequency.value = 1800;
    bpf.Q.value = 0.7;
    const ng    = this.ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(gain, t + 0.003);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    noise.connect(bpf); bpf.connect(ng); ng.connect(this.out);
    noise.start(t); noise.stop(t + 0.25);

    // Body tone
    const osc  = this.ctx.createOscillator();
    const og   = this.ctx.createGain();
    osc.frequency.value = 200;
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(gain * 0.6, t + 0.003);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(og); og.connect(this.out);
    osc.start(t); osc.stop(t + 0.15);
  }

  _hat(t, gain = 0.2) {
    const bufSize = this.ctx.sampleRate * 0.05;
    const buf     = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hpf = this.ctx.createBiquadFilter();
    hpf.type  = 'highpass';
    hpf.frequency.value = 7000;
    const g   = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(hpf); hpf.connect(g); g.connect(this.out);
    src.start(t); src.stop(t + 0.06);
  }

  _bassNote(freq, t, duration, gain = 0.4) {
    const osc  = this.ctx.createOscillator();
    const lpf  = this.ctx.createBiquadFilter();
    const g    = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    lpf.type = 'lowpass';
    lpf.frequency.value = 400;
    lpf.Q.value = 2;

    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.setValueAtTime(gain, t + duration - 0.04);
    g.gain.linearRampToValueAtTime(0, t + duration);

    osc.connect(lpf); lpf.connect(g); g.connect(this.out);
    osc.start(t); osc.stop(t + duration + 0.05);
  }

  _synthLead(freq, t, duration, gain = 0.12) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g    = this.ctx.createGain();
    const lpf  = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 1.006; // slight detune
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(800, t);
    lpf.frequency.linearRampToValueAtTime(4000, t + duration * 0.4);
    lpf.frequency.linearRampToValueAtTime(600, t + duration);
    lpf.Q.value = 3;

    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.setValueAtTime(gain, t + duration - 0.05);
    g.gain.linearRampToValueAtTime(0, t + duration);

    osc1.connect(lpf); osc2.connect(lpf);
    lpf.connect(g); g.connect(this.out);
    g.connect(this._reverb);

    osc1.start(t); osc1.stop(t + duration + 0.05);
    osc2.start(t); osc2.stop(t + duration + 0.05);
  }

  _pad(freq, t, duration, gain = 0.1) {
    const oscs   = [0, 0.015, -0.013, 0.007].map(detune => {
      const o    = this.ctx.createOscillator();
      o.type     = 'sine';
      o.frequency.value = freq * (1 + detune);
      return o;
    });
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 1.2);
    g.gain.setValueAtTime(gain, t + duration - 1.2);
    g.gain.linearRampToValueAtTime(0, t + duration);

    oscs.forEach(o => { o.connect(g); o.start(t); o.stop(t + duration + 0.1); });
    g.connect(this.out);
    g.connect(this._reverb);
  }

  _shimmer(_unused, t) {
    const freqs = [2093, 2349, 2637, 2794]; // C7 D7 E7 F7
    freqs.forEach((f, i) => {
      const delay = i * 0.18;
      const osc   = this.ctx.createOscillator();
      const g     = this.ctx.createGain();
      osc.type    = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(0.04, t + delay + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.8);
      osc.connect(g); g.connect(this.out); g.connect(this._reverb);
      osc.start(t + delay); osc.stop(t + delay + 1);
    });
  }

  // ─── Utilities ───────────────────────────────────────────────────────────────

  _buildReverb(duration) {
    const conv  = this.ctx.createConvolver();
    const sr    = this.ctx.sampleRate;
    const len   = Math.floor(sr * duration);
    const buf   = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
      }
    }
    conv.buffer = buf;
    return conv;
  }
}
