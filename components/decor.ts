import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { rand, randomUnitVec } from './util';

const EXTRA_MODELS = [
  '/models/SpaceStation.glb',
  '/models/Satellite.glb',
  '/models/Wreck.glb',
  '/models/Cargo.glb',
  '/models/Beacon.glb',
];

export interface DecorObject {
  group: THREE.Group;
  spin: THREE.Vector3;
  orbit?: { center: THREE.Vector3; axis: THREE.Vector3; speed: number; radius: number; phase: number };
}

export async function loadDecor(scene: THREE.Scene, sectorHalf: THREE.Vector3): Promise<DecorObject[]> {
  const loader = new GLTFLoader();
  const decor: DecorObject[] = [];

  const urls: string[] = [];
  for (const u of EXTRA_MODELS) {
    try {
      const res = await fetch(u, { method: 'HEAD' });
      if (res.ok) urls.push(u);
    } catch { /* ignore */ }
  }
  if (urls.length === 0) return decor;

  for (const url of urls) {
    try {
      const gltf = await loader.loadAsync(url);
      const proto = gltf.scene;

      const box = new THREE.Box3().setFromObject(proto);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      proto.position.sub(center);

      const baseScale = 14 / Math.max(0.01, Math.max(size.x, size.y, size.z));

      proto.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mm of mats) {
            const s = mm as THREE.MeshStandardMaterial;
            if (s.isMeshStandardMaterial) {
              s.emissiveIntensity = Math.min(s.emissiveIntensity ?? 0, 0.3);
              s.envMapIntensity = 0.6;
            }
          }
        }
      });

      const instances = rand(2, 4) | 0;
      for (let i = 0; i < instances; i++) {
        const clone = proto.clone(true);
        const g = new THREE.Group();
        g.add(clone);
        const s = baseScale * rand(0.6, 1.6);
        clone.scale.setScalar(s);
        const pos = randomUnitVec().multiplyScalar(rand(260, Math.min(sectorHalf.x, sectorHalf.z) * 0.85));
        pos.y = rand(-sectorHalf.y * 0.5, sectorHalf.y * 0.5);
        g.position.copy(pos);
        g.rotation.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
        scene.add(g);
        decor.push({
          group: g,
          spin: new THREE.Vector3(rand(-0.1, 0.1), rand(-0.15, 0.15), rand(-0.08, 0.08)),
        });
      }
    } catch (err) {
      console.warn('Decor model load failed:', url, err);
    }
  }
  return decor;
}

export function updateDecor(decor: DecorObject[], dt: number) {
  for (const d of decor) {
    d.group.rotation.x += d.spin.x * dt;
    d.group.rotation.y += d.spin.y * dt;
    d.group.rotation.z += d.spin.z * dt;
  }
}
