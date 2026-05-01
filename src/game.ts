import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/shaders/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

import { Input } from './input';
import { Player } from './player';
import { WeaponSystem } from './weapons';
import { EnemyManager, Enemy } from './enemies';
import { AsteroidField, createAsteroidField, hideAsteroidInstance } from './asteroids';
import { ParticlePool } from './particles';
import { PowerupManager } from './powerups';
import { HUD } from './hud';
import { AudioFx } from './audio';
import { createDistantStar, createStarfield } from './skybox';
import { createNebula, createPlanet, createDebris, DebrisField } from './environment';
import { loadDecor, updateDecor, DecorObject } from './decor';
import { Entity } from './entity';

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

export interface GameCallbacks {
  onStateChange: (s: GameState, score: number) => void;
}

const SECTOR = new THREE.Vector3(1000, 700, 1000);
const FIXED_DT = 1 / 60;

// vignette + film grain shader, wrote this myself based on some shadertoy thing
const VIGNETTE_FS = `
  uniform sampler2D tDiffuse;
  uniform float uGrain;
  varying vec2 vUv;
  float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
  void main(){
    vec4 col = texture2D(tDiffuse, vUv);
    vec2 p = vUv - 0.5;
    float v = smoothstep(0.85, 0.35, length(p));
    col.rgb *= v;
    float g = (rand(vUv + uGrain) - 0.5) * 0.06;
    col.rgb += g;
    gl_FragColor = col;
  }`;

export class Game {
  gl: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  fxaa: ShaderPass;
  vignette: ShaderPass;

  input: Input;
  player: Player;
  weapons: WeaponSystem;
  enemies: EnemyManager;
  asteroids!: AsteroidField;
  particles: ParticlePool;
  powerups: PowerupManager;
  hud: HUD;
  audio: AudioFx;
  starfield: THREE.Points;
  star: THREE.Mesh;
  starLight: THREE.DirectionalLight;
  nebula: THREE.Mesh;
  planet: THREE.Group;
  debris: DebrisField;
  decor: DecorObject[] = [];

  state: GameState = 'menu';
  score = 0;
  accumulator = 0;
  lastTime = 0;
  running = false;

  shake = 0;
  combo = 0;
  comboTimer = 0;
  hitMarker = 0;
  baseFov = 70;

  private cb: GameCallbacks;

