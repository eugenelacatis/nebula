import * as THREE from 'three';

function hexToVec3(hex: string): THREE.Vector3 {
  try {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  } catch {
    return new THREE.Vector3(1, 1, 1);
  }
}

// ── Vertex shader ─────────────────────────────────────────────────────────────
// aBary carries barycentric coords (1,0,0)/(0,1,0)/(0,0,1) per triangle vertex
// so the fragment shader can draw wire lines directly on the displaced surface.
const vertexShader = `
attribute vec3    aBary;

uniform sampler2D uFreqTexture;
uniform float     uBass;
uniform float     uDisplaceAmp;
uniform float     uTime;

varying vec3  vBary;
varying float vFreq;
varying vec3  vNormal;
varying vec3  vViewPos;

void main() {
  vBary = aBary;

  vec3  npos  = normalize(position);
  float theta = acos(clamp(npos.y, -1.0, 1.0));
  float phi   = atan(npos.z, npos.x);
  float t     = phi / (2.0 * 3.14159265) + 0.5;

  float freq      = texture2D(uFreqTexture, vec2(t, 0.5)).r;
  float polarFade = sin(theta);

  // Idle ripple — always-visible surface motion when audio is quiet
  float idle     = sin(phi * 5.0 + uTime * 1.3) * cos(theta * 4.0 - uTime * 0.9);
  float idleDisp = idle * 5.0 * (1.0 - freq);

  float displace = freq * polarFade * uDisplaceAmp * 40.0 + idleDisp * polarFade;
  float scale    = 1.0 + uBass * 0.3;

  vec3 displaced = (position + normal * displace) * scale;

  vFreq    = freq * polarFade;
  vNormal  = normalMatrix * normal;
  vViewPos = (modelViewMatrix * vec4(displaced, 1.0)).xyz;

  gl_Position = projectionMatrix * vec4(vViewPos, 1.0);
}
`;

// ── Fragment shader ───────────────────────────────────────────────────────────
// Uses fwidth() (WebGL2 built-in) to compute screen-space edge distance for
// anti-aliased mesh lines that perfectly follow the displaced geometry.
const fragmentShader = `
#extension GL_OES_standard_derivatives : enable

uniform float uEnergy;
uniform float uBeatDecay;
uniform float uWireStrength;    // 0 = no wire, 1 = full wire (from toggle)
uniform vec3  uAccentColor;

varying vec3  vBary;
varying float vFreq;
varying vec3  vNormal;
varying vec3  vViewPos;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(-vViewPos);

  // ── Barycentric wire lines ────────────────────────────────────────────────
  // fwidth gives screen-space derivative → lines stay 1-2px wide regardless of distance
  vec3  fw      = fwidth(vBary);
  vec3  step3   = smoothstep(vec3(0.0), fw * 1.8, vBary);
  float wire    = 1.0 - min(min(step3.x, step3.y), step3.z);  // 1 on edges, 0 interior

  // ── Rim glow at silhouette ────────────────────────────────────────────────
  float rim     = pow(1.0 - abs(dot(N, V)), 3.0);

  // ── Spike glow where freq is high ────────────────────────────────────────
  float spike   = vFreq * vFreq * vFreq * 5.5;

  // ── Color ─────────────────────────────────────────────────────────────────
  // Shift accent slightly toward cyan so idle (white accent) still looks space-y
  vec3 accent   = mix(uAccentColor, vec3(0.15, 0.65, 1.0), 0.4);

  // Very dark body — gives the sphere solid volume
  vec3 body     = vec3(0.01, 0.015, 0.04);

  // Wire lines: bright accent lines on the mesh grid
  vec3 wireCol  = accent * (0.9 + uEnergy * 0.5 + uBeatDecay * 0.4);
  float wireVis = wire * uWireStrength;

  // Rim and spike on top of body
  vec3 col      = body
                + accent * 0.05                              // ambient tint
                + accent * (0.28 + uEnergy * 0.3) * rim     // rim defines sphere shape
                + mix(accent, vec3(1.0), spike * 0.5) * spike  // peaks glow bright
                + wireCol * wireVis * 0.55;                  // mesh grid lines

  // Beat flash
  col = mix(col, accent * 0.85, uBeatDecay * 0.3);

  gl_FragColor = vec4(col, 1.0);
}
`;

