export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('rune_red', 'assets/rune_red.png');
    this.load.image('rune_blue', 'assets/rune_blue.png');
    this.load.image('rune_green', 'assets/rune_green.png');
    this.load.image('rune_purple', 'assets/rune_purple.png');
    this.load.image('rune_yellow', 'assets/rune_yellow.png');
  }

  create() {
    this.cols = 8;
    this.rows = 8;
    this.tileSize = 90;
    this.cellPadding = 12;

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];

    this.grid = [];
    this.selected = null;
    this.locked = false;

    this.offsetX =
      (this.sys.game.config.width -
        this.cols * (this.tileSize + this.cellPadding)) / 2;
    this.offsetY =
      (this.sys.game.config.height -
        this.rows * (this.tileSize + this.cellPadding)) / 2;

    this.add.rectangle(
      this.sys.game.config.width / 2,
      this.sys.game.config.height / 2,
      this.sys.game.config.width,
      this.sys.game.config.height,
      0x0f0f0f
    );

    this.createGrid();
    this.resolveBoard();
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
    const richType = Math.random() < 0.08 ? 'double' : null;

    const px =
      this.offsetX +
      x * (this.tileSize + this.cellPadding) +
      this.tileSize / 2;
    const py =
      this.offsetY +
      y * (this.tileSize + this.cellPadding) +
      this.tileSize / 2;

    const container = this.add.container(px, py);

    const bg = this.add.rectangle(
      0,
      0,
      this.tileSize,
      this.tileSize,
      0x1a1a1a
    );
    bg.setStrokeStyle(2, 0x000000);
    container.add(bg);

    const icon = this.add.image(0, 0, `rune_${type}`);
    icon.setDisplaySize(this.tileSize * 0.65, this.tileSize * 0.65);
    container.add(icon);

    if (richType === 'double') {
      const glow = this.add.rectangle(
        0,
        0,
        this.tileSize + 6,
        this.tileSize + 6
      );
      glow.setStrokeStyle(3, 0xffd700);
      glow.setAlpha(0.9);
      container.addAt(glow, 0);
    }

    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive();

    container.on('pointerover', () => {
      if (this.locked) return;
      this.tweens.killTweensOf(container);
      this.tweens.add({
        targets: container,
        scale: 1.08,
        duration: 120
      });
    });

    container.on('pointerout', () => {
      this.tweens.killTweensOf(container);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 120
      });
    });

    const cell = { x, y, type, richType, container };

    container.on('pointerdown', () => this.handleClick(cell));
    return cell;
  }

  /* ================= INPUT ================= */

  handleClick(cell) {
    if (this.locked) return;

    if (!this.selected) {
      this.select(cell);
      return;
    }

    if (this.selected === cell) {
      this.clearSelection();
      return;
    }

    if (this.areNeighbors(this.selected, cell)) {
      this.locked = true;
      this.swap(this.selected, cell, () => {
        this.clearSelection();
        this.resolveBoard();
      });
    } else {
      this.clearSelection();
      this.select(cell);
    }
  }

  select(cell) {
    this.selected = cell;
    cell.container.setScale(1.12);
  }

  clearSelection() {
    if (this.selected) {
      this.selected.container.setScale(1);
      this.selected = null;
    }
  }

  areNeighbors(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  /* ================= SWAP ================= */

  swap(a, b, onComplete) {
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
      onComplete
    });
  }

  /* ================= MATCH ================= */

  resolveBoard() {
    const matches = this.findMatches();
    if (!matches.length) {
      this.locked = false;
      return;
    }

    this.removeMatches(matches);

    this.time.delayedCall(250, () => {
      this.applyGravity();
      this.time.delayedCall(250, () => {
        this.fillEmpty();
        this.time.delayedCall(200, () => this.resolveBoard());
      });
    });
  }

  findMatches() {
    const result = [];

    for (let y = 0; y < this.rows; y++) {
      let run = [this.grid[y][0]];
      for (let x = 1; x < this.cols; x++) {
        const c = this.grid[y][x];
        if (c.type === run[0].type) run.push(c);
        else {
          if (run.length >= 3) result.push(...run);
          run = [c];
        }
      }
      if (run.length >= 3) result.push(...run);
    }

    for (let x = 0; x < this.cols; x++) {
      let run = [this.grid[0][x]];
      for (let y = 1; y < this.rows; y++) {
        const c = this.grid[y][x];
        if (c.type === run[0].type) run.push(c);
        else {
          if (run.length >= 3) result.push(...run);
          run = [c];
        }
      }
      if (run.length >= 3) result.push(...run);
    }

    return [...new Set(result)];
  }

  /* ================= REMOVE / FALL ================= */

  removeMatches(matches) {
    matches.forEach(c => {
      this.tweens.add({
        targets: c.container,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => c.container.destroy()
      });
      this.grid[c.y][c.x] = null;
    });
  }

  applyGravity() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = this.rows - 1; y >= 0; y--) {
        if (!this.grid[y][x]) {
          for (let yy = y - 1; yy >= 0; yy--) {
            if (this.grid[yy][x]) {
              const c = this.grid[yy][x];
              this.grid[y][x] = c;
              this.grid[yy][x] = null;
              c.y = y;

              this.tweens.add({
                targets: c.container,
                y:
                  this.offsetY +
                  y * (this.tileSize + this.cellPadding) +
                  this.tileSize / 2,
                duration: 220
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
          const c = this.createCell(x, y);
          c.container.y = this.offsetY - this.tileSize;
          this.grid[y][x] = c;

          this.tweens.add({
            targets: c.container,
            y:
              this.offsetY +
              y * (this.tileSize + this.cellPadding) +
              this.tileSize / 2,
            duration: 300
          });
        }
      }
    }
  }
}
