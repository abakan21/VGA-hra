import * as THREE from 'three';
import { rand, randomUnitVec } from './util';

export function createStarfield(count = 4000): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const radius = 6000;

  for (let i = 0; i < count; i++) {
    const v = randomUnitVec().multiplyScalar(radius * rand(0.7, 1.0));
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;

    const t = Math.random();
    const tint = t < 0.7
      ? new THREE.Color(1, 1, 1)
      : t < 0.85
        ? new THREE.Color(1.0, 0.7, 1.0)
        : new THREE.Color(0.6, 0.9, 1.0);
    const b = rand(0.4, 1.2);
    colors[i * 3]     = tint.r * b;
    colors[i * 3 + 1] = tint.g * b;
    colors[i * 3 + 2] = tint.b * b;

    sizes[i] = rand(1.0, 3.5);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      void main(){
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (500.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor * a * 1.8, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = -1;
  return points;
}

export function createDistantStar(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(400, 48, 32);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vN;
      varying vec3 vWP;
      void main(){
        vN = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position,1.0);
        vWP = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      varying vec3 vN;
      uniform float uTime;
      void main(){
        vec3 base = mix(vec3(1.0,0.55,0.95), vec3(1.0,0.95,0.8), 0.5+0.5*vN.y);
        float flick = 0.92 + 0.08*sin(uTime*2.0);
        gl_FragColor = vec4(base*flick, 1.0);
      }`,
    depthWrite: false,
  });
  const star = new THREE.Mesh(geo, mat);
  star.position.set(-2200, 1400, -3500);
  star.renderOrder = -1;
  star.frustumCulled = false;
  return star;
}
