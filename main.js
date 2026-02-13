import { GameScene } from "./phaser/GameScene.js";
import { appState, refreshUI } from "./game/appState.js";

let phaserGame;

window.startGame = (key) => {
    // 1. Скрываем меню выбора
    const menu = document.getElementById('menu-overlay');
    if (menu) menu.style.display = 'none';

    // 2. Инициализация параметров героя
    const stats = {
        'warrior': {hp:1600, atk:25, agi:5},
        'mage': {hp:800, atk:65, agi:2},
        'archer': {hp:1000, atk:40, agi:18},
        'assassin': {hp:900, atk:55, agi:14}
    };

    const base = stats[key] || stats['warrior'];
    const imgKey = key === 'assassin' ? 'assasin' : key;
    
    appState.player = {
        job: key.toUpperCase(),
        key: key,
        hp: base.hp, maxHp: base.hp,
        armor: 0, maxArmor: 0, mana: 0, gold: 0, level: 1,
        baseAtk: base.atk, baseAgi: base.agi,
        equip: { weapon: { n: "Старая палка", atk: 12, arm: 0, agi: 0, rar: 0 } }
    };

    // Обновляем портрет в UI
    const portrait = document.getElementById('p-portrait');
    if (portrait) portrait.style.backgroundImage = `url('assets/hero_${imgKey}.jpg')`;

    // 3. Запуск Phaser
    initPhaser();
    
    // 4. Спавн первого врага
    spawnMob();
};

export function spawnMob() {
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
        parent: 'game-container', // Убедитесь, что этот ID есть в index.html
        width: 680,
        height: 680,
        scene: GameScene, 
        transparent: true,
        fps: { target: 60, forceSetTimeOut: true }
    };

    phaserGame = new Phaser.Game(config);
}

// Привязка кнопок лута (если они уже есть в DOM)
document.addEventListener('DOMContentLoaded', () => {
    const btnTake = document.getElementById('btn-take-loot');
    const btnSell = document.getElementById('btn-sell-loot');
    if (btnTake) btnTake.onclick = () => window.takeLoot();
    if (btnSell) btnSell.onclick = () => window.sellLoot();
});
