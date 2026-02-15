export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('bg', 'assets/bg.jpg');

    this.load.image('rune_red', 'assets/rune_red.png');
    this.load.image('rune_blue', 'assets/rune_blue.png');
    this.load.image('rune_green', 'assets/rune_green.png');
    this.load.image('rune_purple', 'assets/rune_purple.png');
    this.load.image('rune_yellow', 'assets/rune_yellow.png');
  }

  create() {
    /* ====== GRID CONFIG ====== */
    this.cols = 8;
    this.rows = 8;
    this.tileSize = 96;
    this.gap = 8;

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];
    this.grid = [];
    this.selected = null;
    this.locked = false;

    const boardWidth =
      this.cols * this.tileSize + (this.cols - 1) * this.gap;
    const boardHeight =
      this.rows * this.tileSize + (this.rows - 1) * this.gap;

    /* ====== CENTER ====== */
    this.centerX = this.sys.game.config.width / 2;
    this.centerY = this.sys.game.config.height / 2;

    this.offsetX = this.centerX - boardWidth / 2;
    this.offsetY = this.centerY - boardHeight / 2;

    /* ====== BACKGROUND ====== */
    const bg = this.add.image(this.centerX, this.centerY, 'bg');
    bg.setDisplaySize(boardWidth + 120, boardHeight + 120);
    bg.setDepth(-10);

    /* ====== BOARD FRAME ====== */
    const boardBg = this.add.rectangle(
      this.centerX,
      this.centerY,
      boardWidth + 20,
      boardHeight + 20,
      0x0b0b0b
    );
    boardBg.setStrokeStyle(4, 0x000000);
    boardBg.setDepth(-5);

    /* ====== CREATE GRID ====== */
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        const cell = this.createCell(x, y);
        this.grid[y][x] = cell;
      }
    }

    this.resolveBoard();
  }

  /* ================= CELL ================= */

  createCell(x, y) {
    const type = Phaser.Utils.Array.GetRandom(this.types);
    const rich = Math.random() < 0.1;

    const px =
      this.offsetX + x * (this.tileSize + this.gap) + this.tileSize / 2;
    const py =
      this.offsetY + y * (this.tileSize + this.gap) + this.tileSize / 2;

    const c = this.add.container(px, py);

    /* tile base */
    const base = this.add.rectangle(
      0,
      0,
      this.tileSize,
      this.tileSize,
      0x121212
    );
    base.setStrokeStyle(2, rich ? 0xffd700 : 0x000000);
    c.add(base);

    /* icon */
    const icon = this.add.image(0, 0, `rune_${type}`);
    icon.setDisplaySize(this.tileSize * 0.85, this.tileSize * 0.85);
    c.add(icon);

    /* rich glow */
    if (rich) {
      const glow = this.add.rectangle(
        0,
        0,
        this.tileSize + 6,
        this.tileSize + 6
      );
      glow.setStrokeStyle(3, 0xffd700);
      glow.setAlpha(0.9);
      c.addAt(glow, 0);
    }

    c.setSize(this.tileSize, this.tileSize);
    c.setInteractive();

    c.on('pointerover', () => {
      if (this.locked) return;
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, scale: 1.05, duration: 120 });
    });

    c.on('pointerout', () => {
      this.tweens.add({ targets: c, scale: 1, duration: 120 });
    });

    const cell = { x, y, type, rich, c };

    c.on('pointerdown', () => this.handleClick(cell));
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
    cell.c.setScale(1.08);
  }

  clearSelection() {
    if (this.selected) {
      this.selected.c.setScale(1);
      this.selected = null;
    }
  }

  areNeighbors(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  /* ================= SWAP ================= */

  swap(a, b, cb) {
    const ax = a.c.x,
      ay = a.c.y;
    const bx = b.c.x,
      by = b.c.y;

    this.grid[a.y][a.x] = b;
    this.grid[b.y][b.x] = a;
    [a.x, b.x] = [b.x, a.x];
    [a.y, b.y] = [b.y, a.y];

    this.tweens.add({ targets: a.c, x: bx, y: by, duration: 200 });
    this.tweens.add({
      targets: b.c,
      x: ax,
      y: ay,
      duration: 200,
      onComplete: cb
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
    const out = [];

    for (let y = 0; y < this.rows; y++) {
      let run = [this.grid[y][0]];
      for (let x = 1; x < this.cols; x++) {
        const c = this.grid[y][x];
        if (c.type === run[0].type) run.push(c);
        else {
          if (run.length >= 3) out.push(...run);
          run = [c];
        }
      }
      if (run.length >= 3) out.push(...run);
    }

    for (let x = 0; x < this.cols; x++) {
      let run = [this.grid[0][x]];
      for (let y = 1; y < this.rows; y++) {
        const c = this.grid[y][x];
        if (c.type === run[0].type) run.push(c);
        else {
          if (run.length >= 3) out.push(...run);
          run = [c];
        }
      }
      if (run.length >= 3) out.push(...run);
    }

    return [...new Set(out)];
  }

  /* ================= REMOVE / FALL ================= */

  removeMatches(matches) {
    matches.forEach(c => {
      this.tweens.add({
        targets: c.c,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => c.c.destroy()
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
                targets: c.c,
                y:
                  this.offsetY +
                  y * (this.tileSize + this.gap) +
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
          c.c.y = this.offsetY - this.tileSize;
          this.grid[y][x] = c;

          this.tweens.add({
            targets: c.c,
            y:
              this.offsetY +
              y * (this.tileSize + this.gap) +
              this.tileSize / 2,
            duration: 300
          });
        }
      }
    }
  }
}
