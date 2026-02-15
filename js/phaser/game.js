import GameScene from "./GameScene.js";

export function initPhaser() {
    new Phaser.Game({
        type: Phaser.AUTO,
        parent: "game-container",
        width: window.innerWidth * 0.64,
        height: window.innerHeight,
        backgroundColor: "#000",
        scene: [GameScene]
    });
}
