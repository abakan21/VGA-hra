import * as THREE from 'three';
import { Enemy } from './enemies';
import { Player } from './player';

export class HUD {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr = window.devicePixelRatio || 1;
  msg = '';
  msgTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  showMessage(msg: string, dur = 2.0) {
    this.msg = msg;
    this.msgTimer = dur;
  }

  draw(
    dt: number,
    player: Player,
    score: number,
    wave: number,
    enemies: Enemy[],
    sectorHalf: THREE.Vector3,
    camera?: THREE.Camera,
    combo = 0,
    comboTimer = 0,
    hitMarker = 0,
  ) {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = 'middle';
    ctx.font = '14px "Courier New", monospace';

    // hp bar, boost bar, shield bar -- pozice jsou natvrdo, ale funguje to
    this.drawBar(20, h - 60, 260, 18, player.entity.hp / player.entity.maxHp, '#ff3c50', 'HP', `${Math.ceil(player.entity.hp)} / ${player.entity.maxHp}`);
    this.drawBar(20, h - 32, 260, 12, player.powers.energy / 100, '#00e5ff', 'BOOST', '');
    if (player.powers.shield > 0) this.drawBar(20, h - 80, 260, 8, Math.min(1, player.powers.shield / 5), '#40c0ff', 'SHIELD', '');

    ctx.textAlign = 'right';
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.fillText(score.toLocaleString('en'), w - 24, 34);
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#aac';
    ctx.fillText('SCORE', w - 24, 56);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#ff3cf2';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${wave}`, w / 2, 28);
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = '#aac';
    ctx.fillText(`enemies: ${enemies.filter(e => e.alive).length}`, w / 2, 48);

    ctx.textAlign = 'left';
    let powerY = 26;
    const addPower = (label: string, color: string) => {
      ctx.fillStyle = color;
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText(label, 20, powerY);
      powerY += 20;
    };
    if (player.powers.tripleShot > 0) addPower(`TRIPLE SHOT ${player.powers.tripleShot.toFixed(1)}s`, '#ffaa20');
    if (player.powers.rapidFire > 0) addPower(`RAPID FIRE ${player.powers.rapidFire.toFixed(1)}s`, '#ffff40');
    if (player.powers.multiRocket > 0) addPower(`MULTI-ROCKET ${player.powers.multiRocket.toFixed(1)}s`, '#ff6020');
    if (player.powers.slowMo > 0) addPower(`SLOW-MO ${player.powers.slowMo.toFixed(1)}s`, '#a060ff');
    if (player.powers.nukes > 0) addPower(`NUKE x${player.powers.nukes} [Q]`, '#ff2040');

    if (player.powers.rocketCooldown > 0) {
      ctx.fillStyle = '#888';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText(`Rocket: ${player.powers.rocketCooldown.toFixed(1)}s`, 20, powerY + 4);
    } else {
      ctx.fillStyle = '#ffa040';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText('ROCKET READY', 20, powerY + 4);
    }

    this.drawCrosshair(w / 2, h / 2, hitMarker);

    if (combo >= 2) {
      // TODO: tahle hodnota by mela byt stejna jako v game.ts, nezapomenout zmenyt na obou mistech
      const mult = 1 + Math.min(2, (combo - 1) * 0.1);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffff40';
      ctx.font = 'bold 28px "Courier New", monospace';
      ctx.fillText(`${combo}x`, w / 2, h / 2 + 60);
      ctx.fillStyle = '#ffaa20';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText(`x${mult.toFixed(1)} SCORE`, w / 2, h / 2 + 82);
      const barW = 120, barH = 3;
      const bx = w / 2 - barW / 2, by = h / 2 + 92;
      ctx.fillStyle = '#ffff4088';
      ctx.fillRect(bx, by, barW * Math.max(0, comboTimer / 4), barH);
    }

    this.drawMinimap(w - 160 - 20, h - 160 - 20, 160, player, enemies, sectorHalf);
    if (camera) this.drawOffscreenIndicators(w, h, player, enemies, camera);

    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      const a = Math.min(1, this.msgTimer * 1.5);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ff3cf2';
      ctx.font = 'bold 40px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.msg, w / 2, h / 2 - 80);
      ctx.globalAlpha = 1;
    }

