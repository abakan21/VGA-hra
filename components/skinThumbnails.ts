import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { COSMETICS } from './cosmetics';

// Pre-renders a small 3D thumbnail of every ship-skin model so the loot
// roulette and inventory can show the real skin instead of a placeholder.

const cache = new Map<string, string>();
const listeners = new Set<() => void>();
let generating: Promise<void> | null = null;

export function getSkinThumbnail(id: string): string | null {
  return cache.get(id) ?? null;
}

export function onThumbnailsReady(cb: () => void): void {
  listeners.add(cb);
}

export function generateSkinThumbnails(): Promise<void> {
  if (generating) return generating;
  generating = run();
  return generating;
}

async function run(): Promise<void> {
  const skins = COSMETICS.filter((c) => c.type === 'shipSkin' && c.modelPath);
  if (skins.length === 0) return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch {
    return;
  }
  const size = 160;
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);

  const fov = 35;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 10000);

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88c0ff, 0.8);
  fill.position.set(-4, 1, -2);
  scene.add(fill);
  const back = new THREE.DirectionalLight(0xffffff, 0.6);
  back.position.set(0, -3, -5);
  scene.add(back);

  // fixed 3/4 viewing direction
  const dir = new THREE.Vector3(0.9, 0.55, 1).normalize();
  const loader = new GLTFLoader();

  for (const skin of skins) {
    try {
      const gltf = await loader.loadAsync(skin.modelPath!);
      const model = gltf.scene;
      model.updateMatrixWorld(true);

      // center the model at the origin
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);

      const pivot = new THREE.Group();
      pivot.rotation.y = -0.5;
      pivot.add(model);
      scene.add(pivot);

      // frame the camera to the model's bounding sphere (works for any size/shape)
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      const radius = sphere.radius || 1;
      const dist = (radius / Math.sin((fov * Math.PI) / 180 / 2)) * 1.15;
      camera.position.copy(dir).multiplyScalar(dist);
      camera.near = Math.max(0.01, dist - radius * 2);
      camera.far = dist + radius * 2;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      cache.set(skin.id, renderer.domElement.toDataURL('image/png'));

      scene.remove(pivot);
      disposeObject(model);
    } catch {
      // missing/broken model -> leave it to the emoji fallback
    }
  }

  renderer.dispose();
  listeners.forEach((cb) => cb());
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m?.dispose());
    }
  });
}
