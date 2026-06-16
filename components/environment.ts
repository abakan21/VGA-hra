import * as THREE from 'three';
import { rand, randomUnitVec } from './util';
import { NEBULA_VS, NEBULA_FS } from '../shaders/nebula';
import { PLANET_VS, PLANET_FS } from '../shaders/planet';

export function createNebula(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1, 32, 24);
  const mat = new THREE.ShaderMaterial({
    vertexShader: NEBULA_VS,
    fragmentShader: NEBULA_FS,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(0x3a0a5c) },
      uColorB: { value: new THREE.Color(0x124a7a) },
      uColorC: { value: new THREE.Color(0xff3a8a) },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -2;
  return mesh;
}

export function createPlanet(
  position: THREE.Vector3,
  radius: number,
  colorA: number,
  colorB: number,
  lightDir: THREE.Vector3,
): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(radius, 48, 32);
  const mat = new THREE.ShaderMaterial({
    vertexShader: PLANET_VS,
    fragmentShader: PLANET_FS,
    uniforms: {
      uTime: { value: 0 },
      uLightDir: { value: lightDir.clone().normalize() },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
    },
  });
  const sphere = new THREE.Mesh(geo, mat);
  group.add(sphere);

  const ringGeo = new THREE.RingGeometry(radius * 1.4, radius * 2.0, 80);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xaa88ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI * 0.38;
  group.add(ring);

  group.position.copy(position);
  return group;
}

export interface DebrisField {
  mesh: THREE.InstancedMesh;
  update: (dt: number) => void;
}

export function createDebris(count: number, sectorHalf: THREE.Vector3): DebrisField {
  const geo = new THREE.TetrahedronGeometry(0.6, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x776680, metalness: 0.3, roughness: 0.7,
    emissive: 0x221030, emissiveIntensity: 0.1,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const data: { pos: THREE.Vector3; rot: THREE.Euler; axis: THREE.Vector3; speed: number; scale: number; vel: THREE.Vector3 }[] = [];
  for (let i = 0; i < count; i++) {
    const pos = new THREE.Vector3(
      rand(-sectorHalf.x, sectorHalf.x),
      rand(-sectorHalf.y, sectorHalf.y),
      rand(-sectorHalf.z, sectorHalf.z),
    );
    const scale = rand(0.6, 2.6);
    dummy.position.copy(pos);
    dummy.quaternion.setFromAxisAngle(randomUnitVec(), rand(0, Math.PI * 2));
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    data.push({
      pos,
      rot: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)),
      axis: randomUnitVec(),
      speed: rand(0.2, 1.2),
      scale,
      vel: randomUnitVec().multiplyScalar(rand(0.3, 1.5)),
    });
  }
  mesh.instanceMatrix.needsUpdate = true;

  const tmp = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpQ2 = new THREE.Quaternion();
  const tmpScale = new THREE.Vector3();

  function update(dt: number) {
    for (let i = 0; i < count; i++) {
      const d = data[i];
      d.pos.addScaledVector(d.vel, dt);
      if (Math.abs(d.pos.x) > sectorHalf.x) d.vel.x *= -1;
      if (Math.abs(d.pos.y) > sectorHalf.y) d.vel.y *= -1;
      if (Math.abs(d.pos.z) > sectorHalf.z) d.vel.z *= -1;
      tmpQ.setFromAxisAngle(d.axis, d.speed * dt);
      tmpQ2.setFromEuler(d.rot).multiply(tmpQ);
      d.rot.setFromQuaternion(tmpQ2);
      tmpScale.setScalar(d.scale);
      tmp.compose(d.pos, tmpQ2, tmpScale);
      mesh.setMatrixAt(i, tmp);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update };
}
