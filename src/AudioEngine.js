export class AudioEngine {
  constructor() {
    this.context = null;
    this.analyser = null;
    this.gainNode = null;
    this.sourceNode = null;
    this.dataArray = null;
    this.bufferLength = 0;

    this.bass = 0;
    this.mid = 0;
    this.high = 0;
    this.overall = 0;
    this.energyDelta = 0;
    this.beatDetected = false;

    this._bassHistory = new Array(43).fill(0);
    this._beatCooldown = 0;
    this._prevOverall = 0;
  }

  async init() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.78;

    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
  }

  connectNode(node) {
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (_) {}
    }
    node.connect(this.gainNode);
    this.sourceNode = node;
  }

  async loadFile(file) {
    if (this.context.state === 'suspended') await this.context.resume();
    const ab = await file.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(ab);

    if (this.fileNode) {
      try { this.fileNode.stop(); this.fileNode.disconnect(); } catch (_) {}
    }

    const src = this.context.createBufferSource();
    src.buffer = audioBuffer;
    src.loop = true;
    this.fileNode = src;
    this.connectNode(src);
    src.start();
    return src;
  }

  setVolume(v) {
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(2, v)), this.context.currentTime, 0.015);
    }
  }

  resume() {
    if (this.context && this.context.state === 'suspended') this.context.resume();
  }

  update() {
    if (!this.analyser || !this.dataArray) return;
    this.analyser.getByteFrequencyData(this.dataArray);

    const sampleRate = this.context.sampleRate;
    const binHz = sampleRate / this.analyser.fftSize;

    const bassEnd   = Math.floor(250 / binHz);
    const midEnd    = Math.floor(2500 / binHz);
    const highEnd   = Math.min(Math.floor(16000 / binHz), this.bufferLength - 1);

    this.bass    = this._avg(0, bassEnd) / 255;
    this.mid     = this._avg(bassEnd, midEnd) / 255;
    this.high    = this._avg(midEnd, highEnd) / 255;
    this.overall = this.bass * 0.5 + this.mid * 0.3 + this.high * 0.2;

    // Frame-to-frame energy change — drives impulse movement in particles
    this.energyDelta = Math.max(0, this.overall - this._prevOverall) * 3.0;
    this._prevOverall = this.overall;

    // Beat detection via local average comparison
    this._bassHistory.push(this.bass);
    this._bassHistory.shift();
    const avgBass = this._bassHistory.reduce((a, b) => a + b, 0) / this._bassHistory.length;

    if (this._beatCooldown > 0) {
      this._beatCooldown--;
      this.beatDetected = false;
    } else if (this.bass > avgBass * 1.3 && this.bass > 0.15) {
      this.beatDetected = true;
      this._beatCooldown = 10;
    } else {
      this.beatDetected = false;
    }
  }

  _avg(start, end) {
    let s = 0;
    for (let i = start; i <= end; i++) s += this.dataArray[i];
    return s / (end - start + 1);
  }
}
