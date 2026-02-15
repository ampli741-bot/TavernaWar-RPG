import GameScene from "./GameScene.js";

let game;

export function initPhaser() {
    if (game) return;

    game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 680,
        height: 680,
        parent: "game-container",
        backgroundColor: "#000",
        scene: GameScene
    });
}
