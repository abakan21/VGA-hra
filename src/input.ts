export class Input {
  keys = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  mouseX = 0;
  mouseY = 0;
  buttons = { left: false, right: false, middle: false };
  locked = false;
  private el: HTMLElement;
  private wantLock = false;
  private _lockRequested = false;

  /** Initializes input listeners and binds them to the given element */
  constructor(el: HTMLElement) {
    this.el = el;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this.keys.add(e.key);
      if (e.code === 'Escape') this.keys.add('__esc');
      if (e.code === 'KeyQ') this.keys.add('__nuke');
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (this.locked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      } else {
        this.mouseDX += e.movementX * 0;
      }
    });

    el.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.buttons.left = true;
      if (e.button === 1) this.buttons.middle = true;
      if (e.button === 2) this.buttons.right = true;
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
      this._lockRequested = false;
    });
  }

  /** Enables or disables pointer lock mode for the element */
  setWantLock(v: boolean) {
    this.wantLock = v;
    if (!v && this.locked) document.exitPointerLock();
    else if (v && !this.locked) this.requestLock();
  }

  /** Sends a pointer lock request to the browser */
  requestLock() {
    this._lockRequested = true;
    try { (this.el as any).requestPointerLock(); } catch {}
  }

  /** Returns true and consumes the escape key event if it was pressed */
  consumeEsc(): boolean {
    if (this.keys.has('__esc')) { this.keys.delete('__esc'); return true; }
    if (this.keys.has('Escape')) return true;
    return false;
  }

  /** Returns true and consumes the nuke key event if it was pressed */
  consumeNuke(): boolean {
    if (this.keys.has('__nuke')) { this.keys.delete('__nuke'); return true; }
    return false;
  }

  /** Returns accumulated mouse delta since last call and resets it to zero */
  consumeMouse(): { dx: number; dy: number } {
    const r = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0; this.mouseDY = 0;
    return r;
  }

  /** Checks whether a given key code is currently held down */
  isKeyDown(code: string): boolean {
    return this.keys.has(code) || this.keys.has(code.toLowerCase());
  }

  /** Resets all input state including keys, buttons and mouse deltas */
  clear() {
    this.keys.clear();
    this.buttons.left = false;
    this.buttons.right = false;
    this.mouseDX = 0; this.mouseDY = 0;
    this.locked = false;
  }
}