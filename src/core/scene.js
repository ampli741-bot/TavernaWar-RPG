export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    console.log('SCENE VERSION: NEW CENTERED VISUAL');

    this.load.image('bg', 'assets/bg.jpg');

    this.load.image('red', 'assets/rune_red.png');
    this.load.image('blue', 'assets/rune_blue.png');
    this.load.image('green', 'assets/rune_green.png');
    this.load.image('purple', 'assets/rune_purple.png');
    this.load.image('yellow', 'assets/rune_yellow.png');

    this.load.image('frame', 'assets/tile_frame.png');
  }

  create() {
    this.cols = 8;
    this.rows = 8;

    this.tileSize = 84;          // фиксированный размер клетки
    this.iconScale = 0.78;       // чтобы убрать белые края

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];

    this.grid = [];
    this.selected = null;

    const W = this.sys.game.config.width;
    const H = this.sys.game.config.height;

    // ===== ФОН =====
    const bg = this.add.image(W / 2, H / 2, 'bg');
    bg.setDisplaySize(W, H);

    // ===== ЦЕНТРОВАНИЕ ПОЛЯ =====
    const boardWidth = this.cols * this.tileSize;
    const boardHeight = this.rows * this.tileSize;

    this.offsetX = (W - boardWidth) / 2;
    this.offsetY = (H - boardHeight) / 2;

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

    // контейнер = одна плитка
    const container = this.add.container(cx, cy);

    // рамка
    const frame = this.add.image(0, 0, 'frame');
    frame.setDisplaySize(this.tileSize, this.tileSize);

    // иконка
    const icon = this.add.image(0, 0, type);
    icon.setScale(this.iconScale);

    container.add([frame, icon]);
    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive();

    const cell = { x, y, type, container, icon, frame };

    container.on('pointerdown', () => this.handleClick(cell));

    container.on('pointerover', () => {
      frame.setTint(0x00ff88);
    });

    container.on('pointerout', () => {
      if (this.selected !== cell) frame.clearTint();
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
      this.resolveBoard();
    } else {
      this.clearSelection();
      this.select(cell);
    }
  }

  select(cell) {
    this.selected = cell;
    cell.frame.setTint(0xffcc00);
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
    this.grid[a.y][a.x] = b;
    this.grid[b.y][b.x] = a;

    [a.x, b.x] = [b.x, a.x];
    [a.y, b.y] = [b.y, a.y];

    const ax = this.offsetX + a.x * this.tileSize + this.tileSize / 2;
    const ay = this.offsetY + a.y * this.tileSize + this.tileSize / 2;
    const bx = this.offsetX + b.x * this.tileSize + this.tileSize / 2;
    const by = this.offsetY + b.y * this.tileSize + this.tileSize / 2;

    this.tweens.add({ targets: a.container, x: ax, y: ay, duration: 180 });
    this.tweens.add({ targets: b.container, x: bx, y: by, duration: 180 });
  }

  /* ================= MATCH ================= */

  resolveBoard() {
    const matches = this.findMatches();
    if (!matches.length) return;

    this.removeMatches(matches);

    this.time.delayedCall(220, () => {
      this.applyGravity();
      this.time.delayedCall(220, () => this.fillEmpty());
    });
  }

  findMatches() {
    const found = new Set();

    // горизонталь
    for (let y = 0; y < this.rows; y++) {
      let run = [this.grid[y][0]];
      for (let x = 1; x < this.cols; x++) {
        const c = this.grid[y][x];
        if (c.type === run[0].type) run.push(c);
        else {
          if (run.length >= 3) run.forEach(r => found.add(r));
          run = [c];
        }
      }
      if (run.length >= 3) run.forEach(r => found.add(r));
    }

    // вертикаль
    for (let x = 0; x < this.cols; x++) {
      let run = [this.grid[0][x]];
      for (let y = 1; y < this.rows; y++) {
        const c = this.grid[y][x];
        if (c.type === run[0].type) run.push(c);
        else {
          if (run.length >= 3) run.forEach(r => found.add(r));
          run = [c];
        }
      }
      if (run.length >= 3) run.forEach(r => found.add(r));
    }

    return [...found];
  }

  /* ================= REMOVE / GRAVITY ================= */

  removeMatches(matches) {
    matches.forEach(cell => {
      this.tweens.add({
        targets: cell.container,
        scale: 0,
        alpha: 0,
        duration: 180,
        onComplete: () => cell.container.destroy()
      });
      this.grid[cell.y][cell.x] = null;
    });
  }

  applyGravity() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = this.rows - 1; y >= 0; y--) {
        if (!this.grid[y][x]) {
          for (let yy = y - 1; yy >= 0; yy--) {
            const c = this.grid[yy][x];
            if (c) {
              this.grid[y][x] = c;
              this.grid[yy][x] = null;
              c.y = y;

              const ny =
                this.offsetY + y * this.tileSize + this.tileSize / 2;

              this.tweens.add({
                targets: c.container,
                y: ny,
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
          cell.container.y = this.offsetY - this.tileSize;
          this.grid[y][x] = cell;

          const ty =
            this.offsetY + y * this.tileSize + this.tileSize / 2;

          this.tweens.add({
            targets: cell.container,
            y: ty,
            duration: 260
          });
        }
      }
    }
  }
}
