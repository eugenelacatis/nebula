import * as THREE from 'three';

const VERT = /* glsl */ `
  attribute float aScale;
  attribute vec3  aColor;
  attribute vec3  aVelocity;
  attribute float aOffset;
  attribute float aArm;

  uniform float uTime;
  uniform float uBass;
  uniform float uFlux;
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

    // Bass drives amplitude, spectral flux drives wave speed
    float omega = 2.0 + uFlux * 3.0;
    float phase = uTime * omega - r * 1.1;
    pos.y += sin(phase) * uBass * 1.2;

    // Beat: ring expands outward from center
    float ringR = (1.0 - uBeat) * 16.0;
    float ring  = exp(-(r - ringR) * (r - ringR) * 0.35) * uBeat;
    pos.y += ring * 2.5;
    vec2 radial = length(pos.xz) > 0.001 ? normalize(pos.xz) : vec2(0.0);
    pos.x += radial.x * ring * 0.5;
    pos.z += radial.y * ring * 0.5;

    // Slow orbital drift
    float angle = uTime * 0.08 + aOffset * 6.2831;
    float drift = 0.002 + uFlux * 0.005;
    pos.x += sin(angle) * r * drift;
    pos.z += cos(angle) * r * drift;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float sz = aScale * (3.5 + uBass * 4.0) + ring * 6.0;
    gl_PointSize = sz * (300.0 / -mv.z);
    gl_PointSize = clamp(gl_PointSize, 0.5, 12.0);

    vAlpha = 0.20 + uFlux * 0.10;
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

    // Pick arm color from uniforms (vArm: 0=core, 1=arm0, 2=arm1, 3=arm2)
    float isCore = step(vArm, 0.5);
    float isArm0 = (1.0 - isCore) * step(vArm, 1.5);
    float isArm1 = (1.0 - isCore - isArm0) * step(vArm, 2.5);
    float isArm2 = 1.0 - isCore - isArm0 - isArm1;
    vec3 baseColor = uCoreColor * isCore
                   + uArm0Color * isArm0
                   + uArm1Color * isArm1
                   + uArm2Color * isArm2;

    // vColor.r holds per-particle brightness variation (0.0–1.0)
    vec3 col = baseColor * (0.6 + vColor.r * 0.4);
    col += uBeat * vec3(1.0, 0.9, 0.5) * 0.15;

    float centerFade = 0.15 + smoothstep(0.0, 0.35, vRadiusNorm) * 0.85;
    gl_FragColor = vec4(col, mask * vAlpha * centerFade);
  }
`;

export class ParticleSystem {
  constructor(scene, count = 18000) {
    this.count  = count;
    this.scene  = scene;
    this._beat  = 0;
    this._time  = 0;
    this._buildGeometry();
    this._buildMaterial();
    this.mesh = new THREE.Points(this.geo, this.mat);
    scene.add(this.mesh);
  }

  _buildGeometry() {
    const count = this.count;
    const pos   = new Float32Array(count * 3);
    const col   = new Float32Array(count * 3); // r=g=b = per-particle brightness variation
    const arm   = new Float32Array(count);     // 0=core, 1=arm0, 2=arm1, 3=arm2
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

      // Per-particle brightness variation stored in all 3 channels equally
      const variation = Math.random();
      col[i3] = col[i3 + 1] = col[i3 + 2] = variation;

      // Arm index: 0=core, 1/2/3 = spiral arms
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
      uBass:      { value: 0 },
      uFlux:      { value: 0 },
      uBeat:      { value: 0 },
      uCoreColor: { value: new THREE.Color('#3a3a7a') },
      uArm0Color: { value: new THREE.Color('#aa22cc') },
      uArm1Color: { value: new THREE.Color('#22aaee') },
      uArm2Color: { value: new THREE.Color('#ee7722') },
    };

    // Target colors for smooth lerping
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
    this._beat  = Math.max(0, this._beat - dt * 4.0);

    const u = this.uniforms;
    u.uTime.value = this._time;
    u.uBass.value = audio.bass          || 0;
    u.uFlux.value = audio.spectralFlux  || 0;

    if (audio.beatDetected) this._beat = 1.0;
    u.uBeat.value = this._beat;

    // Smoothly lerp colors toward targets (~1.5s transition)
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
