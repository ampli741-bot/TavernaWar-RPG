export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  /* =========================================================
     BLOCK 1. BASIC CONFIG
     ========================================================= */
  create() {
    console.log('SCENE VERSION: STABLE CONTAINER GRID');

    this.cols = 8;
    this.rows = 8;
    this.tileSize = 96;

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];

    this.grid = [];
    this.selected = null;

    // центрирование поля
    const gw = this.cols * this.tileSize;
    const gh = this.rows * this.tileSize;

    this.offsetX = (this.sys.game.config.width - gw) / 2;
    this.offsetY = (this.sys.game.config.height - gh) / 2;

    /* =========================================================
       BLOCK 2. BACKGROUND
       ========================================================= */
    const bg = this.add.image(
      this.sys.game.config.width / 2,
      this.sys.game.config.height / 2,
      'bg'
    );
    bg.setDepth(-10);

    /* =========================================================
       BLOCK 3. GRID CREATE
       ========================================================= */
    this.createGrid();

    console.log('Grid created');
  }

  /* =========================================================
     BLOCK 4. GRID
     ========================================================= */
  createGrid() {
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        const cell = this.createCell(x, y);
        this.grid[y][x] = cell;
      }
    }
  }

  /* =========================================================
     BLOCK 5. CELL (!!! KEY BLOCK !!!)
     ========================================================= */
  createCell(x, y) {
    const type = Phaser.Utils.Array.GetRandom(this.types);

    const px = this.offsetX + x * this.tileSize;
    const py = this.offsetY + y * this.tileSize;

    // КОНТЕЙНЕР = ОДНА ПЛИТКА
    const container = this.add.container(px, py);

    // --- рамка / фон плитки
    const frame = this.add.image(0, 0, 'tile_frame');
    frame.setOrigin(0);
    frame.setDisplaySize(this.tileSize, this.tileSize);

    // --- иконка
    const icon = this.add.image(
      this.tileSize / 2,
      this.tileSize / 2,
      `rune_${type}`
    );
    icon.setScale(0.7);

    container.add([frame, icon]);

    // !!! КРИТИЧЕСКИ ВАЖНО !!!
    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.tileSize, this.tileSize),
      Phaser.Geom.Rectangle.Contains
    );

    const cell = {
      x,
      y,
      type,
      container,
      frame,
      icon
    };

    container.on('pointerdown', () => this.handleClick(cell));

    return cell;
  }

  /* =========================================================
     BLOCK 6. INPUT
     ========================================================= */
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
    cell.frame.setTint(0xffff66);
  }

  clearSelection() {
    if (!this.selected) return;
    this.selected.frame.clearTint();
    this.selected = null;
  }

  areNeighbors(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  /* =========================================================
     BLOCK 7. SWAP
     ========================================================= */
  swap(a, b) {
    const ax = a.container.x;
    const ay = a.container.y;
    const bx = b.container.x;
    const by = b.container.y;

    this.grid[a.y][a.x] = b;
    this.grid[b.y][b.x] = a;

    [a.x, b.x] = [b.x, a.x];
    [a.y, b.y] = [b.y, a.y];

    this.tweens.add({
      targets: a.container,
      x: bx,
      y: by,
      duration: 200
    });

    this.tweens.add({
      targets: b.container,
      x: ax,
      y: ay,
      duration: 200
    });
  }
}
