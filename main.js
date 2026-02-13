import { GameScene } from "./phaser/GameScene.js";
import { appState, refreshUI } from "./game/appState.js";
import { SLOT_NAMES, ADJECTIVES } from "./data/constants.js";

let phaserGame;

window.startGame = (key) => {
    console.log("Запуск игры для класса:", key);
    const menu = document.getElementById('menu-overlay');
    if (menu) menu.style.display = 'none';

    const baseStats = { 
        'warrior': {hp:1600, atk:25, agi:5}, 
        'mage': {hp:800, atk:65, agi:2}, 
        'archer': {hp:1000, atk:40, agi:18}, 
        'assassin': {hp:900, atk:55, agi:14} 
    };

    const base = baseStats[key] || baseStats['warrior'];
    const imgKey = key === 'assassin' ? 'assasin' : key;
    
    // Инициализация состояния игрока
    appState.player = { 
        job: key.toUpperCase(), 
        key: key, 
        hp: base.hp, 
        maxHp: base.hp, 
        armor: 0, 
        maxArmor: 0, 
        mana: 0, 
        gold: 0, 
        level: 1, 
        baseAtk: base.atk, 
        baseAgi: base.agi, 
        equip: { weapon: { n: "Старая палка", atk: 12, arm: 0, agi: 0, rar: 0 } } 
    };
    
    const portrait = document.getElementById('p-portrait');
    if (portrait) portrait.style.backgroundImage = `url('assets/hero_${imgKey}.jpg')`;
    
    initPhaser(); 
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
    
    const mPortrait = document.getElementById('m-portrait');
    if (mPortrait) mPortrait.style.backgroundImage = `url('assets/monster_goblin.jpg')`; 
    
    appState.turn = "PLAYER"; 
    appState.lootActive = false; 
    
    // Если сцена уже создана, разблокируем её
    if (phaserGame) {
        const scene = phaserGame.scene.getScene('GameScene');
        if (scene && scene.unlock) scene.unlock();
    }
    
    refreshUI();
}

function initPhaser() {
    if (phaserGame) return;
    const config = {
        type: Phaser.AUTO,
        parent: 'game-container',
        width: 680,
        height: 680,
        scene: GameScene, // Передаем класс
        transparent: true,
        fps: { target: 60, forceSetTimeOut: true }
    };
    phaserGame = new Phaser.Game(config);
}

// Привязка UI кнопок
window.takeLoot = () => {
    if (appState.currentLoot) {
        appState.player.equip[appState.currentLoot.slot] = appState.currentLoot;
        appState.player.armor = appState.player.maxArmor;
    }
    closeLoot();
};

window.sellLoot = () => {
    appState.player.gold += 50;
    closeLoot();
};

function closeLoot() {
    const lootOverlay = document.getElementById('loot-overlay');
    if (lootOverlay) lootOverlay.style.display = 'none';
    appState.player.level++;
    spawnMob();
}

document.getElementById('btn-ultra').onclick = () => {
    const scene = phaserGame.scene.getScene('GameScene');
    if (scene) scene.useUltra();
};
document.getElementById('btn-take-loot').onclick = () => window.takeLoot();
document.getElementById('btn-sell-loot').onclick = () => window.sellLoot();
