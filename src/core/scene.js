export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // руны
    this.load.image('rune_red', 'assets/rune_red.png');
    this.load.image('rune_blue', 'assets/rune_blue.png');
    this.load.image('rune_green', 'assets/rune_green.png');
    this.load.image('rune_purple', 'assets/rune_purple.png');
    this.load.image('rune_yellow', 'assets/rune_yellow.png');

    // рамка
    this.load.image('tile_frame', 'assets/tile_frame.png');
  }

  create() {
    this.cols = 8;
    this.rows = 8;
    this.tileSize = 96;

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];
    this.grid = [];
    this.selected = null;

    this.offsetX = (this.scale.width - this.cols * this.tileSize) / 2;
    this.offsetY = (this.scale.height - this.rows * this.tileSize) / 2;

    // фон
    this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x0f0f14
    );

    this.createGrid();
    console.log('Grid created');
  }

  /* ================= GRID ================= */

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

    const cx = this.offsetX + x * this.tileSize + this.tileSize / 2;
    const cy = this.offsetY + y * this.tileSize + this.tileSize / 2;

    // контейнер
    const container = this.add.container(cx, cy);

    // рамка
    const frame = this.add.image(0, 0, 'tile_frame');
    frame.setDisplaySize(this.tileSize, this.tileSize);

    // иконка
    const icon = this.add.image(0, 0, `rune_${type}`);
    icon.setDisplaySize(this.tileSize * 0.65, this.tileSize * 0.65);

    container.add([frame, icon]);

    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive();

    const cell = {
      x,
      y,
      type,
      container,
      frame,
      icon
    };

    container.on('pointerdown', () => this.handleClick(cell));

    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scale: 1.1,
        duration: 120
      });
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 120
      });
    });

    return cell;
  }

  /* ================= INPUT ================= */

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
    cell.frame.setTint(0x00ff00);
  }

  clearSelection() {
    if (this.selected) {
      this.selected.frame.clearTint();
      this.selected = null;
    }
  }

  areNeighbors(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  /* ================= SWAP ================= */

  swap(a, b) {
    const ax = a.container.x;
    const ay = a.container.y;
    const bx = b.container.x;
    const by = b.container.y;

    this.grid[a.y][a.x] = b;
    this.grid[b.y][b.x] = a;

    [a.x, b.x] = [b.x, a.x];
    [a.y, b.y] = [b.y, a.y];

    this.tweens.add({ targets: a.container, x: bx, y: by, duration: 200 });
    this.tweens.add({ targets: b.container, x: ax, y: ay, duration: 200 });
  }
}
