alert('SCENE.JS REAL VERSION LOADED');

// =====================================================
// CONFIG
// =====================================================
export const TILE_S = 85;
export const TILE_P = 4;
export const VISUAL_S = TILE_S - TILE_P * 2;
export const GRID = 8;

const TYPES = ['red', 'blue', 'green', 'purple', 'yellow'];

const BG_COLORS = {
  red: 0x3d0a0a,
  blue: 0x0a1a2f,
  green: 0x0a240a,
  purple: 0x220a35,
  yellow: 0x2d2405
};

const GLOW_COLORS = {
  red: 0xff0000,
  blue: 0x00aaff,
  green: 0x00ff00,
  purple: 0xaa00ff,
  yellow: 0xffaa00
};

// =====================================================
// SCENE
// =====================================================
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.grid = [];
    this.sel = null;
    this.isAnimating = false;
  }

  // ===================================================
  // PRELOAD
  // ===================================================
 preload() {
  this.load.image('bg', '/assets/bg.jpg');

  TYPES.forEach(t => {
    this.load.image(`t_${t}`, `/assets/rune_${t}.png`);
  });
}


  // ===================================================
  // CREATE
  // ===================================================
  create() {
    console.log('SCENE LOADED: FINAL MATCH-3');

    // ---- BACKGROUND ----
    this.bg = this.add.image(0, 0, 'bg')
      .setOrigin(0.5)
      .setDepth(-100);

    this.recalcLayout();

    // ---- GRID ----
    for (let r = 0; r < GRID; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID; c++) {
        this.spawnTile(r, c);
      }
    }

    // ---- RESIZE ----
    this.scale.on('resize', () => {
      this.recalcLayout();
      this.repositionAll();
    });
  }

  // ===================================================
  // LAYOUT
  // ===================================================
  recalcLayout() {
    const w = this.scale.width;
    const h = this.scale.height;

    const scale = Math.max(
      w / this.bg.width,
      h / this.bg.height
    );
    this.bg.setScale(scale);
    this.bg.setPosition(w / 2, h / 2);

    this.OFFSET_X = Math.floor((w - GRID * TILE_S) / 2);
    this.OFFSET_Y = Math.floor((h - GRID * TILE_S) / 2);
  }

  repositionAll() {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const t = this.grid[r][c];
        if (!t) continue;
        t.x = this.OFFSET_X + c * TILE_S + TILE_S / 2;
        t.y = this.OFFSET_Y + r * TILE_S + TILE_S / 2;
      }
    }
  }

  // ===================================================
  // TILE
  // ===================================================
  spawnTile(r, c, fromTop = false) {
    const type = Phaser.Utils.Array.GetRandom(TYPES);

    const x = this.OFFSET_X + c * TILE_S + TILE_S / 2;
    const y = fromTop
      ? this.OFFSET_Y - TILE_S
      : this.OFFSET_Y + r * TILE_S + TILE_S / 2;

    const container = this.add.container(x, y);
    container.type = type;
    container.gridR = r;
    container.gridC = c;

    // ---- glow ----
    const glow = this.add.graphics();
    glow.fillStyle(GLOW_COLORS[type], 0.35);
    glow.fillRoundedRect(
      -VISUAL_S / 2 - 3,
      -VISUAL_S / 2 - 3,
      VISUAL_S + 6,
      VISUAL_S + 6,
      14
    );

    // ---- bg ----
    const bg = this.add.graphics();
    bg.fillStyle(BG_COLORS[type], 1);
    bg.fillRoundedRect(
      -VISUAL_S / 2,
      -VISUAL_S / 2,
      VISUAL_S,
      VISUAL_S,
      12
    );

    // ---- icon ----
    const img = this.add.image(0, 0, `t_${type}`);
    const zoom =
      type === 'yellow' || type === 'green'
        ? 1.45
        : 1.75;

    img.setDisplaySize(VISUAL_S * zoom, VISUAL_S * zoom);

    // ---- MASK (РАБОЧАЯ) ----
    const maskG = this.make.graphics({ x: 0, y: 0 });
    maskG.fillStyle(0xffffff);
    maskG.fillRoundedRect(
      -VISUAL_S / 2,
      -VISUAL_S / 2,
      VISUAL_S,
      VISUAL_S,
      12
    );
    img.setMask(maskG.createGeometryMask());

    // ---- frame ----
    const frame = this.add.graphics();
    frame.lineStyle(5, 0x2b2b2b, 1);
    frame.strokeRoundedRect(
      -VISUAL_S / 2,
      -VISUAL_S / 2,
      VISUAL_S,
      VISUAL_S,
      12
    );
    frame.lineStyle(2, 0xbc962c, 0.8);
    frame.strokeRoundedRect(
      -VISUAL_S / 2 + 4,
      -VISUAL_S / 2 + 4,
      VISUAL_S - 8,
      VISUAL_S - 8,
      10
    );

    container.add([glow, bg, img, frame, maskG]);

    // ---- hit ----
    const hit = this.add.rectangle(0, 0, TILE_S, TILE_S, 0x000000, 0)
      .setInteractive();
    hit.on('pointerdown', () => this.handlePointer(container));
    container.add(hit);

    this.grid[r][c] = container;

    if (fromTop) {
      this.tweens.add({
        targets: container,
        y: this.OFFSET_Y + r * TILE_S + TILE_S / 2,
        duration: 300
      });
    }
  }

  // ===================================================
  // INPUT
  // ===================================================
  async handlePointer(t) {
    if (this.isAnimating) return;

    if (!this.sel) {
      this.sel = t;
      return;
    }

    const d =
      Math.abs(this.sel.gridR - t.gridR) +
      Math.abs(this.sel.gridC - t.gridC);

    if (d === 1) {
      await this.swap(this.sel, t);
      await this.check();
    }

    this.sel = null;
  }

  async swap(a, b) {
    this.isAnimating = true;

    const ar = a.gridR, ac = a.gridC;
    const br = b.gridR, bc = b.gridC;

    this.grid[ar][ac] = b;
    this.grid[br][bc] = a;
    a.gridR = br; a.gridC = bc;
    b.gridR = ar; b.gridC = ac;

    return new Promise(res => {
      this.tweens.add({
        targets: a,
        x: this.OFFSET_X + bc * TILE_S + TILE_S / 2,
        y: this.OFFSET_Y + br * TILE_S + TILE_S / 2,
        duration: 200
      });
      this.tweens.add({
        targets: b,
        x: this.OFFSET_X + ac * TILE_S + TILE_S / 2,
        y: this.OFFSET_Y + ar * TILE_S + TILE_S / 2,
        duration: 200,
        onComplete: () => {
          this.isAnimating = false;
          res();
        }
      });
    });
  }

  // ===================================================
  // MATCH
  // ===================================================
  findMatches() {
    const out = [];

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID - 2; c++) {
        const a = this.grid[r][c];
        const b = this.grid[r][c + 1];
        const d = this.grid[r][c + 2];
        if (a && b && d && a.type === b.type && a.type === d.type)
          out.push(a, b, d);
      }
    }

    for (let c = 0; c < GRID; c++) {
      for (let r = 0; r < GRID - 2; r++) {
        const a = this.grid[r][c];
        const b = this.grid[r + 1][c];
        const d = this.grid[r + 2][c];
        if (a && b && d && a.type === b.type && a.type === d.type)
          out.push(a, b, d);
      }
    }

    return [...new Set(out)];
  }

  async check() {
    const m = this.findMatches();
    if (m.length) {
      await this.explode(m);
      await this.refill();
      await this.check();
    }
  }

  async explode(list) {
    this.isAnimating = true;
    return new Promise(res => {
      this.tweens.add({
        targets: list,
        scale: 0,
        alpha: 0,
        duration: 260,
        onComplete: () => {
          list.forEach(t => {
            this.grid[t.gridR][t.gridC] = null;
            t.destroy();
          });
          this.isAnimating = false;
          res();
        }
      });
    });
  }

  async refill() {
    for (let c = 0; c < GRID; c++) {
      let empty = 0;
      for (let r = GRID - 1; r >= 0; r--) {
        if (!this.grid[r][c]) empty++;
        else if (empty) {
          const t = this.grid[r][c];
          this.grid[r + empty][c] = t;
          this.grid[r][c] = null;
          t.gridR += empty;
          this.tweens.add({
            targets: t,
            y: this.OFFSET_Y + t.gridR * TILE_S + TILE_S / 2,
            duration: 260
          });
        }
      }
      for (let i = 0; i < empty; i++) {
        this.spawnTile(i, c, true);
      }
    }
    await new Promise(r => this.time.delayedCall(300, r));
  }
}


