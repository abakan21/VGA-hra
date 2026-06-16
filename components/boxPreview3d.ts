import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Renders a small static 3D chest model inside each loot-box shop card.
// Falls back silently (leaving the inline SVG) if WebGL or the model fails.

interface Preview {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  container: HTMLElement;
}

const loader = new GLTFLoader();
let started = false;

export function setupBoxPreviews3d(): void {
  if (started) return;
  started = true;

  const mounts = document.querySelectorAll<HTMLElement>('.progression-box-art[data-box-model]');
  mounts.forEach((container) => {
    const url = container.dataset.boxModel!;
    const tint = container.dataset.boxTint ? new THREE.Color(container.dataset.boxTint) : null;
    const scaleMul = container.dataset.boxScale ? parseFloat(container.dataset.boxScale) : 1;
    const rotY = container.dataset.boxRoty ? parseFloat(container.dataset.boxRoty) : -0.6;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return; // no WebGL -> keep the SVG fallback
    }

    const size = 72;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size, false);
    const canvas = renderer.domElement;
    canvas.className = 'progression-box-canvas';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1.5, 5);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(tint ? tint.getHex() : 0x88c0ff, 0.9);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    const preview: Preview = { renderer, scene, camera, container };

    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        // ensure world matrices are current before measuring (deep hierarchies)
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const s = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(s);
        box.getCenter(center);
        model.position.sub(center);
        const maxDim = Math.max(s.x, s.y, s.z) || 1;
        model.scale.setScalar((2.4 / maxDim) * scaleMul);

        if (tint) {
          model.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (mesh.isMesh) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat) => {
                const std = mat as THREE.MeshStandardMaterial;
                if (std.color) std.color.lerp(tint, 0.45);
                if (std.emissive) {
                  std.emissive = tint.clone();
                  std.emissiveIntensity = 0.22;
                }
              });
            }
          });
        }

        // static 3/4 pose
        const pivot = new THREE.Group();
        pivot.rotation.set(0.12, rotY, 0);
        pivot.add(model);
        scene.add(pivot);

        // model loaded -> hide the inline SVG fallback
        const svg = container.querySelector('svg');
        if (svg) (svg as SVGElement).style.opacity = '0';

        renderWhenVisible(preview);
      },
      undefined,
      () => {
        // load failed -> drop the canvas, keep the SVG
        renderer.dispose();
        canvas.remove();
      },
    );
  });
}

// Renders a single static frame, retrying until the card is on screen.
function renderWhenVisible(p: Preview): void {
  const draw = () => {
    p.renderer.render(p.scene, p.camera);
  };

  if (p.container.offsetParent !== null) {
    draw();
  }

  if (typeof IntersectionObserver !== 'undefined') {
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) draw();
      }
    });
    obs.observe(p.container);
  } else {
    // fallback: a couple of delayed redraws so it shows once the shop opens
    setTimeout(draw, 300);
    setTimeout(draw, 1200);
  }
}
