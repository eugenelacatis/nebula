import * as THREE from 'three';

const VERT = /* glsl */ `
  attribute float aScale;
  attribute vec3  aColor;
  attribute vec3  aVelocity;
  attribute float aOffset;

  uniform float uTime;
  uniform float uBass;
  uniform float uFlux;
  uniform float uBeat;

  varying vec3  vColor;
  varying float vAlpha;
  varying float vRadiusNorm;

  void main() {
    vColor = aColor;

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

  uniform float uBeat;

  void main() {
    float d    = length(gl_PointCoord - 0.5) * 2.0;
    float mask = 1.0 - smoothstep(0.5, 1.0, d);
    if (mask < 0.01) discard;

    vec3 col = vColor;
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
    const col   = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const vel   = new Float32Array(count * 3);
    const off   = new Float32Array(count);

    // Store base positions for reference
    this._basePos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Galaxy / nebula distribution
      const arm     = Math.floor(Math.random() * 3); // 3 spiral arms
      const armAngle = (arm / 3) * Math.PI * 2;
      const radius   = Math.random() < 0.04
        ? Math.random() * 3.5          // sparse core (4%)
        : 3.5 + Math.random() * 12;   // disk

      const angle   = armAngle + (radius / 12) * Math.PI * 3.5 + (Math.random() - 0.5) * 0.9;
      const spread  = Math.random() < 0.15 ? 0.5 : 0.25;
      const thickness = (1.0 - radius / 18) * 1.5;

      pos[i3]     = Math.cos(angle) * radius + (Math.random() - 0.5) * spread * radius;
      pos[i3 + 1] = (Math.random() - 0.5) * thickness * 2 + (Math.random() - 0.5) * 0.5;
      pos[i3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * spread * radius;

      this._basePos[i3]     = pos[i3];
      this._basePos[i3 + 1] = pos[i3 + 1];
      this._basePos[i3 + 2] = pos[i3 + 2];

      // Color based on radius and arm — purple/blue core, teal/pink outer
      const innerT = 1 - Math.min(radius / 15, 1);
      if (innerT > 0.6) {
        // Inner: dim blue-white, centerFade in shader handles the rest
        col[i3]     = 0.25 + Math.random() * 0.15;
        col[i3 + 1] = 0.25 + Math.random() * 0.15;
        col[i3 + 2] = 0.45 + Math.random() * 0.15;
      } else if (arm === 0) {
        // Arm 0: purple/magenta
        col[i3]     = 0.6 + Math.random() * 0.4;
        col[i3 + 1] = 0.1 + Math.random() * 0.3;
        col[i3 + 2] = 0.7 + Math.random() * 0.3;
      } else if (arm === 1) {
        // Arm 1: cyan/blue
        col[i3]     = 0.05 + Math.random() * 0.2;
        col[i3 + 1] = 0.5 + Math.random() * 0.5;
        col[i3 + 2] = 0.8 + Math.random() * 0.2;
      } else {
        // Arm 2: pink/orange
        col[i3]     = 0.9 + Math.random() * 0.1;
        col[i3 + 1] = 0.3 + Math.random() * 0.4;
        col[i3 + 2] = 0.4 + Math.random() * 0.3;
      }

      scale[i]      = 0.3 + Math.random() * 0.7;
      vel[i3]       = (Math.random() - 0.5) * 0.02;
      vel[i3 + 1]   = (Math.random() - 0.5) * 0.01;
      vel[i3 + 2]   = (Math.random() - 0.5) * 0.02;
      off[i]        = Math.random();
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position',  new THREE.BufferAttribute(pos,   3));
    this.geo.setAttribute('aColor',    new THREE.BufferAttribute(col,   3));
    this.geo.setAttribute('aScale',    new THREE.BufferAttribute(scale, 1));
    this.geo.setAttribute('aVelocity', new THREE.BufferAttribute(vel,   3));
    this.geo.setAttribute('aOffset',   new THREE.BufferAttribute(off,   1));
  }

  _buildMaterial() {
    this.uniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uFlux: { value: 0 },
      uBeat: { value: 0 },
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

  update(dt, audio) {
    this._time += dt;
    this._beat  = Math.max(0, this._beat - dt * 4.0);

    const u = this.uniforms;
    u.uTime.value = this._time;
    u.uBass.value = audio.bass          || 0;
    u.uFlux.value = audio.spectralFlux  || 0;

    if (audio.beatDetected) this._beat = 1.0;
    u.uBeat.value = this._beat;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
    this.scene.remove(this.mesh);
  }
}
