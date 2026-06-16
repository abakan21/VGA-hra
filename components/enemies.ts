import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Entity, newId } from './entity';
import { rand, randomUnitVec, clamp } from './util';
import { WeaponSystem } from './weapons';

export interface Enemy extends Entity {
  object3d: THREE.Object3D;
  fireCooldown: number;
}

type EnemyType = 'chaser' | 'drone' | 'boss';

interface SpawnRequest { type: EnemyType; speedBonus: number; hpBonus: number; }
interface ModelProto {
  root: THREE.Object3D;
  scale: number;
  tint: THREE.Color;
}

export class EnemyManager {
  scene: THREE.Scene;
  weapons: WeaponSystem;
  enemies: Enemy[] = [];
  wave = 0;
  waveTimer = 0;
  waveDelay = 2.0;
  waveActive = false; spawnQueue: SpawnRequest[] = []; spawnTimer = 0; spawnInterval = 0.28;
  onWaveCleared?: (wave: number) => void;
  onWaveStart?: (wave: number) => void;

  private chaserGeo: THREE.BufferGeometry;
  private chaserMat: THREE.Material;
  private droneGeo: THREE.BufferGeometry;
  private droneMat: THREE.Material;
  private bossGeo: THREE.BufferGeometry;
  private bossMat: THREE.Material;

  private models: Partial<Record<EnemyType, ModelProto>> = {};

  constructor(scene: THREE.Scene, weapons: WeaponSystem) {
    this.scene = scene;
    this.weapons = weapons;

    this.chaserGeo = new THREE.OctahedronGeometry(2.6, 0);
    this.chaserMat = new THREE.MeshStandardMaterial({
      color: 0xc03040, metalness: 0.4, roughness: 0.5,
      emissive: 0xff3040, emissiveIntensity: 0.9,
    });
    this.droneGeo = new THREE.IcosahedronGeometry(2.0, 0);
    this.droneMat = new THREE.MeshStandardMaterial({
      color: 0x2090b0, metalness: 0.4, roughness: 0.5,
      emissive: 0x30c0e0, emissiveIntensity: 0.8,
    });
    this.bossGeo = new THREE.DodecahedronGeometry(5.0, 0);
    this.bossMat = new THREE.MeshStandardMaterial({
      color: 0xa040a0, metalness: 0.5, roughness: 0.4,
      emissive: 0xff40e0, emissiveIntensity: 1.3,
    });

    this.preloadModels();
  }

