import * as THREE from 'three';
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OrbitControls }   from 'three/examples/jsm/controls/OrbitControls.js';

import { AudioEngine }    from './AudioEngine.js';
import { SynthEngine }    from './SynthEngine.js';
import { ParticleSystem } from './ParticleSystem.js';
import { NebulaSkybox }   from './NebulaSkybox.js';
import { fetchSkyboxParams, presetMetadata } from './claudeService.js';

// ─── NebulaApp ────────────────────────────────────────────────────────────────
// Three.js + audio engine. No DOM manipulation except VU bar widths.
// All UI state is owned by React; React calls the public methods below.
export class NebulaApp {
  constructor(canvas) {
    this.audio  = new AudioEngine();
    this.synth  = null;
    this.ps     = null;

    this.isPlaying       = false;
    this.activePreset    = null;
    this.useUploadedFile = false;
    this.volume          = 0.8;
    this._bloomScale     = 0.46;
    this._particleCount  = 18000;

    this._clock     = new THREE.Clock();
    this._disposed  = false;
    this._raf       = null;

    this._initThree(canvas);
    this.skybox = new NebulaSkybox(this.scene);
    this._animate();
  }

  // ─── Three.js setup ─────────────────────────────────────────────────────────

  _initThree(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene  = new THREE.Scene();
    // Background is handled entirely by NebulaSkybox's sphere shader
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 8, 22);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance   = 5;
    this.controls.maxDistance   = 60;
    this.controls.autoRotate    = true;
    this.controls.autoRotateSpeed = 0.4;
    // Allow full vertical range so user can look from below or above
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3, 0.4, 0.88   // low strength, higher threshold — only true peaks bloom
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    const bgGeo = new THREE.PlaneGeometry(80, 80);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x000010, side: THREE.DoubleSide, transparent: true, opacity: 0.0,
    });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.rotation.x = -Math.PI / 2;
    bg.position.y = -5;
    this.scene.add(bg);

    this._onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
    };
    window.addEventListener('resize', this._onResize);
  }

  // ─── Public API (called by React) ───────────────────────────────────────────

  selectPreset(id) {
    this.useUploadedFile = false;
    this.activePreset    = id;
    this._updateSkybox(presetMetadata(id));
    if (this.isPlaying) this._startPlayback();
  }

  async togglePlay() {
    if (!this.isPlaying) {
      if (!this.audio.context) {
        await this.audio.init();
        this.audio.setVolume(this.volume);
        this.synth = new SynthEngine(this.audio.context, this.audio.gainNode);
        this._rebuildParticles(this._particleCount);
      } else {
        this.audio.resume();
      }

      if (!this.activePreset && !this.useUploadedFile) {
        this.activePreset = 'cosmic-pulse';
        this._updateSkybox(presetMetadata('cosmic-pulse'));
      }

      this._startPlayback();
      this.isPlaying = true;
    } else {
      this._stopPlayback();
      this.isPlaying = false;
    }
    return this.isPlaying;
  }

  setVolume(val) {
    this.volume = val;
    if (this.audio.gainNode) this.audio.setVolume(val);
  }

  setBloom(val) {
    this._bloomScale = val;
  }

  rebuildParticles(count) {
    this._particleCount = count;
    this._rebuildParticles(count);
  }

  async loadUploadedFile(file) {
    if (!this.audio.context) {
      await this.audio.init();
      this.synth = new SynthEngine(this.audio.context, this.audio.gainNode);
      this._rebuildParticles(this._particleCount);
    } else {
      this.audio.resume();
    }

    if (this.synth) this.synth.stop();
    await this.audio.loadFile(file);
    this.useUploadedFile = true;
    this.activePreset    = null;
    this.isPlaying       = true;
    this._updateSkybox({ name: file.name, source: 'user uploaded audio file' });
  }

  dispose() {
    this._disposed = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this.controls?.dispose();
    this.skybox?.dispose();
    this.renderer?.dispose();
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  _startPlayback() {
    if (this.synth) this.synth.stop();
    if (this.useUploadedFile) {
      this.audio.resumeFile();
      return;
    }
    if (this.activePreset) this.synth.play(this.activePreset);
  }

  _stopPlayback() {
    if (this.synth) this.synth.stop();
    if (this.useUploadedFile) {
      this.audio.pauseFile();
    } else if (this.audio.fileNode) {
      try { this.audio.fileNode.stop(); } catch (_) {}
      this.audio.fileNode = null;
    }
  }

  _rebuildParticles(count = 18000) {
    if (this.ps) this.ps.dispose();
    this.ps = new ParticleSystem(this.scene, count);
  }

  // Fire-and-forget: asks Claude for skybox params then smoothly transitions
  async _updateSkybox(metadata) {
    const params = await fetchSkyboxParams(metadata);
    if (params) this.skybox.setParams(params);
  }

  // ─── Render loop ─────────────────────────────────────────────────────────────

  _animate() {
    if (this._disposed) return;
    this._raf = requestAnimationFrame(() => this._animate());

    const dt = this._clock.getDelta();

    if (this.isPlaying) this.audio.update();
    this.controls.update();

    const audioData = this.isPlaying
      ? this.audio
      : { bass: 0, mid: 0, high: 0, overall: 0, energyDelta: 0, beatDetected: false };

    this.bloomPass.strength = 0.05 + this._bloomScale * (0.5 + audioData.bass * 1.5);

    if (this.ps) this.ps.update(dt, audioData);

    this.skybox.update(dt);
    this.composer.render();

    this._updateVU();
  }

  _updateVU() {
    const a = this.isPlaying ? this.audio : null;
    const bars = {
      sub:      a?.subBass          ?? 0,
      bass:     a?.bass             ?? 0,
      mid:      a?.mid              ?? 0,
      presence: a?.presence         ?? 0,
      high:     a?.high             ?? 0,
      centroid: a?.spectralCentroid ?? 0,
      flux:     a?.spectralFlux     ?? 0,
    };
    for (const [key, val] of Object.entries(bars)) {
      const el = document.getElementById(`vu-${key}`);
      if (el) el.style.width = `${(val * 100).toFixed(1)}%`;
    }
    const bpmEl = document.getElementById('vu-bpm');
    if (bpmEl) bpmEl.textContent = (a?.estimatedBPM > 0) ? `${a.estimatedBPM}` : '—';
  }
}
