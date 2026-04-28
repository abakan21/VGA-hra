import * as THREE from 'three';

export type EntityKind =
  | 'player'
  | 'asteroid'
  | 'chaser'
  | 'drone'
  | 'boss'
  | 'laser'
  | 'enemyLaser'
  | 'rocket'
  | 'powerup'
  | 'particle';

export interface Entity {
  id: number;
  kind: EntityKind;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  ttl?: number;
  data?: any;
  object3d?: THREE.Object3D;
  onDestroy?: () => void;
}

let nextId = 1;
export function newId(): number { return nextId++; }
