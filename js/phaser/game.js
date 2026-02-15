import GameScene from "./GameScene.js";

let game;

export function initPhaser() {
    if (game) return;

    game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: "game-container",
        backgroundColor: "#000",
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: window.innerWidth,
            height: window.innerHeight
        },
        scene: [GameScene]
    });
}