  constructor(gl: HTMLCanvasElement, hudCanvas: HTMLCanvasElement, cb: GameCallbacks) {
    this.gl = gl;
    this.cb = cb;

    this.renderer = new THREE.WebGLRenderer({
      canvas: gl, antialias: false, powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x05010a, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05010a, 0.00005);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.camera.position.set(0, 4, 15);

    this.input = new Input(gl);
    this.audio = new AudioFx();

    this.nebula = createNebula();
    this.scene.add(this.nebula);
    this.starfield = createStarfield(5000);
    this.scene.add(this.starfield);
    this.star = createDistantStar();
    this.scene.add(this.star);

    // TODO: maybe move planet/debris setup into a separate function, this constructor is getting long
    const lightDirInit = this.star.position.clone().negate().normalize();
    this.planet = createPlanet(
      new THREE.Vector3(1800, -300, -1800),
      320,
      0x2a1a6a,
      0x60a0ff,
      lightDirInit,
    );
    this.scene.add(this.planet);

    this.debris = createDebris(220, SECTOR);
    this.scene.add(this.debris.mesh);

    // lighting setup — took forever to get this looking right
    this.starLight = new THREE.DirectionalLight(0xffe4f0, 1.8);
    this.starLight.position.copy(this.star.position).normalize();
    this.scene.add(this.starLight);
    const amb = new THREE.AmbientLight(0x6a4878, 0.9);
    this.scene.add(amb);
    const hemi = new THREE.HemisphereLight(0xa080ff, 0x301030, 0.6);
    this.scene.add(hemi);
    // fill lights so the ship doesn't look flat
    const fillPink = new THREE.DirectionalLight(0xff4a90, 0.35);
    fillPink.position.set(-1, -0.4, 0.6);
    this.scene.add(fillPink);
    const fillCyan = new THREE.DirectionalLight(0x40a0ff, 0.5);
    fillCyan.position.set(0.3, 0.8, -1);
    this.scene.add(fillCyan);

    this.player = new Player(this.scene);
    this.weapons = new WeaponSystem(this.scene);
    this.enemies = new EnemyManager(this.scene, this.weapons);
    this.particles = new ParticlePool(900);
    this.scene.add(this.particles.mesh);
    this.powerups = new PowerupManager(this.scene);
    this.hud = new HUD(hudCanvas);

    const lightDir = this.star.position.clone().negate().normalize();
    this.asteroids = createAsteroidField(this.scene, 140, SECTOR, lightDir);

    loadDecor(this.scene, SECTOR).then((d) => { this.decor = d; });

    // post processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.7, 0.85);
    this.composer.addPass(this.bloom);

    this.fxaa = new ShaderPass(FXAAShader);
    const pr = this.renderer.getPixelRatio();
    this.fxaa.material.uniforms['resolution'].value.set(1 / (window.innerWidth * pr), 1 / (window.innerHeight * pr));
    this.composer.addPass(this.fxaa);

    this.vignette = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uGrain: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);}`,
      fragmentShader: VIGNETTE_FS,
    });
    this.composer.addPass(this.vignette);

    this.enemies.onWaveStart = (w) => {
      const bossWave = w % 5 === 0;
      this.hud.showMessage(bossWave ? `⚠ BOSS WAVE ${w}` : `WAVE ${w}`, bossWave ? 2.2 : 1.6);
      this.audio.waveStart();
      if (bossWave) this.shake = Math.max(this.shake, 0.8);
    };
    this.enemies.onWaveCleared = (w) => {
      this.hud.showMessage(`WAVE ${w} CLEARED +${50 * w}`, 1.5);
      this.score += 50 * w;
    };

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.fxaa.material.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr));
    this.hud.resize();
  }

  setState(s: GameState) {
    this.state = s;
    this.cb.onStateChange(s, this.score);
    if (s === 'playing') {
      this.input.setWantLock(true);
      this.audio.startAmbient();
    } else {
      this.input.setWantLock(false);
      this.input.clear();
      if (s === 'gameover' || s === 'menu') this.audio.stopAmbient();
    }
  }

  startNew() {
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = 0;
    this.weapons.clear();
    this.enemies.clear();
    this.powerups.clear();
    this.player.reset();
    // -2.5 so the first wave doesn't start immediately when you click play
    this.enemies.waveTimer = this.enemies.waveDelay - 2.5;
    this.enemies.waveActive = false;
    this.enemies.wave = 0;
    this.setState('playing');
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  private loop = (t: number) => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const nowSec = t / 1000;
    let dt = nowSec - this.lastTime / 1000;
    this.lastTime = t;
    // clamp dt so if the tab loses focus and comes back it doesnt explode
    if (dt > 0.1) dt = 0.1;

    if (this.state === 'playing') {
      this.accumulator += dt;
      while (this.accumulator >= FIXED_DT) {
        this.step(FIXED_DT);
        this.accumulator -= FIXED_DT;
      }
    }
    this.render(dt);
  };

  private step(dt: number) {
    if (this.input.consumeEsc()) { this.setState('paused'); return; }

    this.player.update(dt, this.input, this.camera, SECTOR);

    // shooting
    if (this.input.buttons.left && this.player.laserCooldown <= 0) {
      const fwd = this.player.getForward();
      const right = this.player.getRight();
      const muzzle = this.player.entity.position.clone().addScaledVector(fwd, 3);
      const rapid = this.player.powers.rapidFire > 0;
      const vel = this.player.entity.velocity;
      if (this.player.powers.tripleShot > 0) {
        this.weapons.fireTripleShot(muzzle, fwd, right, 8, vel);
        this.player.laserCooldown = rapid ? 0.075 : 0.15;
      } else {
        this.weapons.fireLaser(muzzle, fwd, true, 280, 10, vel);
        this.player.laserCooldown = rapid ? 0.065 : 0.13;
      }
      this.audio.laser();
    }
    if (this.input.buttons.right && this.player.powers.rocketCooldown <= 0) {
      const fwd = this.player.getForward();
      const right = this.player.getRight();
      const up = this.player.getUp();
      const muzzle = this.player.entity.position.clone().addScaledVector(fwd, 3);
      const target = this.weapons.findHomingTarget(muzzle, fwd, this.enemies.enemies);
      const vel = this.player.entity.velocity;
      if (this.player.powers.multiRocket > 0) {
        this.weapons.fireMultiRocket(muzzle, fwd, right, up, target, 60, vel);
      } else {
        this.weapons.fireRocket(muzzle, fwd, target, 60, vel);
      }
      this.player.powers.rocketCooldown = 3.0;
      this.audio.rocket();
    }
    if (this.input.consumeNuke() && this.player.powers.nukes > 0) {
      this.player.powers.nukes--;
      this.triggerNuke();
    }

    if (this.player.powers.boostActive) {
      const fwd = this.player.getForward();
      const base = this.player.entity.position.clone().addScaledVector(fwd, -2.5);
      this.particles.emitThrust(base, fwd);
      if (Math.random() < 0.5) this.particles.emitThrust(base.clone().addScaledVector(this.player.getRight(), 0.6), fwd);
    }

    this.weapons.update(dt);
    const timeScale = this.player.powers.slowMo > 0 ? 0.3 : 1;
    this.enemies.update(dt, this.player.entity.position, timeScale);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.5);
    if (this.hitMarker > 0) this.hitMarker -= dt;
    this.asteroids.update(dt);
    this.powerups.update(dt);
    this.particles.update(dt);

    for (const r of this.weapons.projectiles) {
      if (r.kind === 'rocket' && r.alive) this.particles.emitTrail(r.position.clone());
    }

    this.handleCollisions();

    if (!this.player.entity.alive) {
      this.audio.gameOver();
      this.setState('gameover');
    }
  }

  private handleCollisions() {
    const player = this.player.entity;
    const enemies = this.enemies.enemies;

    for (const p of this.weapons.projectiles) {
      if (!p.alive) continue;

      if (p.kind === 'laser' || p.kind === 'rocket') {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (sphereHit(p, e)) {
            this.damageEnemy(e, p.data.damage);
            p.alive = false;
            this.hitMarker = 0.12;
            if (p.kind === 'rocket') {
              this.particles.emitExplosion(p.position.clone(), 40, 22, new THREE.Color(1, 0.6, 0.2));
              this.audio.explode();
              this.shake = Math.max(this.shake, 0.5);
            } else {
              this.particles.emitExplosion(p.position.clone(), 6, 8, new THREE.Color(1, 1, 0.6));
            }
            break;
          }
        }
        if (!p.alive) continue;

        // check asteroid hits
        for (const a of this.asteroids.entities) {
          if (!a.alive) continue;
          if (sphereHit(p, a)) {
            a.hp -= p.data.damage;
            this.particles.emitExplosion(p.position.clone(), 8, 10, new THREE.Color(0.8, 0.4, 1.0));
            if (a.hp <= 0) {
              a.alive = false;
              hideAsteroidInstance(this.asteroids.mesh, a.data.index);
              this.particles.emitExplosion(a.position.clone(), 28, 16, new THREE.Color(0.9, 0.5, 1.0));
              this.audio.explode();
              this.score += 10;
              this.powerups.maybeDrop(a.position.clone(), 0.12);
            }
            p.alive = false;
            break;
          }
        }
      } else if (p.kind === 'enemyLaser') {
        if (sphereHit(p, player)) {
          const dead = this.player.takeDamage(p.data.damage);
          this.audio.hit();
          this.particles.emitExplosion(p.position.clone(), 6, 6, new THREE.Color(1, 0.3, 0.3));
          this.shake = Math.max(this.shake, 0.4);
          p.alive = false;
          if (dead) return;
        }
      }
    }

    // enemy body collisions with player
    for (const e of enemies) {
      if (!e.alive) continue;
      if (sphereHit(player, e)) {
        this.damageEnemy(e, 10);
        const dead = this.player.takeDamage(10);
        this.audio.hit();
        if (dead) return;
      }
    }

    for (const a of this.asteroids.entities) {
      if (!a.alive) continue;
      if (sphereHit(player, a)) {
        this.player.takeDamage(4);
        // push the player away so they dont get stuck inside
        const push = player.position.clone().sub(a.position).normalize().multiplyScalar(12);
        player.velocity.add(push);
        this.audio.hit();
      }
    }

    for (const pu of this.powerups.items) {
      if (!pu.alive) continue;
      if (sphereHit(player, pu)) {
        if (pu.puKind === 'health') {
          player.hp = Math.min(player.maxHp, player.hp + 35);
          this.hud.showMessage('+ HEALTH', 1.2);
        } else if (pu.puKind === 'triple') {
          this.player.powers.tripleShot = 10;
          this.hud.showMessage('TRIPLE SHOT', 1.2);
        } else if (pu.puKind === 'shield') {
          this.player.powers.shield = 8;
          this.hud.showMessage('SHIELD ACTIVE', 1.2);
        } else if (pu.puKind === 'rapid') {
          this.player.powers.rapidFire = 10;
          this.hud.showMessage('RAPID FIRE', 1.2);
        } else if (pu.puKind === 'multirocket') {
          this.player.powers.multiRocket = 15;
          this.hud.showMessage('MULTI-ROCKET', 1.2);
        } else if (pu.puKind === 'slowmo') {
          this.player.powers.slowMo = 3;
          this.hud.showMessage('SLOW-MO', 1.2);
        } else if (pu.puKind === 'nuke') {
          this.player.powers.nukes = Math.min(3, this.player.powers.nukes + 1);
          this.hud.showMessage('NUKE [Q]', 1.4);
        }
        pu.alive = false;
        this.audio.pickup();
      }
    }
  }

  private triggerNuke() {
    const origin = this.player.entity.position.clone();
    const radius = 180; // TODO: maybe make this a constant or tie it to player level
    const dmg = 220;
    for (const e of this.enemies.enemies) {
      if (!e.alive) continue;
      const d = e.position.distanceTo(origin);
      if (d < radius) {
        // enemies closer to center take more damage
        const fall = 1 - (d / radius) * 0.6;
        this.damageEnemy(e, dmg * fall);
      }
    }
    for (const a of this.asteroids.entities) {
      if (!a.alive) continue;
      const d = a.position.distanceTo(origin);
      if (d < radius * 0.5) {
        a.hp -= dmg;
        if (a.hp <= 0) {
          a.alive = false;
          hideAsteroidInstance(this.asteroids.mesh, a.data.index);
          this.particles.emitExplosion(a.position.clone(), 24, 14, new THREE.Color(0.9, 0.5, 1.0));
          this.score += 10;
        }
      }
    }
    this.particles.emitExplosion(origin, 180, 60, new THREE.Color(1, 0.4, 0.2));
    this.particles.emitExplosion(origin, 120, 80, new THREE.Color(1, 0.8, 0.3));
    this.audio.bigExplode();
    this.hud.showMessage('NUKE!', 1.2);
    this.player.powers.invuln = Math.max(this.player.powers.invuln, 0.5);
  }

  private damageEnemy(e: Enemy, dmg: number) {
    e.hp -= dmg;
    e.data.hitFlash = 0.12;
    if (e.hp <= 0) {
      e.alive = false;
      // different colors per enemy type
      const color = e.kind === 'chaser' ? new THREE.Color(1, 0.3, 0.4)
        : e.kind === 'boss' ? new THREE.Color(1, 0.3, 1)
        : new THREE.Color(0.3, 0.9, 1);
      this.particles.emitExplosion(
        e.position.clone(),
        e.kind === 'boss' ? 80 : 40,
        e.kind === 'boss' ? 40 : 22,
        color
      );
      if (e.kind === 'boss') this.audio.bigExplode(); else this.audio.explode();
      this.shake = Math.max(this.shake, e.kind === 'boss' ? 1.0 : 0.35);

      this.combo++;
      this.comboTimer = 4.0;
      // combo multiplier caps at 3x, grows by 0.15 per kill — felt better than 0.1
      const mult = 1 + Math.min(2, (this.combo - 1) * 0.15);
      let baseScore = 30;
      if (e.kind === 'boss') {
        baseScore = 200;
        this.powerups.spawn(e.position.clone(), 'health');
        this.powerups.spawn(e.position.clone().add(new THREE.Vector3(4, 0, 0)), 'shield');
      } else if (e.kind === 'chaser') {
        baseScore = 50;
        this.powerups.maybeDrop(e.position.clone(), 0.3);
      } else {
        baseScore = 30;
        this.powerups.maybeDrop(e.position.clone(), 0.25);
      }
      this.score += Math.round(baseScore * mult);
      // console.log('score', this.score, 'combo', this.combo, 'mult', mult);
    }
    this.enemies.removeDead();
  }

  private render(dt: number) {
    // lerp fov when boosting
    const boostTarget = this.player.powers.boostActive ? 84 : this.baseFov;
    const lerpFov = this.camera.fov + (boostTarget - this.camera.fov) * (1 - Math.exp(-6 * dt));
    if (Math.abs(lerpFov - this.camera.fov) > 0.01) {
      this.camera.fov = lerpFov;
      this.camera.updateProjectionMatrix();
    }

    // camera shake — just random offset each frame, good enough
    let shakeX = 0, shakeY = 0, shakeZ = 0;
    if (this.shake > 0) {
      const s = this.shake * 0.8;
      shakeX = (Math.random() - 0.5) * s;
      shakeY = (Math.random() - 0.5) * s;
      shakeZ = (Math.random() - 0.5) * s;
      this.camera.position.x += shakeX;
      this.camera.position.y += shakeY;
      this.camera.position.z += shakeZ;
    }

    this.vignette.uniforms.uGrain.value = Math.random();
    (this.star.material as THREE.ShaderMaterial).uniforms.uTime.value += dt;
    const nebMat = this.nebula.material as THREE.ShaderMaterial;
    nebMat.uniforms.uTime.value += dt;
    const planetSphere = this.planet.children[0] as THREE.Mesh;
    (planetSphere.material as THREE.ShaderMaterial).uniforms.uTime.value += dt;
    this.planet.rotation.y += dt * 0.01;
    // keep skybox centered on camera so it never moves
    this.nebula.position.copy(this.camera.position);
    this.starfield.position.copy(this.camera.position);
    this.starfield.rotation.y += dt * 0.002;
    this.debris.update(dt);
    updateDecor(this.decor, dt);

    this.composer.render();

    // undo shake after render so it doesnt accumulate
    if (shakeX !== 0 || shakeY !== 0 || shakeZ !== 0) {
      this.camera.position.x -= shakeX;
      this.camera.position.y -= shakeY;
      this.camera.position.z -= shakeZ;
    }

    if (this.state === 'playing' || this.state === 'paused') {
      this.hud.draw(dt, this.player, this.score, Math.max(1, this.enemies.wave), this.enemies.enemies, SECTOR, this.camera, this.combo, this.comboTimer, this.hitMarker);
    } else {
      const ctx = this.hud.ctx;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }
}

// using squared distance to avoid sqrt, idk if it actually matters for perf but whatever
function sphereHit(a: Entity, b: Entity): boolean {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const dz = a.position.z - b.position.z;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy + dz * dz < r * r;
}
