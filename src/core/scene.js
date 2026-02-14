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

    // RPG-статы
    this.player = {
      hp: 100,
      maxHp: 100,
      mana: 0,
      gold: 0
    };

    this.enemy = {
      hp: 500,
      maxHp: 500,
      curse: 0
    };

    this.grid = [];
    this.selected = null;

    this.offsetX = (this.sys.game.config.width - this.cols * this.tileSize) / 2;
    this.offsetY = (this.sys.game.config.height - this.rows * this.tileSize) / 2;

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
        this.grid[y][x] = this.createCell(x, y);
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
    if (!this.selected) return this.select(cell);

    if (this.selected === cell) return this.clearSelection();

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
    const ax = a.tile.x, ay = a.tile.y;
    const bx = b.tile.x, by = b.tile.y;

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
    if (!matches.length) return;

    this.applyEffects(matches);
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

  /* ================= EFFECTS ================= */

  applyEffects(matches) {
    const s = { red: 0, blue: 0, green: 0, yellow: 0, purple: 0 };
    matches.forEach(c => s[c.type]++);

    if (s.red) {
      const dmg = s.red * 10;
      this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
      console.log(`Enemy takes ${dmg} damage`);
    }

    if (s.blue) {
      this.player.mana += s.blue * 10;
      console.log(`Player gains ${s.blue * 10} mana`);
    }

    if (s.green) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + s.green * 10);
      console.log(`Player heals ${s.green * 10} HP`);
    }

    if (s.yellow) {
      this.player.gold += s.yellow * 10;
      console.log(`Player gains ${s.yellow * 10} gold`);
    }

    if (s.purple) {
      this.enemy.curse += s.purple;
      console.log(`Enemy cursed x${s.purple}`);
    }

    console.log('STATS:', this.player, this.enemy);
  }

  /* ================= REMOVE / FALL ================= */

  removeMatches(matches) {
    matches.forEach(c => {
      this.tweens.add({
        targets: c.tile,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => c.tile.destroy()
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
                targets: c.tile,
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
          const c = this.createCell(x, y);
          c.tile.y = this.offsetY - this.tileSize;

          this.tweens.add({
            targets: c.tile,
            y: this.offsetY + y * this.tileSize + this.tileSize / 2,
            duration: 300
          });

          this.grid[y][x] = c;
        }
      }
    }
  }
}
