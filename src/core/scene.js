export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.cols = 8;
    this.rows = 8;
    this.tileSize = 80;

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];
    this.colors = {
      red: 0xaa3333,
      blue: 0x3366aa,
      green: 0x33aa66,
      purple: 0x663399,
      yellow: 0xaaaa33
    };

    this.grid = [];
    this.selected = null;

    this.offsetX =
      (this.sys.game.config.width - this.cols * this.tileSize) / 2;
    this.offsetY =
      (this.sys.game.config.height - this.rows * this.tileSize) / 2;

    // фон
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

    const tile = this.add.rectangle(
      this.offsetX + x * this.tileSize + this.tileSize / 2,
      this.offsetY + y * this.tileSize + this.tileSize / 2,
      this.tileSize - 6,
      this.tileSize - 6,
      this.colors[type]
    );

    tile.setStrokeStyle(2, 0x222222);
    tile.setInteractive();

    const cell = { x, y, type, tile };

    tile.on('pointerdown', () => this.handleClick(cell));
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
    cell.tile.setStrokeStyle(4, 0xffffff);
    console.log(`Selected [${cell.x}, ${cell.y}]`);
  }

  clearSelection() {
    if (this.selected) {
      this.selected.tile.setStrokeStyle(2, 0x222222);
      this.selected = null;
    }
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

    console.log('Tiles swapped');
  }

  /* ================= MATCH LOGIC ================= */

  resolveBoard() {
    const matches = this.findMatches();
    if (matches.length === 0) return;

    this.logMatches(matches);
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

    // horizontal
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

    // vertical
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

  logMatches(matches) {
    const summary = { red: 0, blue: 0, green: 0, yellow: 0, purple: 0 };
    matches.forEach(c => summary[c.type]++);
    console.log('MATCH SUMMARY:', summary);

    if (summary.red > 0) {
      const dmg = summary.red * 10;
      console.log(`Enemy takes ${dmg} damage (${summary.red} red tiles)`);
    }
  }

  /* ================= REMOVE / GRAVITY ================= */

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
        if (this.grid[y][x] === null) {
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
        if (this.grid[y][x] === null) {
          const cell = this.createCell(x, y);
          cell.tile.y =
            this.offsetY - this.tileSize;

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
