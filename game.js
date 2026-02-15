console.log('GAME.JS LOADED');

const TILE = 85;
const GRID = 8;
const TYPES = ['red', 'blue', 'green', 'purple', 'yellow'];

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('bg', 'assets/bg.jpg');
    TYPES.forEach(t => {
      this.load.image(t, `assets/rune_${t}.png`);
    });
  }

  create() {
    const { width, height } = this.scale;

    // background
    const bg = this.add.image(width / 2, height / 2, 'bg');
    const s = Math.max(width / bg.width, height / bg.height);
    bg.setScale(s);

    // grid center
    const ox = (width - GRID * TILE) / 2;
    const oy = (height - GRID * TILE) / 2;

    // tiles
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const type = Phaser.Utils.Array.GetRandom(TYPES);
        this.add.image(
          ox + c * TILE + TILE / 2,
          oy + r * TILE + TILE / 2,
          type
        ).setDisplaySize(70, 70);
      }
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: GameScene
});
