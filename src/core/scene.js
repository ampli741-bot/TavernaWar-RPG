export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // фон
    this.load.image('bg', 'assets/bg.jpg');

    // руны
    this.load.image('rune_red', 'assets/rune_red.png');       // ATK
    this.load.image('rune_blue', 'assets/rune_blue.png');     // MP
    this.load.image('rune_green', 'assets/rune_green.png');   // HP
    this.load.image('rune_purple', 'assets/rune_purple.png'); // CURSE
    this.load.image('rune_yellow', 'assets/rune_yellow.png'); // GOLD
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
    ).setDisplaySize(
      this.sys.game.config.width,
      this.sys.game.config.height
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

    // контейнер (ВАЖНО)
    const container = this.add.container(
      this.offsetX + x * this.tileSize + this.tileSize / 2,
      this.offsetY + y * this.tileSize + this.tileSize / 2
    );

    // рамка
    const frame = this.add.rectangle(
      0,
      0,
      this.tileSize,
      this.tileSize,
      0x000000
    );
    frame.setStrokeStyle(2, 0x00ff00);

    // иконка
    const icon = this.add.image(0, 0, `rune_${type}`);
    icon.setDisplaySize(this.tileSize * 0.75, this.tileSize * 0.75);

    container.add([frame, icon]);

    // 🔒 интерактив ТОЛЬКО контейнеру
    container.setSize(this.tileSize, this.tileSize);
    container.setInteractive(
      new Phaser.Geom.Rectangle(
        -this.tileSize / 2,
        -this.tileSize / 2,
        this.tileSize,
        this.tileSize
      ),
      Phaser.Geom.Rectangle.Contains
    );

    // ❌ запрещаем интерактив детям
    frame.disableInteractive?.();
    icon.disableInteractive?.();

    // hover (ФИКС!)
    container.on('pointerover', () => {
      this.tweens.killTweensOf(container);
      container.setScale(1);

      this.tweens.add({
        targets: container,
        scale: 1.12,
        duration: 120,
        ease: 'Quad.out'
      });
    });

    container.on('pointerout', () => {
      this.tweens.killTweensOf(container);

      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 120,
        ease: 'Quad.out'
      });
    });

    container.on('pointerdown', () => {
      this.handleClick(cell);
    });

    const cell = { x, y, type, container, icon, frame };
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
    cell.frame.setStrokeStyle(3, 0xffffff);
  }

  clearSelection() {
    if (this.selected) {
      this.selected.frame.setStrokeStyle(2, 0x00ff00);
      this.selected = null;
    }
  }

  areNeighbors(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  /* ================= SWAP ================= */

  swap(a, b) {
    const ax = a.container.x;
    const ay = a.container.y;
    const bx = b.container.x;
    const by = b.container.y;

    this.grid[a.y][a.x] = b;
    this.grid[b.y][b.x] = a;

    [a.x, b.x] = [b.x, a.x];
    [a.y, b.y] = [b.y, a.y];

    this.tweens.add({ targets: a.container, x: bx, y: by, duration: 200 });
    this.tweens.add({ targets: b.container, x: ax, y: ay, duration: 200 });
  }

  /* ================= MATCH ================= */

  resolveBoard() {
    const matches = this.findMatches();
    if (matches.length === 0) return;

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

  /* ================= REMOVE / GRAVITY ================= */

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
          cell.container.y = this.offsetY - this.tileSize;

          this.tweens.add({
            targets: cell.container,
            y: this.offsetY + y * this.tileSize + this.tileSize / 2,
            duration: 300
          });

          this.grid[y][x] = cell;
        }
      }
    }
  }
}
