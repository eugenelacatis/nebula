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
    this.subBass = 0;        // 20–60 Hz physical rumble
    this.presence = 0;       // 2–8 kHz vocal/snap clarity
    this.overall = 0;
    this.energyDelta = 0;
    this.beatDetected = false;

    this.spectralCentroid = 0;  // 0–1, "brightness" of the spectrum
    this.spectralFlux = 0;      // 0–1, frame-to-frame change speed
    this.estimatedBPM = 0;      // beats per minute from beat history

    this._bassHistory = new Array(43).fill(0);
    this._beatCooldown = 0;
    this._prevOverall = 0;
    this._warmup = 0;
    this._prevFreqData = null;
    this._beatTimestamps = [];

    this._fileBuffer           = null;
    this._fileOffset           = 0;
    this._fileStartContextTime = 0;
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

    this._fileBuffer = audioBuffer;
    this._fileOffset = 0;
    this._startFileFrom(0);
    return this.fileNode;
  }

  _startFileFrom(offset) {
    // Reset analysis state so every track start fades in cleanly
    if (offset === 0) {
      this._warmup = 0;
      this._bassHistory.fill(0);
      this._beatCooldown = 20;
      this._beatTimestamps = [];
    }

    const src = this.context.createBufferSource();
    src.buffer = this._fileBuffer;
    src.loop = true;
    this.fileNode = src;
    this._fileStartContextTime = this.context.currentTime;
    this.connectNode(src);
    src.start(0, offset);
  }

  pauseFile() {
    if (!this.fileNode || !this._fileBuffer) return;
    const elapsed = this.context.currentTime - this._fileStartContextTime;
    this._fileOffset = elapsed % this._fileBuffer.duration;
    try { this.fileNode.stop(); this.fileNode.disconnect(); } catch (_) {}
    this.fileNode = null;
  }

  resumeFile() {
    if (!this._fileBuffer) return;
    if (this.context.state === 'suspended') this.context.resume();
    this._startFileFrom(this._fileOffset);
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

    const subBassEnd  = Math.floor(60 / binHz);
    const bassEnd     = Math.floor(250 / binHz);
    const midEnd      = Math.floor(2500 / binHz);
    const presenceEnd = Math.min(Math.floor(8000 / binHz), this.bufferLength - 1);
    const highEnd     = Math.min(Math.floor(16000 / binHz), this.bufferLength - 1);

    this.subBass  = this._avg(0, subBassEnd) / 255;
    this.bass     = this._avg(subBassEnd + 1, bassEnd) / 255;
    this.mid      = this._avg(bassEnd, midEnd) / 255;
    this.presence = this._avg(midEnd, presenceEnd) / 255;
    this.high     = this._avg(presenceEnd, highEnd) / 255;
    this.overall  = this.mid * 0.5 + this.high * 0.5;

    // Frame-to-frame energy change — drives impulse movement in particles
    this.energyDelta = Math.max(0, this.overall - this._prevOverall) * 3.0;
    this._prevOverall = this.overall;

    // Spectral centroid: weighted average frequency bin, normalised 0–1
    let weightedSum = 0, magSum = 0;
    for (let i = 0; i <= highEnd; i++) {
      weightedSum += i * this.dataArray[i];
      magSum      += this.dataArray[i];
    }
    this.spectralCentroid = magSum > 0 ? (weightedSum / magSum) / highEnd : 0;

    // Spectral flux: mean absolute per-bin change since last frame
    if (this._prevFreqData) {
      let flux = 0;
      for (let i = 0; i <= highEnd; i++) {
        flux += Math.abs(this.dataArray[i] - this._prevFreqData[i]);
      }
      this.spectralFlux = Math.min(flux / (highEnd * 255), 1);
    }
    if (!this._prevFreqData) this._prevFreqData = new Uint8Array(this.bufferLength);
    this._prevFreqData.set(this.dataArray);

    // Ramp all output values from 0→1 over the first 90 frames (~1.5s).
    // This prevents the burst of extreme values at track start from slamming the visuals.
    if (this._warmup < 90) this._warmup++;
    const ramp = this._warmup / 90;
    this.bass            *= ramp;
    this.mid             *= ramp;
    this.high            *= ramp;
    this.subBass         *= ramp;
    this.presence        *= ramp;
    this.overall         *= ramp;
    this.spectralFlux    *= ramp;
    this.spectralCentroid *= ramp;

    // Beat detection via local average comparison
    this._bassHistory.push(this.bass);
    this._bassHistory.shift();
    const avgBass = this._bassHistory.reduce((a, b) => a + b, 0) / this._bassHistory.length;

    if (this._warmup < 60) {
      this.beatDetected = false;
    } else if (this._beatCooldown > 0) {
      this._beatCooldown--;
      this.beatDetected = false;
    } else if (this.bass > avgBass * 1.3 && this.bass > 0.15) {
      this.beatDetected = true;
      this._beatCooldown = 10;
      // Track timestamps for BPM estimation
      const now = performance.now();
      this._beatTimestamps.push(now);
      // Keep only recent 8 beats (enough for stable BPM estimate)
      if (this._beatTimestamps.length > 8) this._beatTimestamps.shift();
      if (this._beatTimestamps.length >= 2) {
        const span = this._beatTimestamps.at(-1) - this._beatTimestamps[0];
        const intervals = this._beatTimestamps.length - 1;
        this.estimatedBPM = Math.round(60000 / (span / intervals));
      }
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
