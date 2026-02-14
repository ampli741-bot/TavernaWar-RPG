// src/core/scene.js

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // пока ничего не грузим
  }

  create() {
    // Просто визуальный маркер, что сцена запустилась
    this.add.rectangle(340, 340, 600, 600, 0x222222);
    this.add.text(260, 320, 'GAME SCENE OK', {
      fontSize: '24px',
      color: '#ffffff'
    });
  }
}
