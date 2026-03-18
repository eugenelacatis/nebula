import * as THREE from 'three';

const PARTICLE_COUNT = 200;

const vertexShader = `
uniform float uTime;
attribute float aOffset;
attribute float aSpeed;
varying float vDist;

void main() {
  vec3 pos = position;
  pos.x += sin(uTime * aSpeed + aOffset) * 15.0;
  pos.y += cos(uTime * aSpeed * 0.7 + aOffset) * 10.0;
  pos.z += sin(uTime * aSpeed * 0.5 + aOffset * 2.0) * 20.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = 2400.0 / -mvPosition.z;
  vDist = length(pos - position) / 20.0;
}
`;

const fragmentShader = `
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uIntensity;
varying float vDist;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;

  float alpha = (1.0 - dist * 2.0) * uIntensity * 0.4;
  vec3 color = mix(uColor1, uColor2, vDist);
  gl_FragColor = vec4(color, alpha);
}
`;

function hexToVec3(hex: string): THREE.Vector3 {
  try {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  } catch {
    return new THREE.Vector3(1, 1, 1);
  }
}

export class Nebula {
  readonly mesh: THREE.Points;
  private material: THREE.ShaderMaterial;
  private time = 0;

  constructor(scene: THREE.Scene) {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const offsets = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 220;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
      // Float in the background, well behind camera
      positions[i * 3 + 2] = -200 + (Math.random() - 0.5) * 300;
      offsets[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.3 + Math.random() * 0.4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Vector3(0.1, 0.0, 0.3) },
        uColor2: { value: new THREE.Vector3(0.24, 0.1, 0.54) },
        uIntensity: { value: 0.5 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Points(geo, this.material);
    scene.add(this.mesh);
  }

  update(delta: number, primaryColor: string, secondaryColor: string, nebulaIntensity: number) {
    this.time += delta;
    const t = this.time;
    const blend = (Math.sin(t / 8) + 1) / 2;

    const c1 = hexToVec3(primaryColor);
    const c2 = hexToVec3(secondaryColor);

    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uColor1.value.lerpVectors(c1, c2, blend);
    this.material.uniforms.uColor2.value.lerpVectors(c2, c1, blend);
    this.material.uniforms.uIntensity.value = nebulaIntensity;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