export class AudioSphere {
  readonly group: THREE.Group;

  private uniforms: Record<string, THREE.IUniform>;
  private freqBuf:  Uint8Array;
  private freqTex:  THREE.DataTexture;
  private mesh:     THREE.Mesh;

  private beatDecay = 0;
  private time      = 0;
  private rotQuat   = new THREE.Quaternion();
  private dragQuat  = new THREE.Quaternion();
  private autoAxis  = new THREE.Vector3(0.12, 1.0, 0.08).normalize();

  constructor(scene: THREE.Scene) {
    this.freqBuf = new Uint8Array(256);
    this.freqTex = new THREE.DataTexture(
      this.freqBuf, 256, 1, THREE.RedFormat, THREE.UnsignedByteType
    );
    this.freqTex.needsUpdate = true;

    this.uniforms = {
      uFreqTexture: { value: this.freqTex },
      uBass:        { value: 0 },
      uEnergy:      { value: 0 },
      uBeatDecay:   { value: 0 },
      uDisplaceAmp: { value: 1.0 },
      uTime:        { value: 0 },
      uWireStrength:{ value: 1.0 },
      uAccentColor: { value: new THREE.Vector3(0.22, 0.74, 0.97) },
    };

    // Non-indexed so every triangle vertex has a unique barycentric coord
    const baseGeo  = new THREE.IcosahedronGeometry(45, 5);
    const geo      = baseGeo.toNonIndexed();
    geo.computeVertexNormals();   // smooth normals even after toNonIndexed
    baseGeo.dispose();

    // Assign barycentric coords: each group of 3 verts gets (1,0,0),(0,1,0),(0,0,1)
    const count = geo.getAttribute('position').count;
    const bary  = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 3) {
      bary[(i + 0) * 3 + 0] = 1; bary[(i + 0) * 3 + 1] = 0; bary[(i + 0) * 3 + 2] = 0;
      bary[(i + 1) * 3 + 0] = 0; bary[(i + 1) * 3 + 1] = 1; bary[(i + 1) * 3 + 2] = 0;
      bary[(i + 2) * 3 + 0] = 0; bary[(i + 2) * 3 + 1] = 0; bary[(i + 2) * 3 + 2] = 1;
    }
    geo.setAttribute('aBary', new THREE.BufferAttribute(bary, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms:       this.uniforms,
      vertexShader,
      fragmentShader,
      depthWrite:     true,
      depthTest:      true,
    });

    this.mesh             = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = -1;   // opaque, renders before transparent particles

    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.group.position.set(0, 0, -70);
    scene.add(this.group);
  }

  update(
    delta: number,
    frequencyData: Uint8Array,
    bass: number,
    mids: number,
    highs: number,
    energy: number,
    beat: boolean,
    reactivity: number,
    primaryColor: string,
    secondaryColor: string,
    accentColor: string
  ) {
    this.time += delta;

    for (let i = 0; i < 256; i++) {
      this.freqBuf[i] = frequencyData[i * 4] ?? 0;
    }
    this.freqTex.needsUpdate = true;

    if (beat) this.beatDecay = 1.0;
    else       this.beatDecay = Math.max(0, this.beatDecay - delta * 5);

    const ac = hexToVec3(accentColor);

    this.uniforms.uBass.value        = bass;
    this.uniforms.uEnergy.value      = energy;
    this.uniforms.uBeatDecay.value   = this.beatDecay;
    this.uniforms.uDisplaceAmp.value = reactivity;
    this.uniforms.uTime.value        = this.time;
    (this.uniforms.uAccentColor.value as THREE.Vector3).set(ac.x, ac.y, ac.z);

    const speed = 0.05 + energy * 0.18;
    const dq    = new THREE.Quaternion().setFromAxisAngle(this.autoAxis, speed * delta);
    this.rotQuat.premultiply(dq);
    this.group.quaternion.copy(this.dragQuat).multiply(this.rotQuat);
  }

  applyDrag(deltaX: number, deltaY: number) {
    const yaw   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaX);
    const pitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deltaY);
    this.dragQuat.premultiply(yaw).premultiply(pitch);
  }

  setWireframeVisible(v: boolean) {
    this.uniforms.uWireStrength.value = v ? 1.0 : 0.0;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.ShaderMaterial).dispose();
    this.freqTex.dispose();
  }
}
