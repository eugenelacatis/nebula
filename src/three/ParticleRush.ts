import * as THREE from 'three';

// Soft radial-gradient sprite → round glowing dots instead of GL squares
function makeCircleSprite(): THREE.Texture {
  const sz = 64;
  const canvas = document.createElement('canvas');
  canvas.width = sz; canvas.height = sz;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, sz, sz);
  return new THREE.CanvasTexture(canvas);
}

const COUNT = 8000;
const FIELD_RADIUS = 200;
const FIELD_DEPTH = 2200;
const RECYCLE_Z = 230; // past camera at z=200

export class ParticleRush {
  readonly points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private speeds: Float32Array;
  private material: THREE.PointsMaterial;

  // New per-particle typed arrays — allocated once, zero heap per frame
  private baseX: Float32Array;
  private baseY: Float32Array;
  private phases: Float32Array;
  private radialVels: Float32Array;
  private bandIndex: Uint8Array;   // 0=bass, 1=mids, 2=highs
  private colScratch = { r: 0, g: 0, b: 0 };
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.positions  = new Float32Array(COUNT * 3);
    this.colors     = new Float32Array(COUNT * 3);
    this.speeds     = new Float32Array(COUNT);
    this.baseX      = new Float32Array(COUNT);
    this.baseY      = new Float32Array(COUNT);
    this.phases     = new Float32Array(COUNT);
    this.radialVels = new Float32Array(COUNT);
    this.bandIndex  = new Uint8Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      this.resetParticle(i, true);
      this.bandIndex[i] = i % 3;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      map: makeCircleSprite(),
      alphaTest: 0.01,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geo, this.material);
    scene.add(this.points);
  }

  private resetParticle(i: number, spreadZ = false) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * FIELD_RADIUS;
    this.positions[i * 3 + 0] = Math.cos(angle) * r;
    this.positions[i * 3 + 1] = Math.sin(angle) * r;
    this.positions[i * 3 + 2] = spreadZ
      ? -Math.random() * FIELD_DEPTH
      : -FIELD_DEPTH;

    this.speeds[i] = 0.5 + Math.random() * 1.0;

    this.colors[i * 3 + 0] = 0.4;
    this.colors[i * 3 + 1] = 0.1;
    this.colors[i * 3 + 2] = 0.8;

    // Store radial base position and turbulence phase
    this.baseX[i] = this.positions[i * 3 + 0];
    this.baseY[i] = this.positions[i * 3 + 1];
    this.phases[i] = Math.random() * Math.PI * 2;
    this.radialVels[i] = 0;
  }

  update(
    delta: number,
    energy: number,
    rawBass: number,
    smoothedBass: number,
    beat: boolean,
    warpSpeedBase: number,
    sizeMultiplier: number,
    primaryColor: string,
    accentColor: string,
    mids: number,
    highs: number
  ) {
    this.time += delta;

    const posAttr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;

    // Speed: base + energy boost + beat surge
    const base = warpSpeedBase * 55;
    const energyBoost = energy * 220 + smoothedBass * 90;
    const beatSurge = beat ? 480 : 0;
    const speed = (base + energyBoost + beatSurge) * delta;

    const pc = new THREE.Color(primaryColor);
    const ac = new THREE.Color(accentColor);

    for (let i = 0; i < COUNT; i++) {
      // ── Forward motion ─────────────────────────────────────────────────────
      this.positions[i * 3 + 2] += speed * this.speeds[i];

      if (this.positions[i * 3 + 2] > RECYCLE_Z) {
        this.resetParticle(i, false);
        continue;
      }

      const phase = this.phases[i];
      const bx = this.baseX[i];
      const by = this.baseY[i];

      // ── Beat burst: radial kick for front-half particles ───────────────────
      if (beat) {
        const z = this.positions[i * 3 + 2];
        if (z > -FIELD_DEPTH / 2) {
          const prox = (z + FIELD_DEPTH) / (FIELD_DEPTH + RECYCLE_Z);
          this.radialVels[i] = 120 * prox;
        }
      }
      if (this.radialVels[i] > 0.5) {
        const dist = Math.sqrt(bx * bx + by * by) + 0.001;
        this.baseX[i] += (bx / dist) * this.radialVels[i] * delta;
        this.baseY[i] += (by / dist) * this.radialVels[i] * delta;
        this.radialVels[i] = Math.max(0, this.radialVels[i] - delta * 400);
      }

      // ── Turbulence: mids-driven lateral sway ───────────────────────────────
      const turbX = Math.sin(this.time * 1.8 + phase) * mids * 28;
      const turbY = Math.cos(this.time * 1.4 + phase) * mids * 17;
      this.positions[i * 3 + 0] = this.baseX[i] + turbX;
      this.positions[i * 3 + 1] = this.baseY[i] + turbY;

      // ── Proximity for brightness ───────────────────────────────────────────
      const z = this.positions[i * 3 + 2];
      const prox = Math.max(0, Math.min(1, (z + FIELD_DEPTH) / (FIELD_DEPTH + RECYCLE_Z)));

      // ── Band coloring ──────────────────────────────────────────────────────
      const band = this.bandIndex[i];
      const col = this.colScratch;
      const bright = 0.2 + prox * 0.5 + (beat ? 0.12 : 0);

      if (band === 0) {
        // Bass: warm amber, flash toward accent on bass hit
        const bassHit = Math.min(1, rawBass * 1.5);
        col.r = (0.95 + (ac.r - 0.95) * bassHit) * bright;
        col.g = (0.55 + (ac.g - 0.55) * bassHit) * bright;
        col.b = (0.05 + (ac.b - 0.05) * bassHit) * bright;
      } else if (band === 1) {
        // Mids: blue-white, intensity tracks mids
        const m = 0.3 + mids * 0.7;
        col.r = (pc.r * 0.6 + 0.4) * m * bright;
        col.g = (pc.g * 0.6 + 0.4) * m * bright;
        col.b = 1.0 * m * bright;
      } else {
        // Highs: cool cyan-teal, intensity tracks highs
        const h = 0.25 + highs * 0.75;
        col.r = 0.0 * h * bright;
        col.g = (0.7 + highs * 0.3) * h * bright;
        col.b = (0.85 + highs * 0.15) * h * bright;
      }

      this.colors[i * 3 + 0] = col.r;
      this.colors[i * 3 + 1] = col.g;
      this.colors[i * 3 + 2] = col.b;
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;

    this.material.size = (2.5 + smoothedBass * 4) * sizeMultiplier;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
