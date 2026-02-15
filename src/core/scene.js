// ===================================================
// SCENE: Match-3 board (CENTERED, STABLE, VISUAL SAFE)
// ===================================================

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // ===================================================
  // PRELOAD
  // ===================================================
  preload() {
    this.load.image('bg', 'assets/bg.jpg');

    this.load.image('rune_red', 'assets/rune_red.png');
    this.load.image('rune_blue', 'assets/rune_blue.png');
    this.load.image('rune_green', 'assets/rune_green.png');
    this.load.image('rune_purple', 'assets/rune_purple.png');
    this.load.image('rune_yellow', 'assets/rune_yellow.png');
  }

  // ===================================================
  // CREATE
  // ===================================================
  create() {
    console.log('SCENE VERSION: CLEAN CENTERED BOARD');

    // ---------- CONFIG ----------
    this.cols = 8;
    this.rows = 8;
    this.tileSize = 72;
    this.tilePadding = 6;

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];

    this.textures = {
      red: 'rune_red',
      blue: 'rune_blue',
      green: 'rune_green',
      purple: 'rune_purple',
      yellow: 'rune_yellow'
    };

    this.grid = [];
    this.selected = null;

    // ---------- BACKGROUND ----------
    this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      'bg'
    ).setDisplaySize(this.scale.width, this.scale.height);

    // ---------- BOARD OFFSET (CENTERED) ----------
    const boardWidth = this.cols * this.tileSize;
    const boardHeight = this.rows * this.tileSize;

    this.offsetX = (this.scale.width - boardWidth) / 2;
    this.offsetY = (this.scale.height - boardHeight) / 2;

    // ---------- BOARD CONTAINER ----------
    this.board = this.add.container(this.offsetX, this.offsetY);

    // ---------- CREATE GRID ----------
    this.createGrid();

    console.log('Grid created');
  }

  // ===================================================
  // GRID CREATION
  // ===================================================
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

    const tile = this.add.image(
      x * this.tileSize + this.tileSize / 2,
      y * this.tileSize + this.tileSize / 2,
      this.textures[type]
    );

    tile.setDisplaySize(
      this.tileSize - this.tilePadding,
      this.tileSize - this.tilePadding
    );

    tile.setInteractive({ useHandCursor: true });

    this.board.add(tile);

    const cell = { x, y, type, tile };

    tile.on('pointerdown', () => this.onTileClick(cell));

    return cell;
  }

  // ===================================================
  // INPUT
  // ===================================================
  onTileClick(cell) {
    if (!this.selected) {
      this.select(cell);
      return;
    }

    if (this.selected === cell) {
      this.clearSelection();
      return;
    }

    if (this.isNeighbor(this.selected, cell)) {
      this.swap(this.selected, cell);
      this.clearSelection();
    } else {
      this.clearSelection();
      this.select(cell);
    }
  }

  select(cell) {
    this.selected = cell;
    cell.tile.setTint(0xffff66);
  }

  clearSelection() {
    if (this.selected) {
      this.selected.tile.clearTint();
      this.selected = null;
    }
  }

  // ===================================================
  // LOGIC
  // ===================================================
  isNeighbor(a, b) {
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

    this.tweens.add({ targets: a.tile, x: bx, y: by, duration: 150 });
    this.tweens.add({ targets: b.tile, x: ax, y: ay, duration: 150 });
  }
}
