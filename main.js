import { GameScene } from "./phaser/GameScene.js";
import { appState, refreshUI } from "./game/appState.js";

let phaserGame;

// Явно привязываем к window, чтобы HTML видел функцию
window.startGame = (key) => {
    console.log("Попытка запуска игры для:", key);
    
    const menu = document.getElementById('menu-overlay');
    if (menu) menu.style.display = 'none';

    const stats = {
        'warrior': {hp:1600, atk:25, agi:5},
        'mage': {hp:800, atk:65, agi:2},
        'archer': {hp:1000, atk:40, agi:18},
        'assassin': {hp:900, atk:55, agi:14}
    };

    const base = stats[key] || stats['warrior'];
    const imgKey = (key === 'assassin') ? 'assasin' : key;
    
    // Инициализация данных
    appState.player = {
        job: key.toUpperCase(),
        key: key,
        hp: base.hp, maxHp: base.hp,
        armor: 0, maxArmor: 200, mana: 0, gold: 0, level: 1,
        baseAtk: base.atk, baseAgi: base.agi,
        equip: { weapon: { n: "Старая палка", atk: 12, arm: 0, agi: 0, rar: 0 } }
    };

    const portrait = document.getElementById('p-portrait');
    if (portrait) portrait.style.backgroundImage = `url('assets/hero_${imgKey}.jpg')`;

    // ЗАПУСК
    initPhaser();
    spawnMob();
    refreshUI();
};

export function spawnMob() {
    if (!appState.player) return;
    let lvl = appState.player.level;
    appState.mob = { 
        name: "Гоблин Ур." + lvl, 
        hp: 200 + (lvl * 100), 
        maxHp: 200 + (lvl * 100), 
        atk: 20 + (lvl * 10), 
        mana: 0 
    };
    
    const mobPortrait = document.getElementById('m-portrait');
    if (mobPortrait) mobPortrait.style.backgroundImage = `url('assets/monster_goblin.jpg')`; 
    
    appState.turn = "PLAYER"; 
    appState.lootActive = false; 
    refreshUI();
}

function initPhaser() {
    if (phaserGame) return;
    
    const config = {
        type: Phaser.AUTO,
        parent: 'game-container',
        width: 680,
        height: 680,
        scene: GameScene, 
        transparent: true,
        fps: { target: 60, forceSetTimeOut: true }
    };

    phaserGame = new Phaser.Game(config);
    console.log("Phaser запущен");
}

// Обработка кнопок
document.addEventListener('DOMContentLoaded', () => {
    // Если кнопки в HTML имеют id, привязываем их тут
    const btnTake = document.getElementById('btn-take-loot');
    if (btnTake) btnTake.onclick = () => window.takeLoot();
});
