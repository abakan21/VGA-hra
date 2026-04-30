import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Entity, newId } from './entity';
import { Input } from './input';
import { clamp, lerp } from './util';

const SHIELD_VS = `
  varying vec3 vN;
  varying vec3 vP;
  void main(){
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vP = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

const SHIELD_FS = `
  varying vec3 vN;
  varying vec3 vP;
  uniform float uTime;
  uniform float uStrength;
  void main(){
    vec3 V = normalize(-vP);
    float fres = pow(1.0 - clamp(dot(vN, V), 0.0, 1.0), 2.0);
    float wave = 0.5 + 0.5*sin(vP.y*0.6 - uTime*6.0);
    float band = smoothstep(0.4, 1.0, wave);
    vec3 col = mix(vec3(0.1,0.7,1.0), vec3(1.0,0.3,1.0), band);
    float a = clamp(fres * 1.2 + band * 0.15, 0.0, 1.0) * uStrength;
    gl_FragColor = vec4(col * (fres + 0.3), a);
  }`;

export interface PlayerPowers {
  tripleShot: number;
  shield: number;
  rocketCooldown: number;
  energy: number;
  boostActive: boolean;
  invuln: number;
  rapidFire: number;
  multiRocket: number;
  slowMo: number;
  nukes: number;
}

export class Player {
  entity: Entity;
  group: THREE.Group;
  shipRoot: THREE.Group;
  shieldMesh: THREE.Mesh;
  shieldMat: THREE.ShaderMaterial;
  thrusterLeft: THREE.Mesh;
  thrusterRight: THREE.Mesh;

  yaw = 0;
  pitch = 0;
  roll = 0;

  powers: PlayerPowers = {
    tripleShot: 0,
    shield: 0,
    rocketCooldown: 0,
    energy: 100,
    boostActive: false,
    invuln: 0,
    rapidFire: 0,
    multiRocket: 0,
    slowMo: 0,
    nukes: 0,
  };

  laserCooldown = 0;
  rocketLockTarget: Entity | null = null;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.shipRoot = new THREE.Group();
    this.group.add(this.shipRoot);

    const shipLight = new THREE.PointLight(0x88aaff, 0.6, 20, 1.8);
    shipLight.position.set(0, 0.5, 0);
    this.group.add(shipLight);

    this.loadShipModel('/models/Spaceship.glb');

    const thrGeo = new THREE.SphereGeometry(0.4, 12, 8);
    const thrMat = new THREE.MeshBasicMaterial({ color: 0x00eaff, transparent: true, opacity: 0.9 });
    this.thrusterLeft = new THREE.Mesh(thrGeo, thrMat);
    this.thrusterLeft.position.set(-1.2, -0.2, 1.5);
    this.thrusterRight = this.thrusterLeft.clone();
    this.thrusterRight.position.set(1.2, -0.2, 1.5);
    this.group.add(this.thrusterLeft, this.thrusterRight);

    this.shieldMat = new THREE.ShaderMaterial({
      vertexShader: SHIELD_VS, fragmentShader: SHIELD_FS,
      uniforms: { uTime: { value: 0 }, uStrength: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 24), this.shieldMat);
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    scene.add(this.group);

    this.entity = {
      id: newId(),
      kind: 'player',
      position: this.group.position,
      velocity: new THREE.Vector3(),
      radius: 2.0,
      hp: 100, maxHp: 100,
      alive: true,
    };
  }

  private loadShipModel(url: string) {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      const inner = gltf.scene;

      const box = new THREE.Box3().setFromObject(inner);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      inner.position.sub(center);

      const pivot = new THREE.Group();
      pivot.add(inner);
      const model: THREE.Object3D = pivot;

      const targetLength = 4.5;
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = targetLength / maxDim;
      model.scale.setScalar(s);

      const shouldFaceNegZ = size.z >= size.x;
      if (!shouldFaceNegZ) {
        model.rotation.y = Math.PI / 2;
      }

      model.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          const mat = m.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
          const mats = Array.isArray(mat) ? mat : [mat];
          for (const mm of mats) {
            if ((mm as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
              mm.emissive = new THREE.Color(0x10224a);
              mm.emissiveIntensity = 0.15;
              mm.envMapIntensity = 0.8;
            }
          }
        }
      });

      this.shipRoot.add(model);
    }, undefined, (err) => {
      console.warn('Ship model load failed, using fallback geometry', err);
      const fallback = new THREE.Mesh(
        new THREE.ConeGeometry(1.4, 4.5, 12).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({
          color: 0x8090c0, metalness: 0.7, roughness: 0.25,
          emissive: 0x4466ff, emissiveIntensity: 1.0,
        })
      );
      this.shipRoot.add(fallback);
    });
  }

  reset() {
    this.entity.hp = this.entity.maxHp;
    this.entity.alive = true;
    this.entity.position.set(0, 0, 0);
    this.entity.velocity.set(0, 0, 0);
    this.yaw = 0; this.pitch = 0; this.roll = 0;
    this.group.quaternion.identity();
    this.powers.tripleShot = 0;
    this.powers.shield = 0;
    this.powers.rocketCooldown = 0;
    this.powers.energy = 100;
    this.powers.invuln = 1.5;
    this.powers.rapidFire = 0;
    this.powers.multiRocket = 0;
    this.powers.slowMo = 0;
    this.powers.nukes = 0;
  }

  takeDamage(amount: number): boolean {
    if (this.powers.invuln > 0) return false;
    if (this.powers.shield > 0) {
      this.powers.shield = Math.max(0, this.powers.shield - amount * 0.6);
      this.powers.invuln = 0.3;
      return false;
    }
    this.entity.hp -= amount;
    this.powers.invuln = 0.4;
    if (this.entity.hp <= 0) {
      this.entity.hp = 0;
      this.entity.alive = false;
      return true;
    }
    return false;
  }

  update(dt: number, input: Input, camera: THREE.PerspectiveCamera, sectorHalf: THREE.Vector3) {
    const mouse = input.consumeMouse();
    const sens = 0.0022;
    this.yaw -= mouse.dx * sens;
    this.pitch -= mouse.dy * sens;
    this.pitch = clamp(this.pitch, -Math.PI / 2 * 0.95, Math.PI / 2 * 0.95);

    const targetRoll =
      (input.keys.has('KeyA') ? 0.35 : 0) +
      (input.keys.has('KeyD') ? -0.35 : 0);
    this.roll = lerp(this.roll, targetRoll, 1 - Math.exp(-6 * dt));

    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.roll);
    this.group.quaternion.copy(qYaw).multiply(qPitch).multiply(qRoll);

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion);

    const boost = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
    this.powers.boostActive = boost && this.powers.energy > 0;
    const boostMul = this.powers.boostActive ? 2.0 : 1.0;
    const accel = 95 * boostMul;
    const strafeAccel = 60;

    const desired = new THREE.Vector3();
    if (input.keys.has('KeyW')) desired.addScaledVector(fwd, accel);
    if (input.keys.has('KeyS')) desired.addScaledVector(fwd, -accel * 0.7);
    if (input.keys.has('KeyA')) desired.addScaledVector(right, -strafeAccel);
    if (input.keys.has('KeyD')) desired.addScaledVector(right, strafeAccel);
    if (input.keys.has('Space')) desired.addScaledVector(up, strafeAccel);
    if (input.keys.has('ControlLeft') || input.keys.has('ControlRight')) desired.addScaledVector(up, -strafeAccel);

    this.entity.velocity.addScaledVector(desired, dt);
    const damping = 1 - 1.1 * dt;
    this.entity.velocity.multiplyScalar(clamp(damping, 0, 1));
    const maxSpeed = this.powers.boostActive ? 120 : 70;
    if (this.entity.velocity.lengthSq() > maxSpeed * maxSpeed) {
      this.entity.velocity.setLength(maxSpeed);
    }
    this.entity.position.addScaledVector(this.entity.velocity, dt);

    this.entity.position.x = clamp(this.entity.position.x, -sectorHalf.x, sectorHalf.x);
    this.entity.position.y = clamp(this.entity.position.y, -sectorHalf.y, sectorHalf.y);
    this.entity.position.z = clamp(this.entity.position.z, -sectorHalf.z, sectorHalf.z);

    if (this.powers.boostActive) this.powers.energy = Math.max(0, this.powers.energy - 40 * dt);
    else this.powers.energy = Math.min(100, this.powers.energy + 18 * dt);

    if (this.laserCooldown > 0) this.laserCooldown -= dt;
    if (this.powers.rocketCooldown > 0) this.powers.rocketCooldown -= dt;
    if (this.powers.tripleShot > 0) this.powers.tripleShot -= dt;
    if (this.powers.shield > 0) this.powers.shield -= dt * 3;
    if (this.powers.invuln > 0) this.powers.invuln -= dt;
    if (this.powers.rapidFire > 0) this.powers.rapidFire -= dt;
    if (this.powers.multiRocket > 0) this.powers.multiRocket -= dt;
    if (this.powers.slowMo > 0) this.powers.slowMo -= dt;

    this.shieldMesh.visible = this.powers.shield > 0;
    this.shieldMat.uniforms.uStrength.value = clamp(this.powers.shield / 5, 0, 1);
    this.shieldMat.uniforms.uTime.value += dt;

    const thrustGlow = this.powers.boostActive ? 1.6 : 1.0;
    const thrustScale = 1.0 + (this.powers.boostActive ? 0.4 : 0) + Math.sin(performance.now() * 0.02) * 0.1;
    this.thrusterLeft.scale.setScalar(thrustScale);
    this.thrusterRight.scale.setScalar(thrustScale);
    (this.thrusterLeft.material as THREE.MeshBasicMaterial).opacity = 0.9 * thrustGlow;

    const camBack = 9, camUp = 2.5;
    const camTarget = this.entity.position.clone()
      .addScaledVector(fwd, -camBack)
      .addScaledVector(up, camUp);
    camera.position.lerp(camTarget, 1 - Math.exp(-10 * dt));
    const lookAt = this.entity.position.clone().addScaledVector(fwd, 20);
    camera.lookAt(lookAt);
    camera.up.lerp(up, 1 - Math.exp(-8 * dt));
  }

  getForward(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
  }
  getRight(): THREE.Vector3 {
    return new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion);
  }
  getUp(): THREE.Vector3 {
    return new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion);
  }
}
