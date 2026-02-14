export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // руны
    this.load.image('red', 'assets/rune_red.png');
    this.load.image('blue', 'assets/rune_blue.png');
    this.load.image('green', 'assets/rune_green.png');
    this.load.image('purple', 'assets/rune_purple.png');
    this.load.image('yellow', 'assets/rune_yellow.png');

    // фон
    this.load.image('bg', 'assets/bg.jpg');
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

    // фон
    this.add.image(
      this.sys.game.config.width / 2,
      this.sys.game.config.height / 2,
      'bg'
    ).setAlpha(0.35);

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

    const tile = this.add.image(
      this.offsetX + x * this.tileSize + this.tileSize / 2,
      this.offsetY + y * this.tileSize + this.tileSize / 2,
      type
    );

    tile.setDisplaySize(this.tileSize - 8, this.tileSize - 8);
    tile.setInteractive({ useHandCursor: true });

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
      this.time.delayedCall(220, () => this.resolveBoard());
    } else {
      this.clearSelection();
      this.select(cell);
    }
  }

  select(cell) {
    this.selected = cell;

    cell.tile.setDepth(10);
    cell.tile.setTint(0xffffff);

    this.tweens.add({
      targets: cell.tile,
      alpha: 0.8,
      yoyo: true,
      repeat: -1,
      duration: 250
    });
  }

  clearSelection() {
    if (!this.selected) return;

    this.tweens.killTweensOf(this.selected.tile);
    this.selected.tile.setAlpha(1);
    this.selected.tile.clearTint();
    this.selected.tile.setDepth(0);

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

    // горизонт
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

    // вертикаль
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

    if (summary.red)
      console.log(`🔥 Урон: ${summary.red * 10}`);
    if (summary.blue)
      console.log(`🔵 Мана: +${summary.blue * 5}`);
    if (summary.green)
      console.log(`💚 Хил: +${summary.green * 5}`);
    if (summary.purple)
      console.log(`🟣 Проклятие: ${summary.purple}`);
    if (summary.yellow)
      console.log(`💰 Золото: +${summary.yellow}`);
  }

  /* ================= REMOVE / GRAVITY ================= */

  removeMatches(matches) {
    matches.forEach(cell => {
      this.tweens.add({
        targets: cell.tile,
        alpha: 0,
        scale: 0.3,
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
