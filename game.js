console.log('GAME.JS REAL FIX LOADED');

// =====================
// CONFIG
// =====================
const TILE_S = 85;
const TILE_P = 4;
const VISUAL_S = TILE_S - TILE_P * 2;
const GRID = 8;

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

// =====================
// SCENE
// =====================
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.grid = [];
  }

  preload() {
    this.load.image('bg', 'assets/bg.jpg');

    TYPES.forEach(t => {
      this.load.image(`rune_${t}`, `assets/rune_${t}.png`);
    });
  }

  create() {
    const { width, height } = this.scale;

    // ---- BACKGROUND ----
    this.bg = this.add.image(width / 2, height / 2, 'bg');
    const s = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(s);

    // ---- GRID OFFSET ----
    this.OFFSET_X = (width - GRID * TILE_S) / 2;
    this.OFFSET_Y = (height - GRID * TILE_S) / 2;

    // ---- GRID ----
    for (let r = 0; r < GRID; r++) {
      this.grid[r] = [];
      for (let c = 0; c < GRID; c++) {
        this.spawnTile(r, c);
      }
    }
  }

  spawnTile(r, c) {
    const type = Phaser.Utils.Array.GetRandom(TYPES);

    const x = this.OFFSET_X + c * TILE_S + TILE_S / 2;
    const y = this.OFFSET_Y + r * TILE_S + TILE_S / 2;

    const cont = this.add.container(x, y);

    // ---- glow ----
    const glow = this.add.graphics();
    glow.fillStyle(GLOW_COLORS[type], 0.3);
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
    const img = this.add.image(0, 0, `rune_${type}`);
    const zoom = (type === 'yellow' || type === 'green') ? 1.45 : 1.75;
    img.setDisplaySize(VISUAL_S * zoom, VISUAL_S * zoom);

    // ---- MASK (КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ) ----
    const maskG = this.make.graphics({ add: false });
    maskG.fillStyle(0xffffff);
    maskG.fillRoundedRect(
      -VISUAL_S / 2,
      -VISUAL_S / 2,
      VISUAL_S,
      VISUAL_S,
      12
    );
    maskG.setPosition(0, 0);

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

    cont.add([glow, bg, img, frame]);
  }
}

// =====================
// GAME
// =====================
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: GameScene
});
