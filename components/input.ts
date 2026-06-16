export class Input {
  keys = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  buttons = { left: false, right: false };
  locked = false;

  private el: HTMLElement;
  private wantLock = false;

  constructor(el: HTMLElement) {
    this.el = el;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Escape') this.keys.add('__esc');
      if (e.code === 'KeyQ') this.keys.add('__nuke');
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    window.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });

    el.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.buttons.left = true;
      if (e.button === 2) this.buttons.right = true;
      if (this.wantLock && !this.locked) this.requestLock();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.buttons.left = false;
      if (e.button === 2) this.buttons.right = false;
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el;
    });
  }

  setWantLock(v: boolean) {
    this.wantLock = v;
    if (!v && this.locked) document.exitPointerLock();
    else if (v && !this.locked) this.requestLock();
  }
  requestLock() {
    try { (this.el as any).requestPointerLock(); } catch {}
  }

  consumeEsc(): boolean {
    if (this.keys.has('__esc')) { this.keys.delete('__esc'); return true; }
    return false;
  }
  consumeNuke(): boolean {
    if (this.keys.has('__nuke')) { this.keys.delete('__nuke'); return true; }
    return false;
  }
  consumeMouse(): { dx: number; dy: number } {
    const r = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0; this.mouseDY = 0;
    return r;
  }
  clear() {
    this.keys.clear();
    this.buttons.left = false;
    this.buttons.right = false;
    this.mouseDX = 0; this.mouseDY = 0;
  }
}
