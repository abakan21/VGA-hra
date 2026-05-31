const POWERUP_VISUAL_SCALE = 1.75;
import * as THREE from 'three';
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

export class PowerupManager {
  scene: THREE.Scene;
  items: Powerup[] = [];
  private geo: THREE.BufferGeometry;
  private mats: Record<PowerupKind, THREE.MeshStandardMaterial>;

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
    const mesh = new THREE.Mesh(this.geo, this.mats[kind]);
    mesh.position.copy(pos);
    mesh.scale.setScalar(POWERUP_VISUAL_SCALE); this.scene.add(mesh);
    const p: Powerup = {
      id: newId(),
      kind: 'powerup',
      puKind: kind,
      position: mesh.position,
      velocity: new THREE.Vector3(rand(-2, 2), rand(-2, 2), rand(-2, 2)),
      radius: 1.6,
      hp: 1, maxHp: 1,
      alive: true,
      ttl: 18,
      object3d: mesh,
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
