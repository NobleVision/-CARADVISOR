/**
 * GLSL for the champagne-gold particle car. Vertex handles the scattered →
 * assembled morph (per-point staggered by aRand), the scroll dispersal, and
 * a gentle idle drift. Fragment draws soft round sprites on a gold depth
 * ramp with a subtle twinkle.
 */

export const PARTICLE_VERTEX = /* glsl */ `
  uniform float uProgress;   // 0 = scattered, 1 = assembled
  uniform float uScroll;     // 0..1 hero scroll progress → dispersal
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute vec3 aScatter;
  attribute float aRand;
  varying float vRand;
  varying float vDepth;

  void main() {
    float ease = smoothstep(0.0, 1.0, clamp(uProgress * 1.4 - aRand * 0.4, 0.0, 1.0));
    vec3 pos = mix(aScatter, position, ease);

    // Scroll blows the constellation back toward its scattered field.
    pos += aScatter * uScroll * 1.6;

    // Idle shimmer drift.
    pos.x += sin(uTime * 0.6 + aRand * 6.2831) * 0.012;
    pos.y += cos(uTime * 0.5 + aRand * 12.566) * 0.012;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (1.0 / -mv.z);

    vRand = aRand;
    vDepth = clamp((-mv.z - 3.5) / 6.0, 0.0, 1.0);
  }
`;

export const PARTICLE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  varying float vRand;
  varying float vDepth;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.1, d);

    float twinkle = 0.78 + 0.22 * sin(uTime * 2.0 + vRand * 6.2831);

    vec3 bright = vec3(0.965, 0.831, 0.533);  // #F6D488
    vec3 deep   = vec3(0.788, 0.635, 0.290);  // #C9A24A
    vec3 color  = mix(bright, deep, vDepth);
    // A few hot white-gold sparks.
    color = mix(color, vec3(1.0, 0.96, 0.86), step(0.97, vRand) * 0.6);

    float fade = 1.0 - uScroll * 0.9;
    float a = alpha * twinkle * fade;
    if (a < 0.012) discard;
    gl_FragColor = vec4(color, a);
  }
`;
