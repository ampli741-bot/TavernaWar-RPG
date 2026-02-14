export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.cols = 8;
    this.rows = 8;
    this.tileSize = 80;
    this.grid = [];

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

    // создаём тайлы
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

        tile.on('pointerdown', () => {
          console.log(`Tile clicked → [${x}, ${y}] type=${type}`);
        });

        this.grid[y][x] = { x, y, type, tile };
      }
    }

    console.log('Typed grid created');
  }
}
