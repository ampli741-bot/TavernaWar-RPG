console.log('MATCH-3 GAME LOADED');

// ================= CONFIG =================
const GRID = 8;
const TILE_SIZE = 85;
const PADDING = 6;
const VISUAL = TILE_SIZE - PADDING * 2;

const TYPES = ['red', 'blue', 'green', 'purple', 'yellow'];

const BG_COLORS = {
  red: 0x3d0a0a,
  blue: 0x0a1a2f,
  green: 0x0a240a,
  purple: 0x220a35,
  yellow: 0x2d2405
};

// ================= SCENE =================
class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
    this.grid = [];
    this.selected = null;
    this.busy = false;
  }

  preload() {
    this.load.image('bg', 'assets/bg.jpg');
    TYPES.forEach(t => {
      this.load.image(t, `assets/rune_${t}.png`);
    });
  }

  create() {
    const { width, height } = this.scale;

    // BACKGROUND
    this.bg = this.add.image(width / 2, height / 2, 'bg');
    const scale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(scale);

    this.offsetX = (width - GRID * TILE_SIZE) / 2;
    this.offsetY = (height - GRID * TILE_SIZE) / 2;

    // GRID
    for (let r = 0; r < GRID; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID; c++) {
        this.spawnTile(r, c);
      }
    }
  }

  spawnTile(r, c, fromTop = false) {
    const type = Phaser.Utils.Array.GetRandom(TYPES);

    const x = this.offsetX + c * TILE_SIZE + TILE_SIZE / 2;
    const y = fromTop
      ? this.offsetY - TILE_SIZE
      : this.offsetY + r * TILE_SIZE + TILE_SIZE / 2;

    const cont = this.add.container(x, y);
    cont.type = type;
    cont.r = r;
    cont.c = c;

    // BG
    const bg = this.add.graphics();
    bg.fillStyle(BG_COLORS[type], 1);
    bg.fillRoundedRect(-VISUAL/2, -VISUAL/2, VISUAL, VISUAL, 12);

    // ICON
    const img = this.add.image(0, 0, type);
    img.setDisplaySize(VISUAL * 1.6, VISUAL * 1.6);

    // MASK
    const maskG = this.make.graphics();
    maskG.fillStyle(0xffffff);
    maskG.fillRoundedRect(-VISUAL/2, -VISUAL/2, VISUAL, VISUAL, 12);
    img.setMask(maskG.createGeometryMask());

    // FRAME
    const frame = this.add.graphics();
    frame.lineStyle(4, 0xbc962c, 1);
    frame.strokeRoundedRect(-VISUAL/2, -VISUAL/2, VISUAL, VISUAL, 12);

    cont.add([bg, img, frame]);

    // INPUT
    const hit = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0, 0)
      .setInteractive();
    hit.on('pointerdown', () => this.click(cont));
    cont.add(hit);

    this.grid[r][c] = cont;

    if (fromTop) {
      this.tweens.add({
        targets: cont,
        y: this.offsetY + r * TILE_SIZE + TILE_SIZE / 2,
        duration: 300
      });
    }
  }

  async click(tile) {
    if (this.busy) return;

    if (!this.selected) {
      this.selected = tile;
      tile.scale = 1.1;
      return;
    }

    const a = this.selected;
    a.scale = 1;
    this.selected = null;

    const dist = Math.abs(a.r - tile.r) + Math.abs(a.c - tile.c);
    if (dist !== 1) return;

    await this.swap(a, tile);
    if (!(await this.resolve())) {
      await this.swap(a, tile);
    }
  }

  swap(a, b) {
    this.busy = true;

    const ar = a.r, ac = a.c;
    const br = b.r, bc = b.c;

    this.grid[ar][ac] = b;
    this.grid[br][bc] = a;
    a.r = br; a.c = bc;
    b.r = ar; b.c = ac;

    return new Promise(res => {
      this.tweens.add({
        targets: a,
        x: this.offsetX + bc * TILE_SIZE + TILE_SIZE / 2,
        y: this.offsetY + br * TILE_SIZE + TILE_SIZE / 2,
        duration: 200
      });
      this.tweens.add({
        targets: b,
        x: this.offsetX + ac * TILE_SIZE + TILE_SIZE / 2,
        y: this.offsetY + ar * TILE_SIZE + TILE_SIZE / 2,
        duration: 200,
        onComplete: () => {
          this.busy = false;
          res();
        }
      });
    });
  }

  findMatches() {
    const out = new Set();

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID - 2; c++) {
        const a = this.grid[r][c];
        const b = this.grid[r][c+1];
        const d = this.grid[r][c+2];
        if (a && b && d && a.type === b.type && a.type === d.type) {
          out.add(a); out.add(b); out.add(d);
        }
      }
    }

    for (let c = 0; c < GRID; c++) {
      for (let r = 0; r < GRID - 2; r++) {
        const a = this.grid[r][c];
        const b = this.grid[r+1][c];
        const d = this.grid[r+2][c];
        if (a && b && d && a.type === b.type && a.type === d.type) {
          out.add(a); out.add(b); out.add(d);
        }
      }
    }

    return [...out];
  }

  async resolve() {
    const matches = this.findMatches();
    if (!matches.length) return false;

    await this.explode(matches);
    await this.fall();
    await this.resolve();
    return true;
  }

  explode(list) {
    return new Promise(res => {
      this.tweens.add({
        targets: list,
        scale: 0,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          list.forEach(t => {
            this.grid[t.r][t.c] = null;
            t.destroy();
          });
          res();
        }
      });
    });
  }

  async fall() {
    for (let c = 0; c < GRID; c++) {
      let empty = 0;
      for (let r = GRID - 1; r >= 0; r--) {
        const t = this.grid[r][c];
        if (!t) empty++;
        else if (empty) {
          this.grid[r+empty][c] = t;
          this.grid[r][c] = null;
          t.r += empty;
          this.tweens.add({
            targets: t,
            y: this.offsetY + t.r * TILE_SIZE + TILE_SIZE / 2,
            duration: 250
          });
        }
      }
      for (let i = 0; i < empty; i++) {
        this.spawnTile(i, c, true);
      }
    }
    await new Promise(r => setTimeout(r, 300));
  }
}

// ================= GAME =================
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: GameScene
});
