// =====================================================
// CONFIG
// =====================================================
export const TILE_S = 85;          // шаг сетки
export const TILE_P = 4;           // padding
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
    TYPES.forEach(t => {
      this.load.image(`t_${t}`, `assets/rune_${t}.png`);
    });
  }

  // ===================================================
  // CREATE
  // ===================================================
  create() {
    console.log('SCENE LOADED: STABLE MATCH-3');

    this.grid = [];

    for (let r = 0; r < GRID; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID; c++) {
        this.spawnTile(r, c);
      }
    }
  }

  // ===================================================
  // TILE VISUAL
  // ===================================================
  spawnTile(r, c, fromTop = false) {
    const type = Phaser.Utils.Array.GetRandom(TYPES);

    const x = c * TILE_S + TILE_S / 2;
    const y = fromTop ? -TILE_S : r * TILE_S + TILE_S / 2;

    const container = this.add.container(x, y);
    container.type = type;
    container.gridR = r;
    container.gridC = c;

    // --- glow ---
    const glow = this.add.graphics();
    glow.fillStyle(GLOW_COLORS[type], 0.35);
    glow.fillRoundedRect(
      -VISUAL_S / 2 - 3,
      -VISUAL_S / 2 - 3,
      VISUAL_S + 6,
      VISUAL_S + 6,
      16
    );

    // --- bg ---
    const bg = this.add.graphics();
    bg.fillStyle(BG_COLORS[type], 1);
    bg.fillRoundedRect(
      -VISUAL_S / 2,
      -VISUAL_S / 2,
      VISUAL_S,
      VISUAL_S,
      14
    );

    // --- rune image ---
    const img = this.add.image(0, 0, `t_${type}`);
    img.setDisplaySize(VISUAL_S * 2.2, VISUAL_S * 2.2);

    // --- mask (HIDES WHITE) ---
    const maskG = this.make.graphics();
    maskG.fillStyle(0xffffff);
    maskG.fillRoundedRect(
      x - VISUAL_S / 2,
      y - VISUAL_S / 2,
      VISUAL_S,
      VISUAL_S,
      14
    );
    img.setMask(maskG.createGeometryMask());

    // --- frame (spikes feel) ---
    const frame = this.add.graphics();
    frame.lineStyle(6, 0x2b2b2b, 1);
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

    // --- hover ---
    const hover = this.add.graphics();
    hover.alpha = 0;
    hover.lineStyle(4, 0xffffff, 0.8);
    hover.strokeRoundedRect(
      -VISUAL_S / 2 - 4,
      -VISUAL_S / 2 - 4,
      VISUAL_S + 8,
      VISUAL_S + 8,
      16
    );

    // --- ghost (selection) ---
    const ghost = this.add.graphics();
    ghost.alpha = 0;
    ghost.lineStyle(6, 0xffffff, 0.6);
    ghost.strokeRoundedRect(
      -VISUAL_S / 2 - 2,
      -VISUAL_S / 2 - 2,
      VISUAL_S + 4,
      VISUAL_S + 4,
      14
    );

    container.add([glow, bg, img, frame, hover, ghost]);
    container.maskShape = maskG;
    container.hover = hover;
    container.ghost = ghost;

    // --- hit area ---
    const hit = this.add.rectangle(0, 0, TILE_S, TILE_S, 0x000000, 0)
      .setInteractive();
    hit.container = container;
    container.add(hit);

    hit.on('pointerdown', () => this.handlePointer(container));
    hit.on('pointerover', () => this.setHover(container, true));
    hit.on('pointerout', () => this.setHover(container, false));

    // idle breathing
    this.tweens.add({
      targets: container,
      scale: 1.04,
      duration: 900 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.grid[r][c] = container;

    if (fromTop) {
      this.tweens.add({
        targets: container,
        y: r * TILE_S + TILE_S / 2,
        duration: 300
      });
    }
  }

  // ===================================================
  // INPUT
  // ===================================================
  setHover(t, v) {
    this.tweens.add({
      targets: t.hover,
      alpha: v ? 0.6 : 0,
      duration: 150
    });
  }

  async handlePointer(t) {
    if (this.isAnimating) return;

    if (!this.sel) {
      this.sel = t;
      t.ghost.alpha = 1;
      return;
    }

    if (this.sel === t) {
      t.ghost.alpha = 0;
      this.sel = null;
      return;
    }

    const d =
      Math.abs(this.sel.gridR - t.gridR) +
      Math.abs(this.sel.gridC - t.gridC);

    if (d === 1) {
      await this.swap(this.sel, t);
      await this.check();
    }

    this.sel.ghost.alpha = 0;
    this.sel = null;
  }

  // ===================================================
  // MATCH LOGIC
  // ===================================================
  async swap(a, b) {
    this.isAnimating = true;

    const ar = a.gridR, ac = a.gridC;
    const br = b.gridR, bc = b.gridC;

    this.grid[ar][ac] = b;
    this.grid[br][bc] = a;

    a.gridR = br; a.gridC = bc;
    b.gridR = ar; b.gridC = ac;

    return new Promise(res => {
      this.tweens.add({ targets: a, x: bc * TILE_S + TILE_S / 2, y: br * TILE_S + TILE_S / 2, duration: 200 });
      this.tweens.add({
        targets: b,
        x: ac * TILE_S + TILE_S / 2,
        y: ar * TILE_S + TILE_S / 2,
        duration: 200,
        onComplete: () => { this.isAnimating = false; res(); }
      });
    });
  }

  findMatches() {
    const out = [];

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID - 2; c++) {
        const a = this.grid[r][c];
        const b = this.grid[r][c + 1];
        const d = this.grid[r][c + 2];
        if (a && b && d && a.type === b.type && a.type === d.type) {
          out.push(a, b, d);
        }
      }
    }

    for (let c = 0; c < GRID; c++) {
      for (let r = 0; r < GRID - 2; r++) {
        const a = this.grid[r][c];
        const b = this.grid[r + 1][c];
        const d = this.grid[r + 2][c];
        if (a && b && d && a.type === b.type && a.type === d.type) {
          out.push(a, b, d);
        }
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

  // ===================================================
  // EXPLOSION
  // ===================================================
  async explode(list) {
    this.isAnimating = true;

    return new Promise(res => {
      this.tweens.add({
        targets: list,
        scale: 0,
        alpha: 0,
        duration: 250,
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

  // ===================================================
  // GRAVITY / REFILL
  // ===================================================
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
            y: t.gridR * TILE_S + TILE_S / 2,
            duration: 250
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