  // modely se loaduji na pozadi, enemies pouzivaji fallback geo dokud nejsou hotove
  private async preloadModels() {
    const loader = new GLTFLoader();
    const specs: { type: EnemyType; url: string; size: number; tint: number; emissive: number }[] = [
      { type: 'drone',  url: '/models/Drone.glb',  size: 5.0,  tint: 0x60d0ff, emissive: 0x30c0e0 },
      { type: 'chaser', url: '/models/Chaser.glb', size: 6.5,  tint: 0xff7080, emissive: 0xff3040 },
      { type: 'boss',   url: '/models/Boss.glb',   size: 14.0, tint: 0xff80e0, emissive: 0xff40e0 },
    ];
    for (const s of specs) {
      try {
        const gltf = await loader.loadAsync(s.url);
        const inner = gltf.scene;
        const box = new THREE.Box3().setFromObject(inner);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        inner.position.sub(center);

        const pivot = new THREE.Group();
        pivot.add(inner);
        const root: THREE.Object3D = pivot;

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = s.size / maxDim;

        const tint = new THREE.Color(s.tint);
        const emissive = new THREE.Color(s.emissive);
        root.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.isMesh) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mm of mats) {
              const std = mm as THREE.MeshStandardMaterial;
              if (std.isMeshStandardMaterial) {
                std.emissive = emissive.clone();
                std.emissiveIntensity = 0.35;
                std.envMapIntensity = 0.7;
              }
            }
          }
        });

        this.models[s.type] = { root, scale, tint };
      } catch (err) {
        console.warn('Enemy model load failed:', s.url, err);
      }
    }
  }

  startWave(wave: number) {
    this.wave = wave;
    this.waveActive = true;
    const baseCount = 4 + Math.floor(wave * 0.8);
    const speedBonus = 1 + Math.floor(wave / 3) * 0.05;
    // proc 1.10? testoval jsem 1.15 ale bylo to moc rychle uz ve wave 6
    const hpBonus = Math.pow(1.10, wave - 1);

    const bossWave = wave % 5 === 0;
    const totalEnemies = bossWave ? Math.max(3, baseCount - 2) : baseCount;

    for (let i = 0; i < totalEnemies; i++) {
      const type: 'chaser' | 'drone' = Math.random() < 0.5 ? 'chaser' : 'drone';
      this.spawnAroundPlayer(type, speedBonus, hpBonus);
    }
    if (bossWave) this.spawnAroundPlayer('boss', speedBonus, hpBonus);
    this.onWaveStart?.(wave);
  }

  private spawnNextQueuedEnemy() { const req = this.spawnQueue.shift(); if (!req) return; this.spawnAroundPlayer(req.type, req.speedBonus, req.hpBonus); } private updateSpawnQueue(dt: number) { if (!this.waveActive || this.spawnQueue.length === 0) return; this.spawnTimer -= dt; if (this.spawnTimer <= 0) { this.spawnTimer = this.spawnInterval; this.spawnNextQueuedEnemy(); } } private spawnAroundPlayer(type: 'chaser' | 'drone' | 'boss', speedBonus: number, hpBonus: number) {
    const dir = randomUnitVec();
    const dist = rand(90, 160);
    const pos = dir.multiplyScalar(dist);
    let geo: THREE.BufferGeometry, mat: THREE.Material;
    let hp: number, radius: number, speed: number, fireRate: number;
    let lightColor: number;

    if (type === 'chaser') {
      geo = this.chaserGeo; mat = this.chaserMat;
      hp = 22 * hpBonus; radius = 3.2; speed = 26 * speedBonus; fireRate = 1.1;
      lightColor = 0xff2040;
    } else if (type === 'drone') {
      geo = this.droneGeo; mat = this.droneMat;
      hp = 10 * hpBonus; radius = 2.5; speed = 22 * speedBonus; fireRate = 0.8;
      lightColor = 0x00e5ff;
    } else {
      geo = this.bossGeo; mat = this.bossMat;
      hp = 300 * hpBonus; radius = 6.5; speed = 13 * speedBonus; fireRate = 0.5;
      lightColor = 0xff3cf2;
    }

    const group = new THREE.Group();
    const proto = this.models[type];
    let inner: THREE.Object3D;
    if (proto) {
      inner = proto.root.clone(true);
      inner.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh && m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          m.material = Array.isArray(m.material)
            ? mats.map((mm) => mm.clone())
            : (m.material as THREE.Material).clone();
        }
      });
      inner.scale.setScalar(proto.scale);
    } else {
      inner = new THREE.Mesh(geo, mat);
    }
    group.add(inner);
    const glow = new THREE.PointLight(lightColor, type === 'boss' ? 2.5 : 1.0, type === 'boss' ? 90 : 40, 1.8);
    group.add(glow);
    group.position.copy(pos);
    this.scene.add(group);

    const e: Enemy = {
      id: newId(),
      kind: type,
      position: group.position,
      velocity: new THREE.Vector3(),
      radius, hp, maxHp: hp,
      alive: true,
      object3d: group,
      fireCooldown: rand(0.5, 1.5),
      data: { speed, fireRate, orbitRadius: rand(40, 70), orbitDir: Math.random() < 0.5 ? 1 : -1, inner },
    };
    this.enemies.push(e);
  }

  update(dt: number, playerPos: THREE.Vector3, timeScale = 1) {
    const edt = dt * timeScale;
    const tmp = new THREE.Vector3();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      tmp.copy(playerPos).sub(e.position);
      const dist = tmp.length();
      if (dist < 0.0001) continue;
      const toPlayer = tmp.clone().divideScalar(dist);
      const d = e.data;

      if (e.kind === 'chaser' || e.kind === 'boss') {
        const target = toPlayer.clone().multiplyScalar(d.speed);
        // 1 - exp(-k*dt) je frame-rate independent lerp, zkopiroval jsem ze stackoverflow
        e.velocity.lerp(target, 1 - Math.exp(-1.8 * edt));
      } else if (e.kind === 'drone') {
        // orbit logika trochu hacky ale funguje
        const r = d.orbitRadius;
        const radial = dist - r;
        const orbit = new THREE.Vector3().crossVectors(toPlayer, new THREE.Vector3(0, 1, 0)).normalize();
        if (orbit.lengthSq() < 0.1) orbit.set(1, 0, 0);
        orbit.multiplyScalar(d.orbitDir);
        const wanted = toPlayer.clone().multiplyScalar(clamp(radial * 0.08, -1, 1))
          .add(orbit)
          .normalize()
          .multiplyScalar(d.speed);
        e.velocity.lerp(wanted, 1 - Math.exp(-2.5 * edt));
      }

      e.position.addScaledVector(e.velocity, edt);
      e.object3d.lookAt(playerPos);

      if ((e.data.hitFlash ?? 0) > 0) {
        e.data.hitFlash -= dt;
        const flash = Math.max(0, e.data.hitFlash) / 0.12;
        const boost = 0.35 + flash * 2.5;
        e.object3d.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.isMesh && m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mm of mats) {
              const std = mm as THREE.MeshStandardMaterial;
              if (std.isMeshStandardMaterial) std.emissiveIntensity = boost;
            }
          }
        });
      }

      const inner = e.data.inner as THREE.Object3D | undefined;
      if (inner) {
        if (e.kind === 'drone') {
          inner.rotation.y += edt * 1.5;
        } else if (e.kind === 'boss') {
          inner.rotation.y += edt * 0.4;
          inner.rotation.z += edt * 0.15;
        } else {
          inner.rotation.z += edt * 0.6;
        }
      }

      e.fireCooldown -= edt;
      const inRange = dist < (e.kind === 'boss' ? 260 : 180);
      if (e.fireCooldown <= 0 && inRange) {
        e.fireCooldown = 1 / d.fireRate;
        if (e.kind === 'boss') {
          // TODO: spread angle hardcoded, mozna parametr pozdeji
          for (let k = -1; k <= 1; k++) {
            const angle = k * 0.15;
            const dir = toPlayer.clone();
            const axis = new THREE.Vector3(0, 1, 0);
            dir.applyAxisAngle(axis, angle);
            this.weapons.fireLaser(e.position.clone().addScaledVector(dir, e.radius + 1), dir, false, 180, 9);
          }
        } else {
          this.weapons.fireLaser(e.position.clone().addScaledVector(toPlayer, e.radius + 0.5), toPlayer, false, 180, 6);
        }
      }
    }

    if (this.waveActive) {
      const anyAlive = this.enemies.some((e) => e.alive);
      if (!anyAlive) {
        this.waveActive = false;
        this.waveTimer = 0;
        this.onWaveCleared?.(this.wave);
      }
    } else {
      this.waveTimer += dt;
      if (this.waveTimer >= this.waveDelay) {
        this.waveTimer = 0;
        this.startWave(this.wave + 1);
      }
    }
  }

  removeDead() {
    const alive: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.alive) alive.push(e);
      else this.scene.remove(e.object3d);
    }
    this.enemies = alive;
  }

  clear() {
    for (const e of this.enemies) this.scene.remove(e.object3d);
    this.enemies = [];
    this.wave = 0;
    this.waveTimer = 0;
    this.waveActive = false;
  }
}
