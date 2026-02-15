import GameScene from "./GameScene.js";

let game;

export function initPhaser() {
    if (game) return;

    game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: "game-container",
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: "#000",
        scene: GameScene,
        scale: {
            mode: Phaser.Scale.RESIZE
        }
    });
}
