import * as THREE from 'three';
import { rand, randomUnitVec } from './util';

interface Particle {
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export class ParticlePool {
  private parts: Particle[] = [];
  private cap: number;
  private geo: THREE.BufferGeometry;
  private mat: THREE.ShaderMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  public mesh: THREE.Points;
  private cursor = 0;

  constructor(cap = 800) {
    this.cap = cap;
    for (let i = 0; i < cap; i++) {
      this.parts.push({
        alive: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0, maxLife: 1,
        size: 1,
        color: new THREE.Color(),
      });
    }

    this.positions = new Float32Array(cap * 3);
    this.colors = new Float32Array(cap * 3);
    this.sizes = new Float32Array(cap);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setDrawRange(0, 0);

    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main(){
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (320.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor * a, a);
        }`,
    });
    this.mesh = new THREE.Points(this.geo, this.mat);
    this.mesh.frustumCulled = false;
  }

  private spawn(pos: THREE.Vector3, vel: THREE.Vector3, life: number, size: number, color: THREE.Color) {
    for (let i = 0; i < this.cap; i++) {
      const idx = (this.cursor + i) % this.cap;
      const p = this.parts[idx];
      if (!p.alive) {
        p.alive = true;
        p.pos.copy(pos); p.vel.copy(vel);
        p.life = life; p.maxLife = life;
        p.size = size; p.color.copy(color);
        this.cursor = (idx + 1) % this.cap;
        return;
      }
    }
  }

  emitExplosion(pos: THREE.Vector3, count = 40, power = 18, color = new THREE.Color(1, 0.55, 0.2)) {
    for (let i = 0; i < count; i++) {
      const dir = randomUnitVec().multiplyScalar(rand(power * 0.3, power));
      const c = color.clone().multiplyScalar(rand(0.7, 1.3));
      this.spawn(pos, dir, rand(0.5, 1.2), rand(2.0, 5.0), c);
    }
  }
  emitThrust(pos: THREE.Vector3, dir: THREE.Vector3) {
    const v = dir.clone().multiplyScalar(-rand(10, 18));
    v.x += rand(-1.5, 1.5); v.y += rand(-1.5, 1.5); v.z += rand(-1.5, 1.5);
    const c = Math.random() < 0.5
      ? new THREE.Color(0.2, 0.95, 1.0)
      : new THREE.Color(1.0, 0.3, 0.95);
    this.spawn(pos, v, rand(0.2, 0.45), rand(2.5, 4.5), c);
  }
  emitTrail(pos: THREE.Vector3, color = new THREE.Color(1.0, 0.4, 0.1)) {
    const v = randomUnitVec().multiplyScalar(rand(0.3, 1.2));
    this.spawn(pos, v, rand(0.2, 0.4), rand(1.5, 3.0), color.clone());
  }

  update(dt: number) {
    let count = 0;
    for (let i = 0; i < this.cap; i++) {
      const p = this.parts[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      p.pos.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(1 - 1.6 * dt);
      const f = p.life / p.maxLife;
      const idx = count * 3;
      this.positions[idx]     = p.pos.x;
      this.positions[idx + 1] = p.pos.y;
      this.positions[idx + 2] = p.pos.z;
      this.colors[idx]     = p.color.r * f * 1.4;
      this.colors[idx + 1] = p.color.g * f * 1.4;
      this.colors[idx + 2] = p.color.b * f * 1.4;
      this.sizes[count] = p.size * Math.max(0.4, f);
      count++;
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    this.geo.setDrawRange(0, count);
  }
}
