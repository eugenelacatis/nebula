import * as THREE from 'three';

const VERT = /* glsl */ `
  attribute float aScale;
  attribute vec3  aColor;
  attribute vec3  aVelocity;
  attribute float aOffset;
  attribute float aArm;

  uniform float uTime;
  uniform float uWaveAmp;    // 0–1: wave height, driven by bass
  uniform float uWaveSpeed;  // rad/s: how fast the wave travels, driven by energy
  uniform float uWaveK;      // spatial freq: crests per world unit, driven by spectral centroid
  uniform float uEnergy;     // 0–1: overall energy, drives size/alpha breathing
  uniform float uBeat;

  varying vec3  vColor;
  varying float vAlpha;
  varying float vRadiusNorm;
  varying float vArm;

  void main() {
    vColor = aColor;
    vArm   = aArm;

    vec3 pos = position;
    float r  = length(pos.xz);
    vRadiusNorm = clamp(r / 15.0, 0.0, 1.0);

    // Traveling wave outward from center.
    // Two superimposed harmonics at golden-ratio offset create natural interference
    // without any per-frame noise. All three parameters change slowly in JS.
    float wave1 = sin(r * uWaveK        - uTime * uWaveSpeed);
    float wave2 = sin(r * uWaveK * 1.618 - uTime * uWaveSpeed * 0.72 + 1.2);
    // Envelope: fade wave at disk center and outer edge so it looks natural
    float envelope = smoothstep(0.0, 0.25, vRadiusNorm)
                   * (1.0 - smoothstep(0.75, 1.0, vRadiusNorm));
    pos.y += (wave1 * 0.75 + wave2 * 0.25) * uWaveAmp * 2.0 * envelope;

    // Beat: smooth ring expanding from center to outer edge
    float ringR = (1.0 - uBeat) * 16.0;
    float ring  = exp(-(r - ringR) * (r - ringR) * 0.35) * uBeat;
    pos.y += ring * 2.5;
    vec2 radial = length(pos.xz) > 0.001 ? normalize(pos.xz) : vec2(0.0);
    pos.x += radial.x * ring * 0.5;
    pos.z += radial.y * ring * 0.5;

    // Slow orbital drift — speed breathes gently with energy
    float angle = uTime * 0.08 + aOffset * 6.2831;
    float drift = 0.002 + uEnergy * 0.004;
    pos.x += sin(angle) * r * drift;
    pos.z += cos(angle) * r * drift;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // Particle size breathes with wave amplitude
    float sz = aScale * (3.0 + uWaveAmp * 3.5) + ring * 6.0;
    gl_PointSize = sz * (300.0 / -mv.z);
    gl_PointSize = clamp(gl_PointSize, 0.5, 12.0);

    vAlpha = 0.18 + uEnergy * 0.12;
  }
`;

const FRAG = /* glsl */ `
  varying vec3  vColor;
  varying float vAlpha;
  varying float vRadiusNorm;
  varying float vArm;

  uniform float uBeat;
  uniform vec3  uCoreColor;
  uniform vec3  uArm0Color;
  uniform vec3  uArm1Color;
  uniform vec3  uArm2Color;

  void main() {
    float d    = length(gl_PointCoord - 0.5) * 2.0;
    float mask = 1.0 - smoothstep(0.5, 1.0, d);
    if (mask < 0.01) discard;

    float isCore = step(vArm, 0.5);
    float isArm0 = (1.0 - isCore) * step(vArm, 1.5);
    float isArm1 = (1.0 - isCore - isArm0) * step(vArm, 2.5);
    float isArm2 = 1.0 - isCore - isArm0 - isArm1;
    vec3 baseColor = uCoreColor * isCore
                   + uArm0Color * isArm0
                   + uArm1Color * isArm1
                   + uArm2Color * isArm2;

    vec3 col = baseColor * (0.6 + vColor.r * 0.4);
    col += uBeat * vec3(1.0, 0.9, 0.5) * 0.15;

    float centerFade = 0.15 + smoothstep(0.0, 0.35, vRadiusNorm) * 0.85;
    gl_FragColor = vec4(col, mask * vAlpha * centerFade);
  }
`;

// Exponential half-life smoothing — time-independent, correct at any framerate.
// halfLife: seconds for value to move halfway toward target.
function expSmooth(current, target, halfLife, dt) {
  return target + (current - target) * Math.pow(0.5, dt / halfLife);
}

export class ParticleSystem {
  constructor(scene, count = 18000) {
    this.count  = count;
    this.scene  = scene;
    this._beat  = 0;
    this._time  = 0;

    // Wave parameter state — all smoothed with different half-lives
    this._wAmp   = 0;    // wave height   — half-life ~80ms  (feels bass)
    this._wSpeed = 1.5;  // wave speed    — half-life 500ms  (feels tempo/energy)
    this._wK     = 1.0;  // spatial freq  — half-life 1000ms (feels brightness/genre)
    this._energy = 0;    // overall energy — half-life 150ms  (for size/alpha)

    this._buildGeometry();
    this._buildMaterial();
    this.mesh = new THREE.Points(this.geo, this.mat);
    scene.add(this.mesh);
  }

