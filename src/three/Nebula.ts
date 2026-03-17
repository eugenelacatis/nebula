import * as THREE from 'three';

const NEBULA_COUNT = 200;
const NEBULA_SPREAD = 300;

function hexToVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

export class Nebula {
  public group: THREE.Group;
  private points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private rotations: Float32Array;
  private driftSpeeds: Float32Array;
  private time = 0;
  private beatFlash = 0;

  constructor() {
    this.group = new THREE.Group();

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(NEBULA_COUNT * 3);
    this.rotations = new Float32Array(NEBULA_COUNT);
    this.driftSpeeds = new Float32Array(NEBULA_COUNT);

    for (let i = 0; i < NEBULA_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * NEBULA_SPREAD;
      positions[i3 + 1] = (Math.random() - 0.5) * NEBULA_SPREAD * 0.5;
      positions[i3 + 2] = (Math.random() - 0.5) * NEBULA_SPREAD * 2;
      this.rotations[i] = Math.random() * Math.PI * 2;
      this.driftSpeeds[i] = (Math.random() - 0.5) * 0.002;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPrimaryColor: { value: new THREE.Vector3(0.1, 0.1, 0.24) },
        uSecondaryColor: { value: new THREE.Vector3(0.18, 0.18, 0.42) },
        uAccentColor: { value: new THREE.Vector3(0.29, 0.29, 1.0) },
        uOpacity: { value: 0.0 },
        uBlend: { value: 0.0 },
        uBeatFlash: { value: 0.0 },
        uSize: { value: 80.0 },
      },
      vertexShader: `
        uniform float uSize;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uPrimaryColor;
        uniform vec3 uSecondaryColor;
        uniform vec3 uAccentColor;
        uniform float uOpacity;
        uniform float uBlend;
        uniform float uBeatFlash;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float dist = length(uv);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, dist) * uOpacity;
          vec3 baseColor = mix(uPrimaryColor, uSecondaryColor, uBlend);
          vec3 color = mix(baseColor, uAccentColor, uBeatFlash * 0.6);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.group.add(this.points);
  }

  update(
    intensity: number,
    mids: number,
    primaryColor: string,
    secondaryColor: string,
    accentColor: string,
    beat: boolean
  ): void {
    this.time += 0.005;

    if (beat) {
      this.beatFlash = 1.0;
    }
    this.beatFlash *= 0.85;

    const colorBlend = 0.5 + 0.5 * Math.sin(this.time * (2 * Math.PI) / 8) + mids * 0.3;

    this.material.uniforms.uPrimaryColor.value = hexToVec3(primaryColor);
    this.material.uniforms.uSecondaryColor.value = hexToVec3(secondaryColor);
    this.material.uniforms.uAccentColor.value = hexToVec3(accentColor);
    this.material.uniforms.uOpacity.value = intensity;
    this.material.uniforms.uBlend.value = Math.min(1, colorBlend);
    this.material.uniforms.uBeatFlash.value = this.beatFlash;

    const posAttr = this.points.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < NEBULA_COUNT; i++) {
      this.rotations[i] += this.driftSpeeds[i];
      const i3 = i * 3;
      const x = posAttr.array[i3] as number;
      const y = posAttr.array[i3 + 1] as number;
      const cos = Math.cos(this.driftSpeeds[i]);
      const sin = Math.sin(this.driftSpeeds[i]);
      (posAttr.array as Float32Array)[i3] = x * cos - y * sin;
      (posAttr.array as Float32Array)[i3 + 1] = x * sin + y * cos;
    }
    posAttr.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
