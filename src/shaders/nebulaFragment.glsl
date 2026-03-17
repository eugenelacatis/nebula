uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform vec3 uAccentColor;
uniform float uOpacity;
uniform float uBlend;
uniform float uBeatFlash;
varying vec2 vUv;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, dist) * uOpacity;
  vec3 baseColor = mix(uPrimaryColor, uSecondaryColor, uBlend);
  vec3 color = mix(baseColor, uAccentColor, uBeatFlash * 0.6);
  gl_FragColor = vec4(color, alpha);
}
