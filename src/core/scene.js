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

    // сетка
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.spawnTile(x, y);
      }
    }

    console.log('Grid created');
  }

  spawnTile(x, y) {
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

    tile.on('pointerdown', () => {
      if (!this.isBusy) this.handleClick(cell);
    });

    this.grid[y][x] = cell;
  }

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
      this.time.delayedCall(250, () => {
        this.applyGravity();
      });
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

  swap(a, b) {
    this.isBusy = true;

    const ax = a.tile.x;
    const ay = a.tile.y;
    const bx = b.tile.x;
    const by = b.tile.y;

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
      onComplete: () => {
        this.isBusy = false;
      }
    });
  }

  applyGravity() {
    this.isBusy = true;
    let moved = false;

    for (let x = 0; x < this.cols; x++) {
      for (let y = this.rows - 1; y >= 0; y--) {
        if (!this.grid[y][x]) {
          for (let yy = y - 1; yy >= 0; yy--) {
            const above = this.grid[yy][x];
            if (above) {
              this.grid[y][x] = above;
              this.grid[yy][x] = null;

              const newY = this.offsetY + y * this.tileSize + this.tileSize / 2;

              this.tweens.add({
                targets: above.tile,
                y: newY,
                duration: 200
              });

              above.y = y;
              moved = true;
              break;
            }
          }
        }
      }
    }

    this.time.delayedCall(250, () => {
      this.isBusy = false;
      if (moved) {
        console.log('Gravity applied');
      }
    });
  }
}
