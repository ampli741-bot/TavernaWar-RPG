export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const cols = 8;
    const rows = 8;
    const tileSize = 80;

    const offsetX = (this.sys.game.config.width - cols * tileSize) / 2;
    const offsetY = (this.sys.game.config.height - rows * tileSize) / 2;

    // фон сцены
    this.add.rectangle(
      this.sys.game.config.width / 2,
      this.sys.game.config.height / 2,
      this.sys.game.config.width,
      this.sys.game.config.height,
      0x1e1e1e
    );

    // сетка
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const rect = this.add.rectangle(
          offsetX + x * tileSize + tileSize / 2,
          offsetY + y * tileSize + tileSize / 2,
          tileSize - 4,
          tileSize - 4,
          0x2a2a2a
        );

        rect.setStrokeStyle(2, 0x444444);
      }
    }

    console.log('Grid 8x8 created');
  }
}
