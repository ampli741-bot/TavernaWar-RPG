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

    const types = ['red', 'blue', 'green', 'purple', 'yellow'];
    const colors = {
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

    // создание тайлов
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];

      for (let x = 0; x < this.cols; x++) {
        const type = Phaser.Utils.Array.GetRandom(types);

        const tile = this.add.rectangle(
          offsetX + x * this.tileSize + this.tileSize / 2,
          offsetY + y * this.tileSize + this.tileSize / 2,
          this.tileSize - 6,
          this.tileSize - 6,
          colors[type]
        );

        tile.setStrokeStyle(2, 0x222222);
        tile.setInteractive();

        const cell = { x, y, type, tile };

        tile.on('pointerdown', () => {
          this.handleClick(cell);
        });

        this.grid[y][x] = cell;
      }
    }

    console.log('Swap-ready grid created');
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
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return dx + dy === 1;
  }

 swap(a, b) {
  // 1. сохраняем реальные позиции тайлов
  const ax = a.tile.x;
  const ay = a.tile.y;
  const bx = b.tile.x;
  const by = b.tile.y;

  // 2. меняем в логической сетке
  this.grid[a.y][a.x] = b;
  this.grid[b.y][b.x] = a;

  // 3. меняем логические координаты
  [a.x, b.x] = [b.x, a.x];
  [a.y, b.y] = [b.y, a.y];

  // 4. анимируем В СОХРАНЁННЫЕ координаты
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
    duration: 200
  });

  console.log('Tiles swapped');
}

