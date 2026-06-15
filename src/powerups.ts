const POWERUP_VISUAL_SCALE = 1.75;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Entity, newId } from './entity';
import { rand } from './util';

export type PowerupKind = 'health' | 'triple' | 'shield' | 'rapid' | 'multirocket' | 'nuke' | 'slowmo';

export interface Powerup extends Entity {
  object3d: THREE.Object3D;
  puKind: PowerupKind;
}

const KIND_COLORS: Record<PowerupKind, number> = {
  health: 0x2aff70,
  triple: 0xffaa20,
  shield: 0x40c0ff,
  rapid: 0xffff40,
  multirocket: 0xff6020,
  nuke: 0xff2040,
  slowmo: 0xa060ff,
};

const KIND_MODELS: Record<PowerupKind, string> = {
  health: '/models/powerups/heart.glb',
  triple: '/models/powerups/star.glb',
  shield: '/models/powerups/shield.glb',
  rapid: '/models/powerups/lightning.glb',
  multirocket: '/models/powerups/rocket.glb',
  nuke: '/models/powerups/bomb.glb',
  slowmo: '/models/powerups/hourglass.glb',
};

const POWERUP_MODEL_SIZE = 2.4;

export class PowerupManager {
  scene: THREE.Scene;
  items: Powerup[] = [];
  private geo: THREE.BufferGeometry;
  private mats: Record<PowerupKind, THREE.MeshStandardMaterial>;
  // loaded model prototypes, cloned on spawn (fallback to octahedron until ready)
  private models: Partial<Record<PowerupKind, THREE.Object3D>> = {};

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geo = new THREE.OctahedronGeometry(0.9, 0);
    const mkMat = (dark: number, kind: PowerupKind) =>
      new THREE.MeshStandardMaterial({ color: dark, emissive: KIND_COLORS[kind], emissiveIntensity: 2, metalness: 0.3, roughness: 0.2 });
    this.mats = {
      health: mkMat(0x104020, 'health'),
      triple: mkMat(0x402010, 'triple'),
      shield: mkMat(0x102040, 'shield'),
      rapid: mkMat(0x403810, 'rapid'),
      multirocket: mkMat(0x401810, 'multirocket'),
      nuke: mkMat(0x401010, 'nuke'),
      slowmo: mkMat(0x201040, 'slowmo'),
    };
    this.preloadModels();
  }

  private preloadModels() {
    const loader = new GLTFLoader();
    (Object.keys(KIND_MODELS) as PowerupKind[]).forEach((kind) => {
      loader.load(KIND_MODELS[kind], (gltf) => {
        const model = gltf.scene;
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        model.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        const pivot = new THREE.Group();
        pivot.add(model);
        pivot.scale.setScalar(POWERUP_MODEL_SIZE / maxDim);

        // glow in the dark space + colour-code by kind
        const tint = new THREE.Color(KIND_COLORS[kind]);
        model.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.frustumCulled = false;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const std = m as THREE.MeshStandardMaterial;
            if (std.isMeshStandardMaterial) {
              std.emissive = tint.clone();
              std.emissiveIntensity = 0.7;
            }
          });
        });

        this.models[kind] = pivot;
      });
    });
  }

  maybeDrop(pos: THREE.Vector3, chance: number) {
    if (Math.random() >= chance) return;
    const roll = Math.random();
    let kind: PowerupKind;
    if (roll < 0.30) kind = 'health';
    else if (roll < 0.45) kind = 'triple';
    else if (roll < 0.58) kind = 'shield';
    else if (roll < 0.73) kind = 'rapid';
    else if (roll < 0.85) kind = 'multirocket';
    else if (roll < 0.94) kind = 'slowmo';
    else kind = 'nuke';
    this.spawn(pos, kind);
  }

  spawn(pos: THREE.Vector3, kind: PowerupKind) {
    const proto = this.models[kind];
    let object3d: THREE.Object3D;
    if (proto) {
      object3d = proto.clone(true);
    } else {
      // model not loaded yet -> fall back to the glowing octahedron
      const mesh = new THREE.Mesh(this.geo, this.mats[kind]);
      mesh.scale.setScalar(POWERUP_VISUAL_SCALE);
      object3d = mesh;
    }
    object3d.position.copy(pos);
    this.scene.add(object3d);
    const p: Powerup = {
      id: newId(),
      kind: 'powerup',
      puKind: kind,
      position: object3d.position,
      velocity: new THREE.Vector3(rand(-2, 2), rand(-2, 2), rand(-2, 2)),
      radius: 1.6,
      hp: 1, maxHp: 1,
      alive: true,
      ttl: 18,
      object3d,
    };
    this.items.push(p);
  }

  update(dt: number) {
    for (const p of this.items) {
      if (!p.alive) continue;
      p.position.addScaledVector(p.velocity, dt);
      p.object3d.rotation.x += dt * 1.6;
      p.object3d.rotation.y += dt * 2.3;
      p.ttl = (p.ttl ?? 0) - dt;
      if ((p.ttl ?? 0) < 3) {
        p.object3d.visible = Math.floor((p.ttl ?? 0) * 10) % 2 === 0;
      }
      if ((p.ttl ?? 0) <= 0) p.alive = false;
    }
    this.cull();
  }

  cull() {
    const alive: Powerup[] = [];
    for (const p of this.items) {
      if (p.alive) alive.push(p);
      else this.scene.remove(p.object3d);
    }
    this.items = alive;
  }

  clear() {
    for (const p of this.items) this.scene.remove(p.object3d);
    this.items = [];
  }
}
