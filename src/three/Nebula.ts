import * as THREE from "three";
import type { SceneConfig } from "@/config/sceneConfig";

const NEBULA_COUNT = 8;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float alpha = uOpacity * (1.0 - smoothstep(0.3, 1.0, d));
  gl_FragColor = vec4(uColor, alpha);
}
`;

export class Nebula {
  readonly group: THREE.Group;
  private meshes: THREE.Mesh[] = [];
  private materials: THREE.ShaderMaterial[] = [];

  constructor() {
    this.group = new THREE.Group();

    for (let i = 0; i < NEBULA_COUNT; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color("#aa44ff") },
          uOpacity: { value: 0.0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const geo = new THREE.PlaneGeometry(60, 60);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        -200 - Math.random() * 600
      );
      mesh.rotation.z = Math.random() * Math.PI * 2;

      this.materials.push(mat);
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  update(energy: number, beat: boolean, config: SceneConfig) {
    const accent = new THREE.Color(config.accentColor);
    const targetOpacity = config.nebulaIntensity * energy;

    this.materials.forEach((mat, i) => {
      mat.uniforms.uColor.value = accent;
      const baseOp = targetOpacity + (beat ? 0.3 : 0);
      mat.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        mat.uniforms.uOpacity.value,
        baseOp * (0.5 + (i % 3) * 0.25),
        0.1
      );
    });
  }

  dispose() {
    this.meshes.forEach((m) => m.geometry.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
