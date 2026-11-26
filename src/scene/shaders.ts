export const foliageVertex = /* glsl */ `
attribute vec3 aChaos;
attribute vec3 aTarget;
attribute vec3 aNormal;
attribute float aSeed;
attribute float aShell;
attribute float aHeight;
uniform float uProgress;
uniform float uTime;
uniform float uPixelRatio;
varying float vSeed;
varying float vShell;
varying float vHeight;
varying float vForm;
varying vec3 vNormal;
varying float vTwinkle;

void main() {
  float delay = aSeed * 0.32;
  float t = smoothstep(delay, min(delay + 0.68, 1.0), uProgress);
  t = t * t * (3.0 - 2.0 * t);

  vec3 pos = mix(aChaos, aTarget, t);
  float arc = sin(3.14159265 * t) * 0.3;
  vec2 radial = pos.xz;
  float rl = length(radial);
  if (rl > 0.0001) radial /= rl;
  pos.xz += radial * arc;
  pos.y += arc * 0.18;

  float drift = 1.0 - t;
  pos.x += sin(uTime * 0.35 + aSeed * 21.0) * 0.16 * drift;
  pos.y += cos(uTime * 0.28 + aSeed * 14.0) * 0.18 * drift;
  pos.z += sin(uTime * 0.24 + aSeed * 9.0) * 0.14 * drift;

  float sway = sin(uTime * 0.55 + aSeed * 17.0 + pos.y * 0.65) * 0.016 * t;
  pos.x += sway;
  pos.z += cos(uTime * 0.48 + aSeed * 11.0) * 0.016 * t;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = mix(5.2, 10.5, aSeed);
  gl_PointSize = clamp(size * uPixelRatio * (36.0 / max(0.2, -mv.z)), 1.6, 40.0);

  vSeed = aSeed;
  vShell = aShell;
  vHeight = aHeight;
  vForm = t;
  vNormal = aNormal;
  float tw = sin(uTime * (1.15 + aSeed * 2.1) + aSeed * 42.0);
  vTwinkle = smoothstep(0.88, 1.0, tw);
}
`

export const foliageFragment = /* glsl */ `
precision highp float;
varying float vSeed;
varying float vShell;
varying float vHeight;
varying float vForm;
varying vec3 vNormal;
varying float vTwinkle;

void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float ang = vSeed * 6.2831853;
  float c = cos(ang);
  float s = sin(ang);
  vec2 r = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  r.x *= 3.2;
  float d = length(r);
  if (d > 0.5) discard;

  vec3 deep = vec3(0.006, 0.042, 0.03);
  vec3 mid = vec3(0.01, 0.12, 0.078);
  vec3 lit = vec3(0.03, 0.22, 0.14);
  float n = fract(sin(vSeed * 127.1) * 43758.5453);
  vec3 col = mix(deep, mid, smoothstep(0.15, 0.95, vShell));
  col = mix(col, lit, pow(vShell, 2.4) * (0.18 + 0.22 * n));

  vec3 silver = vec3(0.50, 0.56, 0.62);
  float rim = smoothstep(0.32, 0.5, d);
  col = mix(col, silver, rim * 0.85);

  float up = clamp(vNormal.y * 0.5 + 0.5, 0.0, 1.0);
  float snow = smoothstep(0.62, 0.98, up);
  snow *= smoothstep(0.55, 1.0, vShell);
  snow += smoothstep(0.72, 1.0, vHeight) * 0.35 * vShell;
  snow *= mix(0.15, 1.0, vForm);
  float cap = smoothstep(0.02, 0.28, -p.y);
  vec3 snowCol = vec3(0.62, 0.66, 0.70);
  col = mix(col, snowCol, clamp(snow, 0.0, 0.72) * cap);

  float sparkleGate = step(0.982, fract(vSeed * 91.7));
  col += vec3(0.82, 0.88, 0.94) * vTwinkle * sparkleGate * 2.4;

  gl_FragColor = vec4(col, 1.0);
}
`

