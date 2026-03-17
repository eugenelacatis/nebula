import * as THREE from 'three';

const VERT = /* glsl */ `
  attribute float aScale;
  attribute vec3  aColor;
  attribute vec3  aVelocity;
  attribute float aOffset;

  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uOverall;
  uniform float uBeat;

  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;

    // Animate position
    vec3 pos = position;

    // Orbital drift
    float angle = uTime * 0.08 + aOffset * 6.2831;
    float r     = length(pos.xz);
    pos.x += sin(angle) * r * 0.002 * uOverall;
    pos.z += cos(angle) * r * 0.002 * uOverall;

    // Bass pulse — push outward radially
    float bassLift = uBass * 2.8 * aScale;
    pos += normalize(pos) * bassLift;

    // Mid: vertical oscillation
    pos.y += sin(uTime * 1.5 + aOffset * 12.0) * uMid * 1.2;

    // Beat explosion (smoothed via uBeat)
    pos += normalize(pos) * uBeat * 3.5;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // Size: base + audio response
    float sz  = aScale * (4.0 + uBass * 14.0 + uHigh * 6.0);
    sz       += uBeat * 8.0;
    gl_PointSize = sz * (300.0 / -mv.z);
    gl_PointSize = clamp(gl_PointSize, 0.5, 18.0);

    vAlpha = 0.55 + uOverall * 0.45;
  }
`;

const FRAG = /* glsl */ `
  varying vec3  vColor;
  varying float vAlpha;

  uniform float uBass;
  uniform float uHigh;
  uniform float uBeat;

  void main() {
    // Soft circular point
    float d    = length(gl_PointCoord - 0.5) * 2.0;
    float mask = 1.0 - smoothstep(0.5, 1.0, d);
    if (mask < 0.01) discard;

    // Inner bright core
    float core = 1.0 - smoothstep(0.0, 0.45, d);

    vec3 col = vColor;
    col += core * 0.6;                   // bright center
    col += uBass  * vec3(0.8, 0.1, 0.4) * 0.5;
    col += uHigh  * vec3(0.1, 0.6, 1.0) * 0.3;
    col += uBeat  * vec3(1.0, 0.9, 0.5) * 0.4;

    gl_FragColor = vec4(col, mask * vAlpha);
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
      const t  = i / count;

      // Galaxy / nebula distribution
      const arm     = Math.floor(Math.random() * 3); // 3 spiral arms
      const armAngle = (arm / 3) * Math.PI * 2;
      const radius   = Math.random() < 0.15
        ? Math.random() * 3.5          // dense core
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
        // Inner: bright white-blue
        col[i3]     = 0.7 + Math.random() * 0.3;
        col[i3 + 1] = 0.7 + Math.random() * 0.3;
        col[i3 + 2] = 1.0;
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
      uTime:    { value: 0 },
      uBass:    { value: 0 },
      uMid:     { value: 0 },
      uHigh:    { value: 0 },
      uOverall: { value: 0 },
      uBeat:    { value: 0 },
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
    u.uTime.value    = this._time;
    u.uBass.value    = audio.bass    || 0;
    u.uMid.value     = audio.mid     || 0;
    u.uHigh.value    = audio.high    || 0;
    u.uOverall.value = audio.overall || 0;

    if (audio.beatDetected) this._beat = 1.0;
    u.uBeat.value = this._beat;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
    this.scene.remove(this.mesh);
  }
}
