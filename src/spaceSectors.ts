import * as THREE from 'three';

export interface SpaceSectorDefinition {
  id: string;
  name: string;

  clearColor: number;
  fogColor: number;
  fogDensity: number;

  bloomStrength: number;
  starLightColor: number;
  starLightIntensity: number;

  nebulaColorA: number;
  nebulaColorB: number;
  nebulaColorC: number;

  planetPosition: THREE.Vector3;
  planetScale: number;
  planetColorA: number;
  planetColorB: number;

  debrisColor: number;
  debrisEmissive: number;
  debrisScale: number;

  // Optional visual effects for special sectors.
  closeStarScale?: number;
  closeStarPosition?: THREE.Vector3;
  blackHole?: boolean;
}

export const SPACE_SECTORS: SpaceSectorDefinition[] = [
  {
    id: 'violet-rift',
    name: 'Violet Rift',

    clearColor: 0x05010a,
    fogColor: 0x05010a,
    fogDensity: 0.00005,

    bloomStrength: 0.45,
    starLightColor: 0xffe4f0,
    starLightIntensity: 1.8,

    nebulaColorA: 0x3a0a5c,
    nebulaColorB: 0x124a7a,
    nebulaColorC: 0xff3a8a,

    planetPosition: new THREE.Vector3(1800, -300, -1800),
    planetScale: 1.0,
    planetColorA: 0x2a1a6a,
    planetColorB: 0x60a0ff,

    debrisColor: 0x776680,
    debrisEmissive: 0x221030,
    debrisScale: 1.0,
  },
  {
    id: 'blue-frost',
    name: 'Blue Frost',

    clearColor: 0x000b1f,
    fogColor: 0x00142f,
    fogDensity: 0.00007,

    bloomStrength: 0.72,
    starLightColor: 0x77ddff,
    starLightIntensity: 2.35,

    nebulaColorA: 0x003a88,
    nebulaColorB: 0x00d9ff,
    nebulaColorC: 0x85eaff,

    planetPosition: new THREE.Vector3(-1350, -220, -1400),
    planetScale: 1.25,
    planetColorA: 0x061d55,
    planetColorB: 0x8be9ff,

    debrisColor: 0x6f8da8,
    debrisEmissive: 0x0a3550,
    debrisScale: 0.75,
  },
  {
    id: 'golden-dust',
    name: 'Golden Dust',

    clearColor: 0x160806,
    fogColor: 0x1e0b03,
    fogDensity: 0.000065,

    bloomStrength: 0.82,
    starLightColor: 0xffc05a,
    starLightIntensity: 2.65,

    nebulaColorA: 0x8a3000,
    nebulaColorB: 0xffa000,
    nebulaColorC: 0xff4d77,

    planetPosition: new THREE.Vector3(1200, -170, -1350),
    planetScale: 1.35,
    planetColorA: 0x8a4100,
    planetColorB: 0xffd36a,

    debrisColor: 0xb88a50,
    debrisEmissive: 0x4a2400,
    debrisScale: 1.45,
  },
  {
    id: 'green-anomaly',
    name: 'Green Anomaly',

    clearColor: 0x00110a,
    fogColor: 0x002010,
    fogDensity: 0.00008,

    bloomStrength: 0.68,
    starLightColor: 0x99ffbf,
    starLightIntensity: 2.25,

    nebulaColorA: 0x004c2a,
    nebulaColorB: 0x00ff88,
    nebulaColorC: 0x72ffd0,

    planetPosition: new THREE.Vector3(-1450, -180, -1300),
    planetScale: 1.2,
    planetColorA: 0x094c25,
    planetColorB: 0x9affcc,

    debrisColor: 0x5aa878,
    debrisEmissive: 0x003a18,
    debrisScale: 1.05,
  },
  {
    id: 'red-warzone',
    name: 'Red Warzone',

    clearColor: 0x180004,
    fogColor: 0x250006,
    fogDensity: 0.000085,

    bloomStrength: 0.9,
    starLightColor: 0xff6040,
    starLightIntensity: 2.9,

    nebulaColorA: 0x700010,
    nebulaColorB: 0xff2040,
    nebulaColorC: 0xff8a35,

    planetPosition: new THREE.Vector3(1000, -260, -1150),
    planetScale: 1.32,
    planetColorA: 0x8a0909,
    planetColorB: 0xff4055,

    debrisColor: 0xa85656,
    debrisEmissive: 0x4a0000,
    debrisScale: 1.6,
  },

  // New: huge red-orange star nearby, inspired by Betelgeuse / red supergiant vibes.
  {
    id: 'betelgeuse-flare',
    name: 'Betelgeuse Flare',

    clearColor: 0x120205,
    fogColor: 0x1b0507,
    fogDensity: 0.000095,

    bloomStrength: 1.05,
    starLightColor: 0xff6a32,
    starLightIntensity: 3.2,

    nebulaColorA: 0x7a1000,
    nebulaColorB: 0xff5a16,
    nebulaColorC: 0xffc166,

    planetPosition: new THREE.Vector3(-950, -340, -1500),
    planetScale: 0.85,
    planetColorA: 0x5a1208,
    planetColorB: 0xff8a32,

    debrisColor: 0xc06a42,
    debrisEmissive: 0x6a1800,
    debrisScale: 1.25,

    closeStarScale: 3.4,
    closeStarPosition: new THREE.Vector3(-900, 260, -1250),
  },

  // New: fake black-hole sector. This is a safe visual imitation:
  // dark sphere + glowing accretion ring, no real lensing shader yet.
  {
    id: 'event-horizon',
    name: 'Event Horizon',

    clearColor: 0x000000,
    fogColor: 0x000006,
    fogDensity: 0.00011,

    bloomStrength: 1.1,
    starLightColor: 0x9ac7ff,
    starLightIntensity: 1.45,

    nebulaColorA: 0x000010,
    nebulaColorB: 0x2b0066,
    nebulaColorC: 0x66ccff,

    planetPosition: new THREE.Vector3(1800, -520, -2100),
    planetScale: 0.65,
    planetColorA: 0x050512,
    planetColorB: 0x5965ff,

    debrisColor: 0x444466,
    debrisEmissive: 0x09091f,
    debrisScale: 1.9,

    blackHole: true,
  },
];

export function getSpaceSectorForWave(wave: number): SpaceSectorDefinition {
  const safeWave = Math.max(1, Math.floor(wave || 1));
  const sectorIndex = Math.floor((safeWave - 1) / 3) % SPACE_SECTORS.length;
  return SPACE_SECTORS[sectorIndex];
}
