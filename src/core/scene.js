// ===================================================
// TAVERNA WAR — MATCH-3 CORE SCENE
// FILE: src/core/scene.js
// ===================================================

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // ===================================================
  // PRELOAD — ЗАГРУЗКА РЕСУРСОВ
  // ===================================================
  preload() {
    this.load.image('bg', './assets/bg.jpg');

    this.load.image('red', './assets/rune_red.png');
    this.load.image('blue', './assets/rune_blue.png');
    this.load.image('green', './assets/rune_green.png');
    this.load.image('purple', './assets/rune_purple.png');
    this.load.image('yellow', './assets/rune_yellow.png');
  }

  // ===================================================
  // CREATE — ИНИЦИАЛИЗАЦИЯ СЦЕНЫ
  // ===================================================
  create() {
    // ---------- CONFIG ----------
    this.cols = 8;
    this.rows = 8;
    this.tileSize = 96;
    this.innerSize = 76;

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];
    this.grid = [];
    this.selected = null;

    // ---------- BACKGROUND FULLSCREEN ----------
    this.bg = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      'bg'
    );
    this.bg.setDisplaySize(this.scale.width, this.scale.height);
    this.bg.setDepth(-10);

    // ---------- CENTER GRID ----------
    this.gridWidth = this.cols * this.tileSize;
    this.gridHeight = this.rows * this.tileSize;

    this.offsetX = (this.scale.width - this.gridWidth) / 2;
    this.offsetY = (this.scale.height - this.gridHeight) / 2;

    // ---------- CREATE GRID ----------
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x] = this.createTile(x, y);
      }
    }
  }

  // ===================================================
  // TILE CREATION — ПЛИТКА С МАСКОЙ И РАМКОЙ
  // ===================================================
  createTile(x, y) {
    const type = Phaser.Utils.Array.GetRandom(this.types);

    const px = this.offsetX + x * this.tileSize + this.tileSize / 2;
    const py = this.offsetY + y * this.tileSize + this.tileSize / 2;

    // ---------- CONTAINER ----------
    const container = this.add.container(px, py);

    // ---------- MASK (CUT WHITE BG) ----------
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(
      -this.innerSize / 2,
      -this.innerSize / 2,
      this.innerSize,
      this.innerSize
    );
    const mask = maskShape.createGeometryMask();

    // ---------- TILE IMAGE ----------
    const img = this.add.image(0, 0, type);
    img.setDisplaySize(this.innerSize * 1.25, this.innerSize * 1.25);
    img.setMask(mask);

    // ---------- FRAME (SPIKES STYLE) ----------
    const frame = this.add.graphics();
    frame.lineStyle(4, 0x1a1a1a);
    frame.strokeRect(
      -this.tileSize / 2 + 6,
      -this.tileSize / 2 + 6,
      this.tileSize - 12,
      this.tileSize - 12
    );

    frame.lineStyle(2, 0xffcc00);
    frame.strokeRect(
      -this.tileSize / 2 + 10,
      -this.tileSize / 2 + 10,
      this.tileSize - 20,
      this.tileSize - 20
    );

    container.add([img, frame]);
    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive();

    const cell = { x, y, type, container, img };

    container.on('pointerdown', () => this.onTileClick(cell));

    return cell;
  }

  // ===================================================
  // INPUT — КЛИКИ ПО ПЛИТКАМ
  // ===================================================
  onTileClick(cell) {
    if (!this.selected) {
      this.select(cell);
      return;
    }

    if (this.selected === cell) {
      this.deselect();
      return;
    }

    if (this.isNeighbor(this.selected, cell)) {
      this.swap(this.selected, cell);
      this.deselect();
      this.time.delayedCall(250, () => this.resolveMatches());
    } else {
      this.deselect();
      this.select(cell);
    }
  }

  select(cell) {
    this.selected = cell;
    cell.container.setScale(1.1);
  }

  deselect() {
    if (this.selected) {
      this.selected.container.setScale(1);
      this.selected = null;
    }
  }

  isNeighbor(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  // ===================================================
  // SWAP — ОБМЕН ПЛИТОК
  // ===================================================
  swap(a, b) {
    [this.grid[a.y][a.x], this.grid[b.y][b.x]] = [b, a];
    [a.x, b.x] = [b.x, a.x];
    [a.y, b.y] = [b.y, a.y];

    const ax = this.offsetX + a.x * this.tileSize + this.tileSize / 2;
    const ay = this.offsetY + a.y * this.tileSize + this.tileSize / 2;
    const bx = this.offsetX + b.x * this.tileSize + this.tileSize / 2;
    const by = this.offsetY + b.y * this.tileSize + this.tileSize / 2;

    this.tweens.add({ targets: a.container, x: ax, y: ay, duration: 200 });
    this.tweens.add({ targets: b.container, x: bx, y: by, duration: 200 });
  }

  // ===================================================
  // MATCH LOGIC — ПОИСК И УДАЛЕНИЕ
  // ===================================================
  resolveMatches() {
    const matches = [];

    // horizontal
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols - 2; x++) {
        const a = this.grid[y][x];
        const b = this.grid[y][x + 1];
        const c = this.grid[y][x + 2];
        if (a.type === b.type && b.type === c.type) {
          matches.push(a, b, c);
        }
      }
    }

    if (matches.length === 0) return;

    matches.forEach(cell => {
      this.tweens.add({
        targets: cell.container,
        scale: 0,
        alpha: 0,
        duration: 250,
        onComplete: () => cell.container.destroy()
      });
    });
  }
}
