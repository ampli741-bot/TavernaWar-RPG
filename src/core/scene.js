export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // фон + рамка
    this.load.image('tile_bg', 'assets/tile_bg.png');
    this.load.image('tile_frame', 'assets/tile_frame.png');

    // руны
    this.load.image('rune_red', 'assets/rune_red.png');
    this.load.image('rune_blue', 'assets/rune_blue.png');
    this.load.image('rune_green', 'assets/rune_green.png');
    this.load.image('rune_purple', 'assets/rune_purple.png');
    this.load.image('rune_yellow', 'assets/rune_yellow.png');
  }

  create() {
    this.cols = 8;
    this.rows = 8;
    this.tileSize = 80;

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];

    this.grid = [];
    this.selected = null;

    this.offsetX =
      (this.sys.game.config.width - this.cols * this.tileSize) / 2;
    this.offsetY =
      (this.sys.game.config.height - this.rows * this.tileSize) / 2;

    // фон сцены
    this.add.rectangle(
      this.sys.game.config.width / 2,
      this.sys.game.config.height / 2,
      this.sys.game.config.width,
      this.sys.game.config.height,
      0x1e1e1e
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

    // КОНТЕЙНЕР
    const container = this.add.container(cx, cy);

    const bg = this.add.image(0, 0, 'tile_bg').setScale(0.95);
    const icon = this.add.image(0, 0, `rune_${type}`).setScale(0.6);
    const frame = this.add.image(0, 0, 'tile_frame').setScale(1);

    container.add([bg, icon, frame]);

    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive(
      new Phaser.Geom.Rectangle(
        -this.tileSize / 2,
        -this.tileSize / 2,
        this.tileSize,
        this.tileSize
      ),
      Phaser.Geom.Rectangle.Contains
    );

    const cell = { x, y, type, tile: container, icon };

    container.on('pointerdown', () => this.handleClick(cell));
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
      this.resolveBoard();
    } else {
      this.clearSelection();
      this.select(cell);
    }
  }

  select(cell) {
    this.selected = cell;

    this.tweens.add({
      targets: cell.icon,
      scale: 0.7,
      duration: 100,
      yoyo: true
    });
  }

  clearSelection() {
    this.selected = null;
  }

  areNeighbors(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  /* ================= SWAP ================= */

  swap(a, b) {
    const ax = a.tile.x;
    const ay = a.tile.y;
    const bx = b.tile.x;
    const by = b.tile.y;

    this.grid[a.y][a.x] = b;
    this.grid[b.y][b.x] = a;

    [a.x, b.x] = [b.x, a.x];
    [a.y, b.y] = [b.y, a.y];

    this.tweens.add({ targets: a.tile, x: bx, y: by, duration: 200 });
    this.tweens.add({ targets: b.tile, x: ax, y: ay, duration: 200 });
  }

  /* ================= MATCH ================= */

  resolveBoard() {
    const matches = this.findMatches();
    if (!matches.length) return;

    this.removeMatches(matches);

    this.time.delayedCall(250, () => {
      this.applyGravity();
      this.time.delayedCall(250, () => {
        this.fillEmpty();
        this.time.delayedCall(250, () => this.resolveBoard());
      });
    });
  }

  findMatches() {
    const matches = [];

    for (let y = 0; y < this.rows; y++) {
      let run = [this.grid[y][0]];
      for (let x = 1; x < this.cols; x++) {
        const cell = this.grid[y][x];
        if (cell.type === run[0].type) run.push(cell);
        else {
          if (run.length >= 3) matches.push(...run);
          run = [cell];
        }
      }
      if (run.length >= 3) matches.push(...run);
    }

    for (let x = 0; x < this.cols; x++) {
      let run = [this.grid[0][x]];
      for (let y = 1; y < this.rows; y++) {
        const cell = this.grid[y][x];
        if (cell.type === run[0].type) run.push(cell);
        else {
          if (run.length >= 3) matches.push(...run);
          run = [cell];
        }
      }
      if (run.length >= 3) matches.push(...run);
    }

    return [...new Set(matches)];
  }

  removeMatches(matches) {
    matches.forEach(cell => {
      this.tweens.add({
        targets: cell.tile,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => cell.tile.destroy()
      });
      this.grid[cell.y][cell.x] = null;
    });
  }

  applyGravity() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = this.rows - 1; y >= 0; y--) {
        if (!this.grid[y][x]) {
          for (let yy = y - 1; yy >= 0; yy--) {
            if (this.grid[yy][x]) {
              const cell = this.grid[yy][x];
              this.grid[y][x] = cell;
              this.grid[yy][x] = null;
              cell.y = y;

              this.tweens.add({
                targets: cell.tile,
                y: this.offsetY + y * this.tileSize + this.tileSize / 2,
                duration: 200
              });
              break;
            }
          }
        }
      }
    }
  }

  fillEmpty() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (!this.grid[y][x]) {
          const cell = this.createCell(x, y);
          cell.tile.y = this.offsetY - this.tileSize;

          this.tweens.add({
            targets: cell.tile,
            y: this.offsetY + y * this.tileSize + this.tileSize / 2,
            duration: 300
          });

          this.grid[y][x] = cell;
        }
      }
    }
  }
}
