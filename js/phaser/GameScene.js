export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    create() {
        console.log("🎮 GameScene create");

        const size = 80;
        const offset = 20;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                this.add.rectangle(
                    offset + c * size + size / 2,
                    offset + r * size + size / 2,
                    size - 4,
                    size - 4,
                    Phaser.Display.Color.RandomRGB().color
                );
            }
        }
    }
}
