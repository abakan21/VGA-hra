import * as THREE from 'three';
import { Entity, newId } from './entity';

export interface Projectile extends Entity {
  object3d: THREE.Object3D;
}

export class WeaponSystem {
  scene: THREE.Scene;
  projectiles: Projectile[] = [];
  private laserGeo: THREE.BufferGeometry;
  private laserMatPlayer: THREE.Material;
  private laserMatEnemy: THREE.Material;
  private rocketGeo: THREE.BufferGeometry;
  private rocketMat: THREE.Material;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.laserGeo = new THREE.CylinderGeometry(0.15, 0.15, 3.5, 8);
    this.laserGeo.rotateX(Math.PI / 2);
    this.laserMatPlayer = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    this.laserMatEnemy = new THREE.MeshBasicMaterial({ color: 0xff2a40 });
    this.rocketGeo = new THREE.ConeGeometry(0.35, 1.6, 8);
    this.rocketGeo.rotateX(Math.PI / 2);
    this.rocketMat = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  }

  fireLaser(from: THREE.Vector3, dir: THREE.Vector3, fromPlayer: boolean, speed = 260, damage = 10, inheritVel?: THREE.Vector3) {
    const mesh = new THREE.Mesh(this.laserGeo, fromPlayer ? this.laserMatPlayer : this.laserMatEnemy);
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    this.scene.add(mesh);
    const vel = dir.clone().normalize().multiplyScalar(speed);
    if (inheritVel) vel.add(inheritVel);
    const p: Projectile = {
      id: newId(),
      kind: fromPlayer ? 'laser' : 'enemyLaser',
      position: mesh.position,
      velocity: vel,
      radius: 0.4,
      hp: 1, maxHp: 1,
      alive: true,
      ttl: 2.2,
      object3d: mesh,
      data: { damage },
    };
    this.projectiles.push(p);
  }

  fireTripleShot(from: THREE.Vector3, fwd: THREE.Vector3, right: THREE.Vector3, damage = 8, inheritVel?: THREE.Vector3) {
    const spreadAngle = 0.08;
    for (let i = -1; i <= 1; i++) {
      const d = fwd.clone().addScaledVector(right, spreadAngle * i).normalize();
      this.fireLaser(from, d, true, 260, damage, inheritVel);
    }
  }

  fireMultiRocket(from: THREE.Vector3, fwd: THREE.Vector3, right: THREE.Vector3, up: THREE.Vector3, target: Entity | null, damage = 40, inheritVel?: THREE.Vector3) {
    this.fireRocket(from, fwd, target, damage, inheritVel);
    const leftDir = fwd.clone().addScaledVector(right, -0.25).normalize();
    const rightDir = fwd.clone().addScaledVector(right, 0.25).normalize();
    const leftFrom = from.clone().addScaledVector(right, -0.8).addScaledVector(up, -0.2);
    const rightFrom = from.clone().addScaledVector(right, 0.8).addScaledVector(up, -0.2);
    this.fireRocket(leftFrom, leftDir, target, damage, inheritVel);
    this.fireRocket(rightFrom, rightDir, target, damage, inheritVel);
  }

  fireRocket(from: THREE.Vector3, dir: THREE.Vector3, target: Entity | null, damage = 40, inheritVel?: THREE.Vector3) {
    const mesh = new THREE.Mesh(this.rocketGeo, this.rocketMat);
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    this.scene.add(mesh);
    const vel = dir.clone().normalize().multiplyScalar(700);
    if (inheritVel) vel.add(inheritVel);
    const p: Projectile = {
      id: newId(),
      kind: 'rocket',
      position: mesh.position,
      velocity: vel,
      radius: 1.4,
      hp: 1, maxHp: 1,
      alive: true,
      ttl: 4.5,
      object3d: mesh,
      data: { target, damage, maxTurn: 4.5 },
    };
    this.projectiles.push(p);
  }

  update(dt: number) {
    const tmp = new THREE.Vector3();
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      if (p.kind === 'rocket') {
        const d = p.data;
        const tgt: Entity | null = d.target;
        if (tgt && tgt.alive) {
          const dir = p.velocity.clone().normalize();
          const desired = tmp.copy(tgt.position).sub(p.position).normalize();
          const angle = Math.min(d.maxTurn * dt, dir.angleTo(desired));
          const axis = new THREE.Vector3().crossVectors(dir, desired);
          if (axis.lengthSq() > 1e-6) {
            axis.normalize();
            const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
            dir.applyQuaternion(q);
            p.velocity.copy(dir).multiplyScalar(400);
          }
          p.object3d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        } else {
          d.target = null;
        }
      }
      p.position.addScaledVector(p.velocity, dt);
      p.ttl = (p.ttl ?? 0) - dt;
      if ((p.ttl ?? 0) <= 0) p.alive = false;
    }
    this.cull();
  }

  findHomingTarget(origin: THREE.Vector3, fwd: THREE.Vector3, enemies: Entity[], coneCos = 0.5, maxRange = 600): Entity | null {
    let best: Entity | null = null;
    let bestScore = -Infinity;
    const tmp = new THREE.Vector3();
    for (const e of enemies) {
      if (!e.alive) continue;
      tmp.copy(e.position).sub(origin);
      const d = tmp.length();
      if (d > maxRange) continue;
      tmp.divideScalar(d);
      const dot = tmp.dot(fwd);
      if (dot < coneCos) continue;
      const score = dot - d / maxRange;
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  cull() {
    const alive: Projectile[] = [];
    for (const p of this.projectiles) {
      if (p.alive) alive.push(p);
      else {
        if (p.object3d) this.scene.remove(p.object3d);
      }
    }
    this.projectiles = alive;
  }

  clear() {
    for (const p of this.projectiles) {
      if (p.object3d) this.scene.remove(p.object3d);
    }
    this.projectiles = [];
  }
}
