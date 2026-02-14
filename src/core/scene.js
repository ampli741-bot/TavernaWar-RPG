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

    const offsetX = (this.sys.game.config.width - this.cols * this.tileSize) / 2;
    const offsetY = (this.sys.game.config.height - this.rows * this.tileSize) / 2;

    // фон
    this.add.rectangle(
      this.sys.game.config.width / 2,
      this.sys.game.config.height / 2,
      this.sys.game.config.width,
      this.sys.game.config.height,
      0x1e1e1e
    );

    // создаём сетку
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];

      for (let x = 0; x < this.cols; x++) {
        const type = Phaser.Utils.Array.GetRandom(this.types);

        const tile = this.add.rectangle(
          offsetX + x * this.tileSize + this.tileSize / 2,
          offsetY + y * this.tileSize + this.tileSize / 2,
          this.tileSize - 6,
          this.tileSize - 6,
          this.colors[type]
        );

        tile.setStrokeStyle(2, 0x222222);
        tile.setInteractive();

        const cell = { x, y, type, tile };

        tile.on('pointerdown', () => this.handleClick(cell));

        this.grid[y][x] = cell;
      }
    }

    console.log('Grid created');
  }

  // =======================
  // INPUT
  // =======================

  handleClick(cell) {
    if (this.isBusy) return;

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
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return dx + dy === 1;
  }

  // =======================
  // SWAP
  // =======================

  swap(a, b) {
    this.isBusy = true;

    const ax = a.tile.x;
    const ay = a.tile.y;
    const bx = b.tile.x;
    const by = b.tile.y;

    // логическая сетка
    this.grid[a.y][a.x] = b;
    this.grid[b.y][b.x] = a;

    [a.x, b.x] = [b.x, a.x];
    [a.y, b.y] = [b.y, a.y];

    this.tweens.add({
      targets: a.tile,
      x: bx,
      y: by,
      duration: 200
    });

    this.tweens.add({
      targets: b.tile,
      x: ax,
      y: ay,
      duration: 200,
      onComplete: () => this.afterSwap()
    });
  }

  afterSwap() {
    const matches = this.findMatches();

    if (matches.length > 0) {
      this.highlightMatches(matches);

      this.time.delayedCall(300, () => {
        this.removeMatches(matches);
      });
    } else {
      this.isBusy = false;
    }
  }

  // =======================
  // MATCH FIND
  // =======================

  findMatches() {
    const matches = [];

    // горизонталь
    for (let y = 0; y < this.rows; y++) {
      let run = [this.grid[y][0]];

      for (let x = 1; x < this.cols; x++) {
        const cell = this.grid[y][x];
        const prev = run[run.length - 1];

        if (cell.type === prev.type) {
          run.push(cell);
        } else {
          if (run.length >= 3) matches.push(...run);
          run = [cell];
        }
      }
      if (run.length >= 3) matches.push(...run);
    }

    // вертикаль
    for (let x = 0; x < this.cols; x++) {
      let run = [this.grid[0][x]];

      for (let y = 1; y < this.rows; y++) {
        const cell = this.grid[y][x];
        const prev = run[run.length - 1];

        if (cell.type === prev.type) {
          run.push(cell);
        } else {
          if (run.length >= 3) matches.push(...run);
          run = [cell];
        }
      }
      if (run.length >= 3) matches.push(...run);
    }

    return [...new Set(matches)];
  }

  // =======================
  // HIGHLIGHT + REMOVE
  // =======================

  highlightMatches(matches) {
    matches.forEach(cell => {
      cell.tile.setStrokeStyle(4, 0xffff00);
    });
  }

  removeMatches(matches) {
    matches.forEach(cell => {
      this.tweens.add({
        targets: cell.tile,
        scale: 0,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          cell.tile.destroy();
          this.grid[cell.y][cell.x] = null;
        }
      });
    });

    this.time.delayedCall(300, () => {
      this.isBusy = false;
    });
  }
}
