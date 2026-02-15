// js/phaser/game.js
import GameScene from "./GameScene.js";

let game = null;

export function initPhaser() {
    if (game) return;

    game = new Phaser.Game({
        type: Phaser.AUTO,
        backgroundColor: "#000",
        parent: "game-container",
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1280,
            height: 720
        },
        scene: GameScene
    });
}