    // blikani pri invuln -- modulo 60ms, trochu se to lisi podle fps ale nevadi
    if (player.powers.invuln > 0 && Math.floor(performance.now() / 60) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 60, 242, 0.08)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawBar(x: number, y: number, w: number, h: number, frac: number, color: string, label: string, rightText: string) {
    const ctx = this.ctx;
    frac = Math.max(0, Math.min(1, frac));
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = color + '66';
    ctx.fillRect(x + 1, y + 1, (w - 2) * frac, h - 2);
    ctx.fillStyle = color;
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 6);
    if (rightText) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.fillText(rightText, x + w, y - 6);
    }
  }

  private drawCrosshair(x: number, y: number, hitMarker = 0) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.moveTo(x - 22, y); ctx.lineTo(x - 8, y);
    ctx.moveTo(x + 8, y); ctx.lineTo(x + 22, y);
    ctx.moveTo(x, y - 22); ctx.lineTo(x, y - 8);
    ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 22);
    ctx.stroke();
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(x - 1, y - 1, 2, 2);
    if (hitMarker > 0) {
      const a = Math.min(1, hitMarker / 0.12);
      ctx.strokeStyle = `rgba(255,80,80,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 10); ctx.lineTo(x - 4, y - 4);
      ctx.moveTo(x + 10, y - 10); ctx.lineTo(x + 4, y - 4);
      ctx.moveTo(x - 10, y + 10); ctx.lineTo(x - 4, y + 4);
      ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + 4, y + 4);
      ctx.stroke();
    }
  }

  // minimap je orientovany podle smerovani hrace, ne podle svetove osy
  private drawMinimap(x: number, y: number, size: number, player: Player, enemies: Enemy[], sectorHalf: THREE.Vector3) {
    const ctx = this.ctx;
    const r = size / 2;
    const cx = x + r, cy = y + r;

    ctx.fillStyle = 'rgba(0, 0, 30, 0.5)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#00e5ff88'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.33, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    ctx.stroke();

    const fwd = player.getForward();
    const yawAngle = Math.atan2(fwd.x, fwd.z);
    const cs = Math.cos(-yawAngle), sn = Math.sin(-yawAngle);
    // scale * 6 je hack aby nepratelé byli viditelnejsi na minimape
    const scale = (r - 4) / Math.max(sectorHalf.x, sectorHalf.z);

    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.position.x - player.entity.position.x;
      const dz = e.position.z - player.entity.position.z;
      const rx = dx * cs - dz * sn;
      const rz = dx * sn + dz * cs;
      let px = cx + rx * scale * 6;
      let py = cy + rz * scale * 6;
      const dist = Math.hypot(px - cx, py - cy);
      if (dist > r - 4) {
        px = cx + (px - cx) * ((r - 4) / dist);
        py = cy + (py - cy) * ((r - 4) / dist);
      }
      const color = e.kind === 'boss' ? '#ff3cf2' : e.kind === 'chaser' ? '#ff2a40' : '#00e5ff';
      ctx.fillStyle = color;
      const sz = e.kind === 'boss' ? 4 : 2.5;
      ctx.fillRect(px - sz, py - sz, sz * 2, sz * 2);
    }

    // trojuhelnik = hrac, vzdy uprostred
    ctx.fillStyle = '#00ff80';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx - 3, cy + 3);
    ctx.lineTo(cx + 3, cy + 3);
    ctx.closePath(); ctx.fill();
  }

  // sipky kdyz je neprel mimo obrazovku, projekce pres THREE.Camera
  private drawOffscreenIndicators(w: number, h: number, player: Player, enemies: Enemy[], camera: THREE.Camera) {
    const ctx = this.ctx;
    const cx = w / 2, cy = h / 2;
    const margin = 60;
    const tmp = new THREE.Vector3();
    for (const e of enemies) {
      if (!e.alive) continue;
      tmp.copy(e.position).project(camera);
      const behind = tmp.z > 1;
      const onScreen = !behind && tmp.x > -1 && tmp.x < 1 && tmp.y > -1 && tmp.y < 1;
      if (onScreen) {
        const sx = (tmp.x * 0.5 + 0.5) * w;
        const sy = (1 - (tmp.y * 0.5 + 0.5)) * h;
        const color = e.kind === 'boss' ? '#ff3cf2' : e.kind === 'chaser' ? '#ff2a40' : '#00e5ff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx - 24, sy - 24, 48, 48);
        ctx.fillStyle = color;
        ctx.font = '10px "Courier New", monospace';
        ctx.textAlign = 'left';
        const dist = e.position.distanceTo(player.entity.position);
        ctx.fillText(`${Math.round(dist)}m`, sx + 28, sy);
      } else {
        let dx = tmp.x, dy = tmp.y;
        if (behind) { dx = -dx; dy = -dy; }
        const len = Math.hypot(dx, dy) || 1;
        dx /= len; dy /= len;
        const maxR = Math.min(w, h) / 2 - margin;
        const px = cx + dx * maxR;
        const py = cy - dy * maxR;
        const color = e.kind === 'boss' ? '#ff3cf2' : e.kind === 'chaser' ? '#ff2a40' : '#00e5ff';
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.atan2(-dy, dx));
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-4, -7);
        ctx.lineTo(-4, 7);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }
}
