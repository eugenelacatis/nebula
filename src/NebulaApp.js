import * as THREE from 'three';
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/examples/jsm/postprocessing/OutputPass.js';

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
    this._particleCount  = 18000;

    this._clock     = new THREE.Clock();
    this._mouse     = new THREE.Vector2();
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
    this.camera.position.set(0, 6, 22);
    this.camera.lookAt(0, 0, 0);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55, 0.25, 0.85   // threshold 0.85: only the very brightest particle cores bloom
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
    this._onMouseMove = e => {
      this._mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      this._mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('resize',    this._onResize);
    window.addEventListener('mousemove', this._onMouseMove);
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
    this.audio.setVolume(val);
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
    window.removeEventListener('resize',    this._onResize);
    window.removeEventListener('mousemove', this._onMouseMove);
    this.skybox?.dispose();
    this.renderer?.dispose();
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  _startPlayback() {
    if (this.synth) this.synth.stop();
    if (this.useUploadedFile) return;
    if (this.activePreset) this.synth.play(this.activePreset);
  }

  _stopPlayback() {
    if (this.synth) this.synth.stop();
    if (this.audio.fileNode) {
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

    this.audio.update();

    const t = this._clock.elapsedTime;
    this.camera.position.x = Math.sin(t * 0.06) * 22 + this._mouse.x * 1.5;
    this.camera.position.z = Math.cos(t * 0.06) * 22;
    this.camera.position.y = 6 + Math.sin(t * 0.04) * 2 - this._mouse.y * 1.5;
    this.camera.lookAt(0, 0, 0);

    this.bloomPass.strength = 0.28 + this.audio.bass * 0.14;

    if (this.ps) this.ps.update(dt, this.audio);

    this.skybox.update(dt);
    this.composer.render();

    this._updateVU();
  }

  _updateVU() {
    const bands = { bass: this.audio.bass, mid: this.audio.mid, high: this.audio.high };
    ['bass', 'mid', 'high'].forEach(band => {
      const el = document.getElementById(`vu-${band}`);
      if (el) el.style.width = `${(bands[band] * 100).toFixed(1)}%`;
    });
  }
}
