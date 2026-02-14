import { startGame } from './game/game.js';
import { GameScene } from './core/scene.js';

console.log("Taverna War app loaded");

window.app = {
  player: null,
  mob: null,
  lootActive: false,
  turn: "PLAYER"
};

window.startGame = startGame;

window.initPhaser = function () {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 680,
    height: 680,
    scene: GameScene,
    transparent: true
  });
};

window.initPhaser();
