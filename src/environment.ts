import * as THREE from 'three';
import { rand, randomUnitVec } from './util';

const NEBULA_FS = `
  varying vec3 vDir;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

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
  float fbm(vec3 p){
    float v = 0.0; float a = 0.5;
    for(int i = 0; i < 5; i++){
      v += a * noise(p);
      p *= 2.1; a *= 0.5;
    }
    return v;
  }

  void main(){
    vec3 d = normalize(vDir);
    float n1 = fbm(d * 2.5 + vec3(0.0, uTime*0.005, 0.0));
    float n2 = fbm(d * 5.0 + vec3(10.0));
    float n3 = fbm(d * 9.0 + vec3(-5.0));

    vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.7, n1));
    col = mix(col, uColorC, smoothstep(0.35, 0.75, n2) * 0.6);
    col *= 0.55 + 0.55 * n1;
    col += pow(n3, 4.0) * vec3(0.9, 0.7, 1.0) * 0.3;

    col = mix(vec3(0.01, 0.005, 0.02), col, 0.75);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const NEBULA_VS = `
  varying vec3 vDir;
  void main(){
    vDir = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w;
  }
`;

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

const PLANET_FS = `
  varying vec3 vN;
  varying vec3 vP;
  uniform float uTime;
  uniform vec3 uLightDir;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){
    vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.2; a*=0.5;} return v; }

  void main(){
    vec3 n = normalize(vN);
    float bands = fbm(n * 3.0 + vec3(uTime*0.02, 0.0, 0.0));
    float swirls = fbm(n * 6.0);
    float m = bands * 0.6 + swirls * 0.4;
    vec3 base = mix(uColorA, uColorB, smoothstep(0.3, 0.7, m));
    float diff = clamp(dot(n, normalize(-uLightDir)), 0.0, 1.0);
    vec3 lit = base * (0.25 + 0.9 * diff);
    float rim = pow(1.0 - clamp(dot(n, vec3(0,0,1)), 0.0, 1.0), 3.0);
    lit += rim * vec3(0.6, 0.4, 0.9) * 0.35;
    gl_FragColor = vec4(lit, 1.0);
  }
`;

const PLANET_VS = `
  varying vec3 vN;
  varying vec3 vP;
  void main(){
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vP = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

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
