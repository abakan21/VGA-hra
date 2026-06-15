import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FUN_WEAPONS, FunWeaponMode } from './funweapons';

type ProjectileLike = {
  object3d: THREE.Object3D;
  data?: Record<string, any>;
};

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Object3D>();
const loading = new Map<string, Promise<THREE.Object3D | null>>();

export function decorateFunProjectiles(
  scene: THREE.Scene,
  projectiles: ProjectileLike[],
  startIndex: number,
  mode: FunWeaponMode,
): void {
  if (mode === 'normal') return;

  for (let i = startIndex; i < projectiles.length; i += 1) {
    const projectile = projectiles[i];
    decorateProjectile(projectile, mode);
  }
}

function decorateProjectile(projectile: ProjectileLike, mode: FunWeaponMode): void {
  if (!projectile.object3d || projectile.data?.funDecorated) return;

  projectile.data = projectile.data ?? {};
  projectile.data.funDecorated = true;
  projectile.data.funWeaponMode = mode;

  hideOriginalProjectile(projectile.object3d);

  const modelPath = FUN_WEAPONS[mode].projectileModelPath;
  if (!modelPath) {
    projectile.object3d.add(createPlaceholder(mode));
    return;
  }

  // if the model is already cached, attach it immediately so there is no
  // egg-like placeholder flash before the chicken appears
  const cached = cache.get(modelPath);
  if (cached) {
    const model = cached.clone(true);
    normalizeProjectileModel(model, mode);
    projectile.object3d.add(model);
    return;
  }

  const placeholder = createPlaceholder(mode);
  projectile.object3d.add(placeholder);

  loadModel(modelPath).then((source) => {
    if (!source || !projectile.object3d) return;

    placeholder.removeFromParent();

    const model = source.clone(true);
    normalizeProjectileModel(model, mode);
    projectile.object3d.add(model);
  });
}

// Preload a fun-weapon projectile model so the first shots already show the
// real model (chicken/cucumber/eggplant) instead of the placeholder.
export function preloadFunWeaponModel(mode: FunWeaponMode): void {
  const modelPath = FUN_WEAPONS[mode]?.projectileModelPath;
  if (modelPath) loadModel(modelPath);
}

function hideOriginalProjectile(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const cloned = mats.map((mat) => {
      const next = mat.clone();
      next.transparent = true;
      next.opacity = 0;
      next.depthWrite = false;
      return next;
    });

    mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
  });
}

function createPlaceholder(mode: FunWeaponMode): THREE.Object3D {
  const group = new THREE.Group();

  if (mode === 'cucumber') {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.26, 1.15, 6, 12),
      new THREE.MeshStandardMaterial({
        color: 0x44dd66,
        emissive: 0x0d5520,
        emissiveIntensity: 0.25,
        roughness: 0.55,
      }),
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);
  } else if (mode === 'eggplant') {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 1.05, 6, 12),
      new THREE.MeshStandardMaterial({
        color: 0x7d2cff,
        emissive: 0x2d0a55,
        emissiveIntensity: 0.28,
        roughness: 0.55,
      }),
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);
  } else {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0xb0402a,
        emissive: 0x3a1208,
        emissiveIntensity: 0.2,
        roughness: 0.7,
      }),
    );
    const comb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xdd2222, emissive: 0x550808, emissiveIntensity: 0.2 }),
    );
    comb.position.set(0, 0.4, 0.2);
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.32, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffaa22,
        emissive: 0x442000,
        emissiveIntensity: 0.2,
      }),
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.z = 0.42;
    group.add(body, comb, beak);
  }

  group.scale.setScalar(1.25);
  return group;
}

async function loadModel(path: string): Promise<THREE.Object3D | null> {
  if (cache.has(path)) return cache.get(path)!.clone(true);

  if (!loading.has(path)) {
    loading.set(
      path,
      loader.loadAsync(path)
        .then((gltf) => {
          const model = gltf.scene;
          normalizeProjectileModel(model, 'normal');
          cache.set(path, model);
          return model;
        })
        .catch((error) => {
          console.warn(`[fun projectile] failed to load ${path}`, error);
          return null;
        }),
    );
  }

  const result = await loading.get(path)!;
  return result ? result.clone(true) : null;
}

function normalizeProjectileModel(model: THREE.Object3D, mode: FunWeaponMode): void {
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;

  model.position.sub(center);

  const targetSize = mode === 'chicken' ? 2.0 : 1.25;
  model.scale.multiplyScalar(targetSize / maxDim);

  model.rotation.y += Math.PI;

  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;

    mesh.frustumCulled = false;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const standard = mat as THREE.MeshStandardMaterial;
      if (standard.isMeshStandardMaterial) {
        standard.envMapIntensity = Math.max(standard.envMapIntensity ?? 0, 0.6);
        standard.emissiveIntensity = Math.max(standard.emissiveIntensity ?? 0, 0.04);
        standard.needsUpdate = true;
      }
    }
  });
}
