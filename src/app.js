import { GameScene } from './core/scene.js';

console.log('Taverna War app loaded');

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1024,
  height: 768,
  backgroundColor: '#000000',
  scene: GameScene
};

new Phaser.Game(config);
