import * as THREE from 'three';

// ─── Shaders ──────────────────────────────────────────────────────────────────

const VERT = /* glsl */`
varying vec3 vWorldPos;
void main() {
  vWorldPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */`
precision highp float;

uniform vec3  uPrimary;
uniform vec3  uSecondary;
uniform vec3  uAccent;
uniform vec3  uBackground;
uniform float uOpacity;
uniform float uScale;
uniform float uWispiness;
uniform float uStarDensity;
uniform float uStarBrightness;
uniform float uEnergy;
uniform float uColorBias;
uniform float uTime;

varying vec3 vWorldPos;

// ── Noise helpers ──────────────────────────────────────────────────────────────

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

// Smooth value noise
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = i.x + i.y * 57.0 + 113.0 * i.z;
  return mix(
    mix(mix(hash(n      ), hash(n +   1.0), f.x),
        mix(hash(n + 57.0), hash(n +  58.0), f.x), f.y),
    mix(mix(hash(n+113.0), hash(n + 114.0), f.x),
        mix(hash(n+170.0), hash(n + 171.0), f.x), f.y),
    f.z
  );
}

// Fractional Brownian Motion — 6 octaves
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p  = p * 2.13 + vec3(1.7, 9.2, 0.3);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vWorldPos);

  // Sample position: cloudScale zooms in/out on the noise field
  vec3 sp = dir * uScale + vec3(uTime * 0.50, uTime * 0.31, uTime * 0.17);

  // ── Domain warp ──────────────────────────────────────────────────────────────
  // High wispiness → heavy warp → soft organic mist.
  // Low wispiness  → no warp   → tight sharp-edged formations.
  vec3 warp = vec3(
    fbm(sp + vec3(0.00, 0.00, 0.00)),
    fbm(sp + vec3(5.20, 1.30, 8.90)),
    fbm(sp + vec3(2.40, 7.10, 3.60))
  );
  vec3 warped = sp + warp * uWispiness * 2.8;

  // Three independent noise layers
  float c1 = fbm(warped);                                    // primary structure
  float c2 = fbm(warped * 1.7  + vec3(1.70, 9.20, 0.30));   // colour variation
  float c3 = fbm(warped * 0.45 + vec3(8.30, 2.80, 5.10));   // large-scale envelope

  // ── Cloud density ─────────────────────────────────────────────────────────────
  // Wispiness shifts the smoothstep range: sharp → narrow hard cutoff, wispy → wide soft fade
  float edgeLo = 0.18 + (1.0 - uWispiness) * 0.22;
  float edgeHi = edgeLo + 0.30 + uWispiness * 0.28;
  float nebula = smoothstep(edgeLo, edgeHi, c1 * (0.65 + c3 * 0.70)) * uOpacity;

  // ── Three-colour blend ────────────────────────────────────────────────────────
  float t1 = smoothstep(0.2, 0.8, mix(c2, 1.0 - c2, uColorBias));
  float t2 = smoothstep(0.65, 1.0, c1 * c3 * 2.2);          // accent on bright peaks only
  vec3 cloudColor = mix(uPrimary, uSecondary, t1);
  cloudColor = mix(cloudColor, uAccent, t2 * 0.55);

  // Soft glow halo around dense cloud regions
  float glow = smoothstep(0.52, 1.0, c3) * 0.14 * uOpacity;

  vec3 nebulaRGB = (cloudColor * nebula + cloudColor * glow) * uEnergy;

  // ── Star field ───────────────────────────────────────────────────────────────
  // Grid resolution scales with starDensity so more stars appear at higher values
  float gridRes = 55.0 + uStarDensity * 260.0;
  vec3  sg      = floor(dir * gridRes);
  float sHash   = hash3(sg);
  float star    = step(1.0 - uStarDensity * 0.018, sHash);
  float sBright = hash3(sg + 0.5)  * 0.75 + 0.25;   // per-star brightness variance
  float sTemp   = hash3(sg + 1.5);                   // 0=blue-white  1=warm-white
  vec3  starRGB = mix(vec3(0.65, 0.82, 1.0), vec3(1.0, 0.95, 0.80), sTemp);

  // ── Final composite ──────────────────────────────────────────────────────────
  vec3 finalColor = uBackground + nebulaRGB + starRGB * star * sBright * uStarBrightness;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ─── Default "cold idle space" shown before any track is selected ─────────────
const DEFAULTS = {
  primaryColor:    '#0a001e',
  secondaryColor:  '#001530',
  accentColor:     '#2020aa',
  backgroundColor: '#000008',
  nebulaOpacity:   0.40,
  cloudScale:      1.8,
  wispiness:       0.65,
  starDensity:     0.38,
  starBrightness:  0.55,
  energy:          0.65,
  animSpeed:       0.25,
  colorBias:       0.5,
};

// Clamps a THREE.Color's HSL lightness so no color is ever too bright for deep space
function constrainColor(color, maxL) {
  const hsl = {};
  color.getHSL(hsl);
  if (hsl.l > maxL) color.setHSL(hsl.h, hsl.s, maxL);
}

