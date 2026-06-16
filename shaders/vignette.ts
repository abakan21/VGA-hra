// Post-process vignette + film grain pass.

export const VIGNETTE_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);}`;

export const VIGNETTE_FS = `
  uniform sampler2D tDiffuse;
  uniform float uGrain;
  varying vec2 vUv;
  float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
  void main(){
    vec4 col = texture2D(tDiffuse, vUv);
    vec2 p = vUv - 0.5;
    float v = smoothstep(0.85, 0.35, length(p));
    col.rgb *= v;
    float g = (rand(vUv + uGrain) - 0.5) * 0.06;
    col.rgb += g;
    gl_FragColor = col;
  }`;