export const settledSnowVertex = /* glsl */ `
attribute vec3 aChaos;
attribute vec3 aTarget;
attribute float aSeed;
attribute float aSize;
uniform float uProgress;
uniform float uTime;
uniform float uPixelRatio;
varying float vAlpha;
varying float vForm;

void main() {
  float delay = aSeed * 0.34;
  float t = smoothstep(delay, min(delay + 0.66, 1.0), uProgress);
  t = t * t * (3.0 - 2.0 * t);
  vec3 pos = mix(aChaos, aTarget, t);
  float arc = sin(3.14159265 * t) * 0.26;
  vec2 radial = pos.xz;
  float rl = length(radial);
  if (rl > 0.0001) radial /= rl;
  pos.xz += radial * arc;
  pos.y += arc * 0.12;
  float drift = 1.0 - t;
  pos.y += sin(uTime * 0.4 + aSeed * 18.0) * 0.12 * drift;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uPixelRatio * (26.0 / max(0.2, -mv.z)), 1.2, 28.0);
  vAlpha = mix(0.45, 0.95, fract(aSeed * 5.7)) * mix(0.35, 1.0, t);
  vForm = t;
}
`

export const settledSnowFragment = /* glsl */ `
precision highp float;
varying float vAlpha;
varying float vForm;

void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);
  float alpha = smoothstep(0.5, 0.12, d) * vAlpha;
  if (alpha < 0.04) discard;
  vec3 col = mix(vec3(0.55, 0.59, 0.64), vec3(0.70, 0.74, 0.78), vForm);
  gl_FragColor = vec4(col, alpha);
}
`

export const fallingSnowVertex = /* glsl */ `
attribute vec3 aOrigin;
attribute float aSeed;
attribute float aSize;
attribute float aSpeed;
uniform float uTime;
uniform float uPixelRatio;
uniform float uSpan;
uniform float uFloor;
varying float vAlpha;

void main() {
  float y = mod(aOrigin.y - uTime * aSpeed, uSpan) + uFloor;
  float x = aOrigin.x + sin(uTime * 0.16 + aSeed * 12.0) * 0.65;
  float z = aOrigin.z + cos(uTime * 0.13 + aSeed * 8.0) * 0.65;
  vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(0.2, -mv.z);
  gl_PointSize = clamp(aSize * uPixelRatio * (22.0 / dist), 1.0, 36.0);
  float closeFade = smoothstep(2.2, 8.0, dist);
  vAlpha = mix(0.16, 0.55, fract(aSeed * 3.1)) * closeFade;
}
`

export const fallingSnowFragment = /* glsl */ `
precision highp float;
varying float vAlpha;

void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);
  float alpha = smoothstep(0.5, 0.08, d) * vAlpha;
  if (alpha < 0.03) discard;
  gl_FragColor = vec4(vec3(0.70, 0.74, 0.78), alpha);
}
`

export const lightVertex = /* glsl */ `
attribute vec3 aColor;
attribute float aSeed;
uniform float uTime;
varying vec3 vColor;

void main() {
  float tw = 0.74 + 0.26 * sin(uTime * (1.5 + aSeed * 2.4) + aSeed * 30.0);
  vColor = aColor * tw * 1.85;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`

export const lightFragment = /* glsl */ `
precision highp float;
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`

export const photoVertex = /* glsl */ `
attribute vec2 aUvOffset;
attribute vec2 aUvScale;
varying vec2 vUv;

void main() {
  vUv = uv * aUvScale + aUvOffset;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`

export const photoFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
varying vec2 vUv;

void main() {
  vec4 tex = sRGBTransferEOTF(texture2D(uMap, vUv));
  vec3 col = tex.rgb * vec3(0.93, 0.97, 1.03);
  float vignette = smoothstep(0.86, 0.28, length(vUv - vec2(0.5)));
  col *= mix(0.72, 1.0, vignette);
  gl_FragColor = vec4(col, 1.0);
}
`