// ─── NebulaSkybox ─────────────────────────────────────────────────────────────
export class NebulaSkybox {
  constructor(scene) {
    this._scene     = scene;
    this._time      = 0;
    this._animSpeed = DEFAULTS.animSpeed;

    // Target colour objects — setParams() writes here, update() lerps toward them
    this._tPrimary    = new THREE.Color(DEFAULTS.primaryColor);
    this._tSecondary  = new THREE.Color(DEFAULTS.secondaryColor);
    this._tAccent     = new THREE.Color(DEFAULTS.accentColor);
    this._tBackground = new THREE.Color(DEFAULTS.backgroundColor);

    // Target scalar values
    this._tScalars = {
      nebulaOpacity:  DEFAULTS.nebulaOpacity,
      cloudScale:     DEFAULTS.cloudScale,
      wispiness:      DEFAULTS.wispiness,
      starDensity:    DEFAULTS.starDensity,
      starBrightness: DEFAULTS.starBrightness,
      energy:         DEFAULTS.energy,
      colorBias:      DEFAULTS.colorBias,
    };

    const geo = new THREE.SphereGeometry(300, 32, 32);
    this._mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      side:           THREE.BackSide,
      depthWrite:     false,
      uniforms: {
        uPrimary:        { value: new THREE.Color(DEFAULTS.primaryColor) },
        uSecondary:      { value: new THREE.Color(DEFAULTS.secondaryColor) },
        uAccent:         { value: new THREE.Color(DEFAULTS.accentColor) },
        uBackground:     { value: new THREE.Color(DEFAULTS.backgroundColor) },
        uOpacity:        { value: DEFAULTS.nebulaOpacity },
        uScale:          { value: DEFAULTS.cloudScale },
        uWispiness:      { value: DEFAULTS.wispiness },
        uStarDensity:    { value: DEFAULTS.starDensity },
        uStarBrightness: { value: DEFAULTS.starBrightness },
        uEnergy:         { value: DEFAULTS.energy },
        uColorBias:      { value: DEFAULTS.colorBias },
        uTime:           { value: 0 },
      },
    });

    this._mesh = new THREE.Mesh(geo, this._mat);
    this._mesh.renderOrder = -1;
    scene.add(this._mesh);
  }

  // ─── Public API ────────────────────────────────────────��────────────────────

  setParams(params) {
    if (params.primaryColor)    { this._tPrimary.set(params.primaryColor);     constrainColor(this._tPrimary,    0.22); }
    if (params.secondaryColor)  { this._tSecondary.set(params.secondaryColor); constrainColor(this._tSecondary,  0.22); }
    if (params.accentColor)     { this._tAccent.set(params.accentColor);       constrainColor(this._tAccent,     0.28); }
    if (params.backgroundColor) { this._tBackground.set(params.backgroundColor); constrainColor(this._tBackground, 0.03); }
    if (params.animSpeed !== undefined) this._animSpeed = params.animSpeed;

    const s = this._tScalars;
    if (params.nebulaOpacity  !== undefined) s.nebulaOpacity  = params.nebulaOpacity;
    if (params.cloudScale     !== undefined) s.cloudScale     = params.cloudScale;
    if (params.wispiness      !== undefined) s.wispiness      = params.wispiness;
    if (params.starDensity    !== undefined) s.starDensity    = params.starDensity;
    if (params.starBrightness !== undefined) s.starBrightness = params.starBrightness;
    if (params.energy         !== undefined) s.energy         = Math.min(params.energy, 0.85);
    if (params.colorBias      !== undefined) s.colorBias      = params.colorBias;
  }

  // Called every frame from NebulaApp._animate()
  update(dt) {
    // Advance time at genre-appropriate speed
    this._time += dt * this._animSpeed;

    const u = this._mat.uniforms;
    // Frame-rate-independent lerp: reaches ~95% of target in ≈1.5 s at 60 fps
    const L = 1.0 - Math.pow(0.008, dt);

    u.uTime.value = this._time;

    u.uPrimary.value.lerp(   this._tPrimary,    L);
    u.uSecondary.value.lerp( this._tSecondary,  L);
    u.uAccent.value.lerp(    this._tAccent,     L);
    u.uBackground.value.lerp(this._tBackground, L);

    const s = this._tScalars;
    u.uOpacity.value        = THREE.MathUtils.lerp(u.uOpacity.value,        s.nebulaOpacity,  L);
    u.uScale.value          = THREE.MathUtils.lerp(u.uScale.value,          s.cloudScale,     L);
    u.uWispiness.value      = THREE.MathUtils.lerp(u.uWispiness.value,      s.wispiness,      L);
    u.uStarDensity.value    = THREE.MathUtils.lerp(u.uStarDensity.value,    s.starDensity,    L);
    u.uStarBrightness.value = THREE.MathUtils.lerp(u.uStarBrightness.value, s.starBrightness, L);
    u.uEnergy.value         = THREE.MathUtils.lerp(u.uEnergy.value,         s.energy,         L);
    u.uColorBias.value      = THREE.MathUtils.lerp(u.uColorBias.value,      s.colorBias,      L);
  }

  dispose() {
    this._scene.remove(this._mesh);
    this._mat.dispose();
    this._mesh.geometry.dispose();
  }
}