  _buildGeometry() {
    const count = this.count;
    const pos   = new Float32Array(count * 3);
    const col   = new Float32Array(count * 3);
    const arm   = new Float32Array(count);
    const scale = new Float32Array(count);
    const vel   = new Float32Array(count * 3);
    const off   = new Float32Array(count);

    this._basePos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const armIdx   = Math.floor(Math.random() * 3);
      const armAngle = (armIdx / 3) * Math.PI * 2;
      const isCore   = Math.random() < 0.04;
      const radius   = isCore ? Math.random() * 3.5 : 3.5 + Math.random() * 12;

      const angle     = armAngle + (radius / 12) * Math.PI * 3.5 + (Math.random() - 0.5) * 0.9;
      const spread    = Math.random() < 0.15 ? 0.5 : 0.25;
      const thickness = (1.0 - radius / 18) * 1.5;

      pos[i3]     = Math.cos(angle) * radius + (Math.random() - 0.5) * spread * radius;
      pos[i3 + 1] = (Math.random() - 0.5) * thickness * 2 + (Math.random() - 0.5) * 0.5;
      pos[i3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * spread * radius;

      this._basePos[i3]     = pos[i3];
      this._basePos[i3 + 1] = pos[i3 + 1];
      this._basePos[i3 + 2] = pos[i3 + 2];

      const variation = Math.random();
      col[i3] = col[i3 + 1] = col[i3 + 2] = variation;

      arm[i] = isCore ? 0 : armIdx + 1;

      scale[i]    = 0.3 + Math.random() * 0.7;
      vel[i3]     = (Math.random() - 0.5) * 0.02;
      vel[i3 + 1] = (Math.random() - 0.5) * 0.01;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.02;
      off[i]      = Math.random();
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position',  new THREE.BufferAttribute(pos,   3));
    this.geo.setAttribute('aColor',    new THREE.BufferAttribute(col,   3));
    this.geo.setAttribute('aArm',      new THREE.BufferAttribute(arm,   1));
    this.geo.setAttribute('aScale',    new THREE.BufferAttribute(scale, 1));
    this.geo.setAttribute('aVelocity', new THREE.BufferAttribute(vel,   3));
    this.geo.setAttribute('aOffset',   new THREE.BufferAttribute(off,   1));
  }

  _buildMaterial() {
    this.uniforms = {
      uTime:      { value: 0 },
      uWaveAmp:   { value: 0 },
      uWaveSpeed: { value: 1.5 },
      uWaveK:     { value: 1.0 },
      uEnergy:    { value: 0 },
      uBeat:      { value: 0 },
      uCoreColor: { value: new THREE.Color('#3a3a7a') },
      uArm0Color: { value: new THREE.Color('#aa22cc') },
      uArm1Color: { value: new THREE.Color('#22aaee') },
      uArm2Color: { value: new THREE.Color('#ee7722') },
    };

    this._targetColors = {
      core: new THREE.Color('#3a3a7a'),
      arm0: new THREE.Color('#aa22cc'),
      arm1: new THREE.Color('#22aaee'),
      arm2: new THREE.Color('#ee7722'),
    };

    this.mat = new THREE.ShaderMaterial({
      uniforms:       this.uniforms,
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
      vertexColors:   false,
    });
  }

  setColorScheme({ coreColor, arm0Color, arm1Color, arm2Color } = {}) {
    if (coreColor) this._targetColors.core.set(coreColor);
    if (arm0Color) this._targetColors.arm0.set(arm0Color);
    if (arm1Color) this._targetColors.arm1.set(arm1Color);
    if (arm2Color) this._targetColors.arm2.set(arm2Color);
  }

  update(dt, audio) {
    this._time += dt;
    this._beat  = Math.max(0, this._beat - dt * 3.5);

    const bass     = audio.bass             || 0;
    const overall  = audio.overall          || 0;
    const centroid = audio.spectralCentroid || 0;

    // Bass → wave amplitude: snappy (80ms half-life) so bass hits feel physical,
    // but never raw-sampled — still 2 frames of smoothing at 60fps.
    this._wAmp = expSmooth(this._wAmp, bass, 0.08, dt);

    // Overall energy → wave propagation speed: slow (500ms) so tempo shifts
    // feel gradual, not sudden. Maps energy 0–1 to speed 1.0–4.0 rad/s.
    const targetSpeed = 1.0 + overall * 3.0;
    this._wSpeed = expSmooth(this._wSpeed, targetSpeed, 0.5, dt);

    // Spectral centroid → spatial frequency: very slow (1s) so the wave pattern
    // morphs with the song's character, not frame-to-frame noise.
    // Bright/high songs → tighter crests; dark/low songs → longer wavelength.
    const targetK = 0.5 + centroid * 1.2;
    this._wK = expSmooth(this._wK, targetK, 1.0, dt);

    // Overall energy for size/alpha breathing (150ms — feels alive but not jittery)
    this._energy = expSmooth(this._energy, overall, 0.15, dt);

    const u = this.uniforms;
    u.uTime.value      = this._time;
    u.uWaveAmp.value   = this._wAmp;
    u.uWaveSpeed.value = this._wSpeed;
    u.uWaveK.value     = this._wK;
    u.uEnergy.value    = this._energy;

    if (audio.beatDetected) this._beat = 1.0;
    u.uBeat.value = this._beat;

    const t = Math.min(dt * 3.0, 1.0);
    u.uCoreColor.value.lerp(this._targetColors.core, t);
    u.uArm0Color.value.lerp(this._targetColors.arm0, t);
    u.uArm1Color.value.lerp(this._targetColors.arm1, t);
    u.uArm2Color.value.lerp(this._targetColors.arm2, t);
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
    this.scene.remove(this.mesh);
  }
}
