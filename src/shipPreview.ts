import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SHIPS } from './ships';

export function setupShipSelectPreviews(): void {
  setupPreview('ship-preview-heavy', SHIPS.heavy.modelPath);
  setupPreview('ship-preview-scout', SHIPS.scout.modelPath);
}

function setupPreview(className: string, modelPath: string): void {
  const host = document.querySelector<HTMLElement>(`.${className}`);
  if (!host || host.dataset.previewReady === '1') return;

  host.dataset.previewReady = '1';
  host.innerHTML = '';

  const width = Math.max(220, host.clientWidth || 260);
  const height = Math.max(145, host.clientHeight || 150);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.domElement.className = 'ship-preview-canvas';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
  camera.position.set(0, 0.1, 4.4);
  camera.lookAt(0, 0, 0);

  const root = new THREE.Group();
  scene.add(root);

  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(3.5, 4, 5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x55ddff, 1.65);
  rim.position.set(-4, 1.2, -2);
  scene.add(rim);

  const fill = new THREE.PointLight(0x55ddff, 2.0, 8);
  fill.position.set(-2, 1.2, 3);
  scene.add(fill);

  scene.add(new THREE.AmbientLight(0x9fb5ff, 1.35));

  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;
      normalizeModel(model);
      root.add(model);
    },
    undefined,
    () => {
      const fallback = createFallbackShip();
      normalizeModel(fallback);
      root.add(fallback);
    },
  );

  const animate = () => {
    requestAnimationFrame(animate);
    root.rotation.y += 0.011;
    root.rotation.x = -0.04;
    renderer.render(scene, camera);
  };

  animate();

  window.addEventListener('resize', () => {
    const nextWidth = Math.max(220, host.clientWidth || 260);
    const nextHeight = Math.max(145, host.clientHeight || 150);
    renderer.setSize(nextWidth, nextHeight);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
  });
}

function normalizeModel(model: THREE.Object3D): void {
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  model.position.x -= center.x;
  model.position.y -= center.y;
  model.position.z -= center.z;

  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2.05 / maxAxis;
  model.scale.setScalar(scale);

  // Recalculate after scale and center again. This fixes models with offset pivots.
  model.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(model);
  const center2 = new THREE.Vector3();
  box2.getCenter(center2);
  model.position.x -= center2.x;
  model.position.y -= center2.y;
  model.position.z -= center2.z;

  // Slight visual lift so the ship sits in the center of the preview card.
  model.position.y += 0.02;
  model.rotation.y = Math.PI;
}

function createFallbackShip(): THREE.Object3D {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.35, 4),
    new THREE.MeshStandardMaterial({
      color: 0x8be9ff,
      emissive: 0x073b52,
      metalness: 0.35,
      roughness: 0.38,
    }),
  );
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4fd8,
    emissive: 0x451040,
    metalness: 0.25,
    roughness: 0.45,
  });

  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.07, 0.28), wingMaterial);
  leftWing.position.set(-0.45, -0.08, -0.1);
  group.add(leftWing);

  const rightWing = leftWing.clone();
  rightWing.position.x = 0.45;
  group.add(rightWing);

  return group;
}
