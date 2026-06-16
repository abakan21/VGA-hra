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
  ambientColor: number;
  ambientIntensity: number;
  nebulaColorA: number;
  nebulaColorB: number;
  nebulaColorC: number;
  planetPosition: THREE.Vector3;
  planetRadius: number;
  planetScale: number;
  planetColorA: number;
  planetColorB: number;
  debrisCount: number;
  debrisScale: number;
  debrisColor: number;
  debrisEmissive: number;
  blackHole?: boolean;
  closeStarScale?: number;
  closeStarPosition?: THREE.Vector3;
}

// sektory jsem ladil rucne, mozna pridat dalsi pozdeji
const SECTORS: SpaceSectorDefinition[] = [
  {
    id: 'nebula',
    name: 'NEBULA SECTOR',
    clearColor: 0x05010a,
    fogColor: 0x05010a,
    fogDensity: 0.00005,
    bloomStrength: 0.45,
    starLightColor: 0xffe4f0,
    starLightIntensity: 1.8,
    ambientColor: 0x6a4878,
    ambientIntensity: 0.9,
    nebulaColorA: 0x3a1060,
    nebulaColorB: 0x8020a0,
    nebulaColorC: 0x200830,
    planetPosition: new THREE.Vector3(1800, -300, -1800),
    planetRadius: 320,
    planetScale: 1.0,
    planetColorA: 0x2a1a6a,
    planetColorB: 0x60a0ff,
    debrisCount: 220,
    debrisScale: 1.0,
    debrisColor: 0x8866aa,
    debrisEmissive: 0x220033,
  },
  {
    id: 'asteroid-belt',
    name: 'ASTEROID BELT',
    clearColor: 0x080510,
    fogColor: 0x080510,
    fogDensity: 0.00007,
    bloomStrength: 0.38,
    starLightColor: 0xffd0c0,
    starLightIntensity: 2.0,
    ambientColor: 0x504060,
    ambientIntensity: 0.7,
    nebulaColorA: 0x4a2010,
    nebulaColorB: 0x903020,
    nebulaColorC: 0x200808,
    planetPosition: new THREE.Vector3(-2200, 200, -1600),
    planetRadius: 280,
    planetScale: 0.9,
    planetColorA: 0x5a3010,
    planetColorB: 0xc08040,
    debrisCount: 340,
    debrisScale: 1.4,
    debrisColor: 0x886644,
    debrisEmissive: 0x221100,
  },
  {
    id: 'deep-space',
    name: 'DEEP SPACE',
    clearColor: 0x010208,
    fogColor: 0x010208,
    fogDensity: 0.00003,
    bloomStrength: 0.55,
    starLightColor: 0xc0d0ff,
    starLightIntensity: 1.4,
    ambientColor: 0x203060,
    ambientIntensity: 0.6,
    nebulaColorA: 0x102040,
    nebulaColorB: 0x2040a0,
    nebulaColorC: 0x080820,
    planetPosition: new THREE.Vector3(2400, -500, -2000),
    planetRadius: 400,
    planetScale: 1.2,
    planetColorA: 0x102050,
    planetColorB: 0x3060c0,
    debrisCount: 160,
    debrisScale: 0.8,
    debrisColor: 0x4466aa,
    debrisEmissive: 0x001133,
  },
  {
    id: 'void',
    name: 'THE VOID',
    clearColor: 0x000005,
    fogColor: 0x000005,
    fogDensity: 0.00002,
    bloomStrength: 0.65,
    starLightColor: 0xa080ff,
    starLightIntensity: 1.2,
    ambientColor: 0x300850,
    ambientIntensity: 0.5,
    nebulaColorA: 0x200840,
    nebulaColorB: 0x5010a0,
    nebulaColorC: 0x100020,
    planetPosition: new THREE.Vector3(-1800, 400, -2400),
    planetRadius: 260,
    planetScale: 0.85,
    planetColorA: 0x300850,
    planetColorB: 0x9030e0,
    debrisCount: 120,
    debrisScale: 0.7,
    debrisColor: 0x6633aa,
    debrisEmissive: 0x110022,
    blackHole: true,
  },
  {
    id: 'solar-flare',
    name: 'SOLAR FLARE ZONE',
    clearColor: 0x0a0500,
    fogColor: 0x0a0500,
    fogDensity: 0.00008,
    bloomStrength: 0.7,
    starLightColor: 0xffaa40,
    starLightIntensity: 2.8,
    ambientColor: 0x703010,
    ambientIntensity: 1.1,
    nebulaColorA: 0x602000,
    nebulaColorB: 0xd04000,
    nebulaColorC: 0x300800,
    planetPosition: new THREE.Vector3(600, -200, -800),
    planetRadius: 500,
    planetScale: 1.6,
    planetColorA: 0x803010,
    planetColorB: 0xff6020,
    debrisCount: 280,
    debrisScale: 1.6,
    debrisColor: 0xaa5522,
    debrisEmissive: 0x331100,
    closeStarScale: 2.4,
    closeStarPosition: new THREE.Vector3(-800, 600, -2000),
  },
];

// TODO: mozna lepsi logika pro prideleni sektoru podle vlny, zatim jednoduchy modulo
export function getSpaceSectorForWave(wave: number): SpaceSectorDefinition {
  const idx = Math.floor((wave - 1) / 5) % SECTORS.length;
  return SECTORS[idx];
}
