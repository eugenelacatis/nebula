import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

import { AudioEngine }  from './AudioEngine.js';
import { SynthEngine }  from './SynthEngine.js';
import { ParticleSystem } from './ParticleSystem.js';

// ─── Preset track metadata ────────────────────────────────────────────────────
const PRESETS = [
  {
    id:       'cosmic-pulse',
    label:    'Cosmic Pulse',
    genre:    'Techno / 128 BPM',
    icon:     '⚡',
    color:    '#ff00ff',
  },
  {
    id:       'nebula-drift',
    label:    'Nebula Drift',
    genre:    'Ambient',
    icon:     '🌌',
    color:    '#00d4ff',
  },
  {
    id:       'solar-winds',
    label:    'Solar Winds',
    genre:    'Drum & Bass / 170 BPM',
    icon:     '🌪',
    color:    '#ff6600',
  },
];

// ─── App ──────────────────────────────────────────────────────────────────────
class App {
  constructor() {
    this.audio   = new AudioEngine();
    this.synth   = null;
    this.ps      = null;

    this.isPlaying      = false;
    this.activePreset   = null;
    this.useUploadedFile = false;
    this.volume         = 0.8;

    this._clock      = new THREE.Clock();
    this._mouse      = new THREE.Vector2();
    this._targetRot  = new THREE.Euler();

    this._initThree();
    this._initUI();
    this._animate();
  }

  // ─── Three.js setup ─────────────────────────────────────────────────────────

  _initThree() {
    const canvas = document.getElementById('canvas');

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene  = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010108);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 6, 22);
    this.camera.lookAt(0, 0, 0);

    // Post-processing — bloom
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55, 0.25, 0.6
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    // Nebula background fog-like plane
    const bgGeo  = new THREE.PlaneGeometry(80, 80);
    const bgMat  = new THREE.MeshBasicMaterial({
      color:       0x000010,
      side:        THREE.DoubleSide,
      transparent: true,
      opacity:     0.0,
    });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.rotation.x = -Math.PI / 2;
    bg.position.y = -5;
    this.scene.add(bg);

    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('mousemove', e => {
      this._mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      this._mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  // ─── UI ─────────────────────────────────────────────────────────────────────

  _initUI() {
    // Preset cards
    const grid = document.getElementById('preset-grid');
    PRESETS.forEach(p => {
      const card = document.createElement('div');
      card.className = 'preset-card';
      card.dataset.id = p.id;
      card.innerHTML = `
        <span class="card-icon">${p.icon}</span>
        <span class="card-label">${p.label}</span>
        <span class="card-genre">${p.genre}</span>
      `;
      card.style.setProperty('--accent', p.color);
      card.addEventListener('click', () => this._selectPreset(p.id, card));
      grid.appendChild(card);
    });

    // Play / pause
    document.getElementById('btn-play').addEventListener('click', () => this._togglePlay());

    // Volume
    const volSlider = document.getElementById('vol-slider');
    volSlider.value = this.volume * 100;
    volSlider.addEventListener('input', e => {
      this.volume = e.target.value / 100;
      this.audio.setVolume(this.volume);
    });

    // File upload
    document.getElementById('btn-upload').addEventListener('click', () => {
      document.getElementById('file-input').click();
    });
    document.getElementById('file-input').addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) this._loadUploadedFile(file);
    });

    // Bloom intensity
    const bloomSlider = document.getElementById('bloom-slider');
    bloomSlider.addEventListener('input', e => {
      this.bloomPass.strength = e.target.value / 100 * 1.2;
    });

    // Particle count
    document.getElementById('btn-particles').addEventListener('click', () => {
      const counts = [8000, 18000, 35000];
      const cur = this.ps ? this.ps.count : 18000;
      const next = counts[(counts.indexOf(cur) + 1) % counts.length];
      document.getElementById('btn-particles').textContent = `Particles: ${(next/1000).toFixed(0)}k`;
      this._rebuildParticles(next);
    });
  }

  _selectPreset(id, cardEl) {
    // Deselect all
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
    cardEl.classList.add('active');

    this.useUploadedFile = false;
    this.activePreset    = id;

    // Update uploaded label
    document.getElementById('upload-label').textContent = 'Upload your music';

    if (this.isPlaying) this._startPlayback();
  }

  async _togglePlay() {
    const btn = document.getElementById('btn-play');

    if (!this.isPlaying) {
      // Need AudioContext init on user gesture
      if (!this.audio.context) {
        await this.audio.init();
        this.synth = new SynthEngine(this.audio.context, this.audio.gainNode);

        // Build particle system after audio is ready
        this._rebuildParticles(18000);
      } else {
        this.audio.resume();
      }

      if (!this.activePreset && !this.useUploadedFile) {
        // Default to first preset
        const firstCard = document.querySelector('.preset-card');
        if (firstCard) this._selectPreset(PRESETS[0].id, firstCard);
        else return;
      }

      this._startPlayback();
      this.isPlaying = true;
      btn.textContent = '⏸  Pause';
      btn.classList.add('playing');
    } else {
      this._stopPlayback();
      this.isPlaying = false;
      btn.textContent = '▶  Play';
      btn.classList.remove('playing');
    }
  }

  _startPlayback() {
    if (this.synth) this.synth.stop();

    if (this.useUploadedFile) {
      // File is already connected and playing (looped)
      return;
    }

    if (this.activePreset) {
      this.synth.play(this.activePreset);
    }
  }

  _stopPlayback() {
    if (this.synth) this.synth.stop();
    if (this.audio.fileNode) {
      try { this.audio.fileNode.stop(); } catch(_) {}
      this.audio.fileNode = null;
    }
  }

  async _loadUploadedFile(file) {
    if (!this.audio.context) {
      await this.audio.init();
      this.synth = new SynthEngine(this.audio.context, this.audio.gainNode);
      this._rebuildParticles(18000);
    } else {
      this.audio.resume();
    }

    if (this.synth) this.synth.stop();
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));

    const label = document.getElementById('upload-label');
    label.textContent = `🎵 ${file.name}`;

    await this.audio.loadFile(file);
    this.useUploadedFile = true;
    this.activePreset    = null;
    this.isPlaying       = true;

    const btn = document.getElementById('btn-play');
    btn.textContent = '⏸  Pause';
    btn.classList.add('playing');
  }

  _rebuildParticles(count = 18000) {
    if (this.ps) this.ps.dispose();
    this.ps = new ParticleSystem(this.scene, count);
  }

  // ─── Render loop ─────────────────────────────────────────────────────────────

  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = this._clock.getDelta();

    // Update audio analysis
    this.audio.update();

    // Camera orbit + mouse parallax
    const t = this._clock.elapsedTime;
    this.camera.position.x = Math.sin(t * 0.06) * 22 + this._mouse.x * 1.5;
    this.camera.position.z = Math.cos(t * 0.06) * 22;
    this.camera.position.y = 6 + Math.sin(t * 0.04) * 2 - this._mouse.y * 1.5;
    this.camera.lookAt(0, 0, 0);

    // Bloom reacts to bass
    this.bloomPass.strength = 0.55 + this.audio.bass * 0.35;

    if (this.ps) {
      this.ps.update(dt, this.audio);
    }

    this.composer.render();

    // Update VU bars
    this._updateVU();
  }

  _updateVU() {
    const bars = { bass: this.audio.bass, mid: this.audio.mid, high: this.audio.high };
    ['bass', 'mid', 'high'].forEach(band => {
      const el = document.getElementById(`vu-${band}`);
      if (el) el.style.width = `${(bars[band] * 100).toFixed(1)}%`;
    });
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => new App());
