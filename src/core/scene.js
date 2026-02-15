// ================================
// SCENE: MATCH-3 CORE
// FILE: src/core/scene.js
// ================================

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // ================================
  // PRELOAD: LOAD ALL ASSETS
  // ================================
  preload() {
    console.log('PRELOAD START');

    this.load.image('bg', './assets/bg.jpg');

    this.load.image('red', './assets/rune_red.png');
    this.load.image('blue', './assets/rune_blue.png');
    this.load.image('green', './assets/rune_green.png');
    this.load.image('purple', './assets/rune_purple.png');
    this.load.image('yellow', './assets/rune_yellow.png');

    this.load.on('complete', () => {
      console.log('ALL ASSETS LOADED');
    });
  }

  // ================================
  // CREATE: INIT SCENE
  // ================================
  create() {
    console.log('SCENE CREATE');

    // ---- GRID CONFIG ----
    this.cols = 8;
    this.rows = 8;
    this.tileSize = 96;

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];

    this.grid = [];
    this.selected = null;

    // ---- CENTER CALC ----
    const gw = this.cols * this.tileSize;
    const gh = this.rows * this.tileSize;

    this.offsetX = (this.scale.width - gw) / 2;
    this.offsetY = (this.scale.height - gh) / 2;

    // ---- BACKGROUND ----
    this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      'bg'
    ).setDepth(-10);

    // ---- CREATE GRID ----
    this.createGrid();

    console.log('GRID CREATED');
  }

  // ================================
  // GRID CREATION
  // ================================
  createGrid() {
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        const cell = this.createCell(x, y);
        this.grid[y][x] = cell;
      }
    }
  }

  createCell(x, y) {
    const type = Phaser.Utils.Array.GetRandom(this.types);

    const px = this.offsetX + x * this.tileSize + this.tileSize / 2;
    const py = this.offsetY + y * this.tileSize + this.tileSize / 2;

    // ---- TILE IMAGE ----
    const tile = this.add.image(px, py, type);
    tile.setDisplaySize(this.tileSize - 12, this.tileSize - 12);
    tile.setInteractive({ useHandCursor: true });

    const cell = { x, y, type, tile };

    tile.on('pointerdown', () => this.handleClick(cell));

    return cell;
  }

  // ================================
  // INPUT HANDLING
  // ================================
  handleClick(cell) {
    if (!this.selected) {
      this.select(cell);
      return;
    }

    if (this.selected === cell) {
      this.clearSelection();
      return;
    }

    if (this.areNeighbors(this.selected, cell)) {
      this.swap(this.selected, cell);
      this.clearSelection();
    } else {
      this.clearSelection();
      this.select(cell);
    }
  }

  select(cell) {
    this.selected = cell;
    cell.tile.setScale(1.1);
  }

  clearSelection() {
    if (this.selected) {
      this.selected.tile.setScale(1);
      this.selected = null;
    }
  }

  // ================================
  // LOGIC
  // ================================
  areNeighbors(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  swap(a, b) {
    const ax = a.tile.x;
    const ay = a.tile.y;
    const bx = b.tile.x;
    const by = b.tile.y;

    this.grid[a.y][a.x] = b;
    this.grid[b.y][b.x] = a;

    [a.x, b.x] = [b.x, a.x];
    [a.y, b.y] = [b.y, a.y];

    this.tweens.add({
      targets: a.tile,
      x: bx,
      y: by,
      duration: 200
    });

    this.tweens.add({
      targets: b.tile,
      x: ax,
      y: ay,
      duration: 200
    });
  }
}
