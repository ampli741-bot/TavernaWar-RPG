import { startGame } from './game/game.js';
import { GameScene } from './core/scene.js';

console.log('Taverna War app loaded');

window.app = {
  player: null,
  mob: null,
  lootActive: false,
  turn: 'PLAYER'
};

// делаем старт игры доступным из консоли / UI
window.startGame = startGame;

// инициализация Phaser
function initPhaser() {
  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 680,
    height: 680,
    backgroundColor: '#1e1e1e',
    scene: GameScene
  };

  new Phaser.Game(config);
}

// запускаем Phaser сразу
initPhaser();
