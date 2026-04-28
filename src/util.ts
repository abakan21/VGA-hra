import * as THREE from 'three';

export const TAU = Math.PI * 2;

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
export function randSign(): number { return Math.random() < 0.5 ? -1 : 1; }

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

export function randomUnitVec(): THREE.Vector3 {
  const z = rand(-1, 1);
  const a = rand(0, TAU);
  const s = Math.sqrt(1 - z * z);
  return new THREE.Vector3(Math.cos(a) * s, Math.sin(a) * s, z);
}

export const tmpV1 = new THREE.Vector3();
export const tmpV2 = new THREE.Vector3();
export const tmpV3 = new THREE.Vector3();
export const tmpQ1 = new THREE.Quaternion();
