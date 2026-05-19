import * as THREE from 'three';
import { Entity, newId } from './entity';
import { rand, randomUnitVec } from './util';

const VS_TRIPLANAR = `
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  void main(){
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const FS_TRIPLANAR = `
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  uniform vec3 uLightDir;
  uniform vec3 uStarColor;

  float hash(vec3 p){
    p = fract(p*0.3183099+.1);
    p *= 17.0;
    return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
  }
  float noise(vec3 x){
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  vec3 triplanar(vec3 p, vec3 n){
    vec3 bw = abs(n);
    bw = pow(bw, vec3(4.0));
    bw /= (bw.x + bw.y + bw.z);
    float sx = noise(p.yzx * 0.08) * 0.6 + noise(p.yzx * 0.3) * 0.4;
    float sy = noise(p.xzy * 0.08) * 0.6 + noise(p.xzy * 0.3) * 0.4;
    float sz = noise(p.xyz * 0.08) * 0.6 + noise(p.xyz * 0.3) * 0.4;
    float v = sx*bw.x + sy*bw.y + sz*bw.z;
    return mix(vec3(0.35,0.28,0.40), vec3(0.70,0.55,0.65), v);
  }
  void main(){
    vec3 n = normalize(vNormalW);
    vec3 base = triplanar(vWorldPos, n);
    float diff = clamp(dot(n, normalize(-uLightDir)), 0.0, 1.0);
    vec3 lit = base * (0.45 + 0.75 * diff) * uStarColor;
    float rim = pow(1.0 - clamp(dot(n, vec3(0.0,0.0,1.0)), 0.0, 1.0), 2.5);
    lit += rim * vec3(0.5, 0.4, 0.8) * 0.10;
    gl_FragColor = vec4(lit, 1.0);
  }`;

export interface AsteroidField {
  mesh: THREE.InstancedMesh;
  entities: Entity[];
  update: (dt: number) => void;
}

export function createAsteroidField(
  scene: THREE.Scene,
  count: number,
  sectorHalf: THREE.Vector3,
  lightDir: THREE.Vector3,
): AsteroidField {
  const geo = makeAsteroidGeometry();
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS_TRIPLANAR,
    fragmentShader: FS_TRIPLANAR,
    uniforms: {
      uLightDir: { value: lightDir.clone().normalize() },
      uStarColor: { value: new THREE.Color(1.0, 0.85, 0.95) },
    },
  });

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const entities: Entity[] = [];
  const points = poissonDisk(count, sectorHalf, 80);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    const p = points[i];
    const scale = rand(6, 16);
    dummy.position.copy(p);
    dummy.quaternion.setFromAxisAngle(randomUnitVec(), rand(0, Math.PI * 2));
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    entities.push({
      id: newId(),
      kind: 'asteroid',
      position: p.clone(),
      velocity: randomUnitVec().multiplyScalar(rand(0.2, 1.2)),
      radius: scale * 0.95,
      hp: Math.ceil(scale / 4),
      maxHp: Math.ceil(scale / 4),
      alive: true,
      data: {
        index: i,
        quat: dummy.quaternion.clone(),
        angularAxis: randomUnitVec(),
        angularSpeed: rand(0.05, 0.4),
        scale,
      },
    });
  }
  mesh.instanceMatrix.needsUpdate = true;

  const tmpMat = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();

  function update(dt: number) {
    for (const a of entities) {
      if (!a.alive) continue;
      a.position.addScaledVector(a.velocity, dt);
      if (Math.abs(a.position.x) > sectorHalf.x) a.velocity.x *= -1;
      if (Math.abs(a.position.y) > sectorHalf.y) a.velocity.y *= -1;
      if (Math.abs(a.position.z) > sectorHalf.z) a.velocity.z *= -1;
      const d = a.data;
      tmpQ.setFromAxisAngle(d.angularAxis, d.angularSpeed * dt);
      d.quat.multiply(tmpQ);
      tmpMat.compose(a.position, d.quat, new THREE.Vector3(d.scale, d.scale, d.scale));
      mesh.setMatrixAt(d.index, tmpMat);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, entities, update };
}

export function hideAsteroidInstance(mesh: THREE.InstancedMesh, index: number) {
  const m = new THREE.Matrix4();
  m.makeScale(0, 0, 0);
  mesh.setMatrixAt(index, m);
  mesh.instanceMatrix.needsUpdate = true;
}

function makeAsteroidGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 0.25 * (Math.sin(v.x * 3.1) + Math.cos(v.y * 2.7) + Math.sin(v.z * 2.3));
    const s = 1 + n * 0.25;
    v.multiplyScalar(s);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function poissonDisk(n: number, half: THREE.Vector3, minDist: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const maxAttempts = 30;
  let attempts = 0;
  const safetyLimit = n * 60;
  while (pts.length < n && attempts < safetyLimit) {
    attempts++;
    const p = new THREE.Vector3(
      rand(-half.x, half.x),
      rand(-half.y, half.y),
      rand(-half.z, half.z),
    );
    if (p.length() < 60) continue;
    let ok = true;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].distanceToSquared(p) < minDist * minDist) {
        if (++attempts % maxAttempts === 0) break;
        ok = false; break;
      }
    }
    if (ok) pts.push(p);
  }
  while (pts.length < n) {
    pts.push(new THREE.Vector3(
      rand(-half.x, half.x),
      rand(-half.y, half.y),
      rand(-half.z, half.z),
    ));
  }
  return pts;
}
