export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.cols = 8;
    this.rows = 8;
    this.tileSize = 80;
    this.grid = [];
    this.selected = null;
    this.isBusy = false;

    this.types = ['red', 'blue', 'green', 'purple', 'yellow'];
    this.colors = {
      red: 0xaa3333,
      blue: 0x3366aa,
      green: 0x33aa66,
      purple: 0x663399,
      yellow: 0xaaaa33
    };

    this.offsetX = (this.sys.game.config.width - this.cols * this.tileSize) / 2;
    this.offsetY = (this.sys.game.config.height - this.rows * this.tileSize) / 2;

    // фон
    this.add.rectangle(
      this.sys.game.config.width / 2,
      this.sys.game.config.height / 2,
      this.sys.game.config.width,
      this.sys.game.config.height,
      0x1e1e1e
    );

    // стартовая сетка
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.spawnTile(x, y);
      }
    }

    this.time.delayedCall(100, () => this.resolve());
  }

  // =====================
  // SPAWN
  // =====================

  spawnTile(x, y, fromTop = false) {
    const type = Phaser.Utils.Array.GetRandom(this.types);
    const startY = fromTop
      ? this.offsetY - this.tileSize
      : this.offsetY + y * this.tileSize + this.tileSize / 2;

    const tile = this.add.rectangle(
      this.offsetX + x * this.tileSize + this.tileSize / 2,
      startY,
      this.tileSize - 6,
      this.tileSize - 6,
      this.colors[type]
    );

    tile.setStrokeStyle(2, 0x222222);
    tile.setInteractive();

    const cell = { x, y, type, tile };

    tile.on('pointerdown', () => {
      if (!this.isBusy) this.handleClick(cell);
    });

    this.grid[y][x] = cell;

    if (fromTop) {
      this.tweens.add({
        targets: tile,
        y: this.offsetY + y * this.tileSize + this.tileSize / 2,
        duration: 250
      });
    }
  }

  // =====================
  // INPUT
  // =====================

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
    cell.tile.setStrokeStyle(4, 0xffffff);
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

  // =====================
  // SWAP
  // =====================

  swap(a, b) {
    this.isBusy = true;

    const ax = a.tile.x, ay = a.tile.y;
    const bx = b.tile.x, by = b.tile.y;

    this.grid[a.y][a.x] = b;
    this.grid[b.y][b.x] = a;
    [a.x, b.x] = [b.x, a.x];
    [a.y, b.y] = [b.y, a.y];

    this.tweens.add({ targets: a.tile, x: bx, y: by, duration: 200 });
    this.tweens.add({
      targets: b.tile, x: ax, y: ay, duration: 200,
      onComplete: () => this.resolve()
    });
  }

  // =====================
  // MATCH FIND
  // =====================

  findMatches() {
    const matches = [];

    // горизонтали
    for (let y = 0; y < this.rows; y++) {
      let run = [this.grid[y][0]];
      for (let x = 1; x < this.cols; x++) {
        const c = this.grid[y][x];
        if (c && run[run.length - 1] && c.type === run[run.length - 1].type) {
          run.push(c);
        } else {
          if (run.length >= 3) matches.push(...run);
          run = [c];
        }
      }
      if (run.length >= 3) matches.push(...run);
    }

    // вертикали
    for (let x = 0; x < this.cols; x++) {
      let run = [this.grid[0][x]];
      for (let y = 1; y < this.rows; y++) {
        const c = this.grid[y][x];
        if (c && run[run.length - 1] && c.type === run[run.length - 1].type) {
          run.push(c);
        } else {
          if (run.length >= 3) matches.push(...run);
          run = [c];
        }
      }
      if (run.length >= 3) matches.push(...run);
    }

    return [...new Set(matches.filter(Boolean))];
  }

  // =====================
  // RESOLVE LOOP
  // =====================

  resolve() {
    const matches = this.findMatches();

    if (matches.length === 0) {
      this.isBusy = false;
      return;
    }

    // 🔥 НОВОЕ: считаем цвета
    const summary = { red: 0, blue: 0, green: 0, yellow: 0, purple: 0 };
    matches.forEach(c => summary[c.type]++);

    console.log('MATCH SUMMARY:', summary);

    // подсветка
    matches.forEach(c => c.tile.setStrokeStyle(4, 0xffff00));

    // удаление
    this.time.delayedCall(150, () => {
      matches.forEach(c => {
        this.tweens.add({
          targets: c.tile,
          scale: 0,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            c.tile.destroy();
            this.grid[c.y][c.x] = null;
          }
        });
      });

      this.time.delayedCall(220, () => {
        this.applyGravity();
        this.time.delayedCall(260, () => {
          this.spawnNewTiles();
          this.time.delayedCall(300, () => this.resolve());
        });
      });
    });
  }

  // =====================
  // GRAVITY
  // =====================

  applyGravity() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = this.rows - 1; y >= 0; y--) {
        if (!this.grid[y][x]) {
          for (let yy = y - 1; yy >= 0; yy--) {
            const above = this.grid[yy][x];
            if (above) {
              this.grid[y][x] = above;
              this.grid[yy][x] = null;
              above.y = y;

              this.tweens.add({
                targets: above.tile,
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

  // =====================
  // RESPAWN
  // =====================

  spawnNewTiles() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (!this.grid[y][x]) {
          this.spawnTile(x, y, true);
        }
      }
    }
  }
}
