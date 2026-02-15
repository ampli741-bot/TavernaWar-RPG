export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // фон
    this.load.image('bg', 'assets/bg.jpg');

    // руны
    this.load.image('red', 'assets/rune_red.png');
    this.load.image('blue', 'assets/rune_blue.png');
    this.load.image('green', 'assets/rune_green.png');
    this.load.image('purple', 'assets/rune_purple.png');
    this.load.image('yellow', 'assets/rune_yellow.png');
  }

  create() {
    this.cols = 8;
    this.rows = 8;
    this.tileSize = 84;
    this.gap = 8;

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];

    this.grid = [];
    this.selected = null;
    this.lockInput = false;

    // === ЦЕНТРИРОВАНИЕ ПОЛЯ ===
    const boardWidth =
      this.cols * this.tileSize + (this.cols - 1) * this.gap;
    const boardHeight =
      this.rows * this.tileSize + (this.rows - 1) * this.gap;

    this.offsetX = Math.floor(
      (this.sys.game.config.width - boardWidth) / 2
    );
    this.offsetY = Math.floor(
      (this.sys.game.config.height - boardHeight) / 2
    );

    // === ФОН ===
    const bg = this.add.image(
      this.sys.game.config.width / 2,
      this.sys.game.config.height / 2,
      'bg'
    );
    bg.setDisplaySize(
      this.sys.game.config.width,
      this.sys.game.config.height
    );
    bg.setDepth(-10);

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
    const isRich = Math.random() < 0.12;

    const px =
      this.offsetX + x * (this.tileSize + this.gap);
    const py =
      this.offsetY + y * (this.tileSize + this.gap);

    const container = this.add.container(px, py);

    // тёмная плитка
    const bg = this.add.rectangle(
      0,
      0,
      this.tileSize,
      this.tileSize,
      0x0f0f0f
    );
    bg.setOrigin(0);

    // иконка
    const icon = this.add.image(
      this.tileSize / 2,
      this.tileSize / 2,
      type
    );
    icon.setDisplaySize(
      this.tileSize * 0.82,
      this.tileSize * 0.82
    );

    // рамка
    const frame = this.add.rectangle(
      0,
      0,
      this.tileSize,
      this.tileSize,
      0x000000,
      0
    );
    frame.setOrigin(0);
    frame.setStrokeStyle(
      isRich ? 4 : 2,
      isRich ? 0xffcc00 : 0x222222
    );

    container.add([bg, icon, frame]);
    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive();

    const cell = {
      x,
      y,
      type,
      isRich,
      container,
      bg,
      icon,
      frame
    };

    container.on('pointerdown', () => {
      if (!this.lockInput) this.handleClick(cell);
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
    cell.frame.setStrokeStyle(4, 0xffff00);
  }

  clearSelection() {
    if (this.selected) {
      this.selected.frame.setStrokeStyle(
        this.selected.isRich ? 4 : 2,
        this.selected.isRich ? 0xffcc00 : 0x222222
      );
      this.selected = null;
    }
  }

  areNeighbors(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  /* ================= SWAP ================= */

  swap(a, b) {
    this.lockInput = true;

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
      duration: 200,
      onComplete: () => (this.lockInput = false)
    });
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

    // горизонталь
    for (let y = 0; y < this.rows; y++) {
      let run = [this.grid[y][0]];
      for (let x = 1; x < this.cols; x++) {
        const c = this.grid[y][x];
        if (c.type === run[0].type) run.push(c);
        else {
          if (run.length >= 3) matches.push(...run);
          run = [c];
        }
      }
      if (run.length >= 3) matches.push(...run);
    }

    // вертикаль
    for (let x = 0; x < this.cols; x++) {
      let run = [this.grid[0][x]];
      for (let y = 1; y < this.rows; y++) {
        const c = this.grid[y][x];
        if (c.type === run[0].type) run.push(c);
        else {
          if (run.length >= 3) matches.push(...run);
          run = [c];
        }
      }
      if (run.length >= 3) matches.push(...run);
    }

    return [...new Set(matches)];
  }

  removeMatches(matches) {
    matches.forEach(cell => {
      this.tweens.add({
        targets: cell.container,
        scale: 0,
        alpha: 0,
        duration: 200,
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
            if (this.grid[yy][x]) {
              const cell = this.grid[yy][x];
              this.grid[y][x] = cell;
              this.grid[yy][x] = null;
              cell.y = y;

              this.tweens.add({
                targets: cell.container,
                y:
                  this.offsetY +
                  y * (this.tileSize + this.gap),
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

          this.tweens.add({
            targets: cell.container,
            y:
              this.offsetY +
              y * (this.tileSize + this.gap),
            duration: 300
          });
        }
      }
    }
  }
}
