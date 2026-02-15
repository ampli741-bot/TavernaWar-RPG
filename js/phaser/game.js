import GameScene from "./GameScene.js";

export function initPhaser() {
    return new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game-container',
        width: 680,
        height: 680,
        scene: GameScene,
        transparent: true
    });
}
