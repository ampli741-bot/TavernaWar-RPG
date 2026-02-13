import { GameScene } from "./phaser/GameScene.js";
import { appState, refreshUI } from "./game/appState.js";
import { SLOT_NAMES, ADJECTIVES } from "./data/constants.js";

let phaserGame;

window.startGame = (key) => {
    document.getElementById('menu-overlay').style.display = 'none';
    const base = { 'warrior':{hp:1600,atk:25,agi:5}, 'mage':{hp:800,atk:65,agi:2}, 'archer':{hp:1000,atk:40,agi:18}, 'assassin':{hp:900,atk:55,agi:14} }[key];
    const imgKey = key === 'assassin' ? 'assasin' : key;
    
    appState.player = { 
        job:key.toUpperCase(), key, hp:base.hp, maxHp:base.hp, 
        armor:0, maxArmor:0, mana:0, gold:0, level:1, 
        baseAtk:base.atk, baseAgi:base.agi, 
        equip: { weapon:{n:"Старая палка",atk:12,arm:0,agi:0,rar:0} } 
    };
    
    document.getElementById('p-portrait').style.backgroundImage = `url('assets/hero_${imgKey}.jpg')`;
    initPhaser(); 
    spawnMob();
};

export function spawnMob() {
    let lvl = appState.player.level;
    appState.mob = { name: "Гоблин Ур."+lvl, hp: 200+(lvl*100), maxHp: 200+(lvl*100), atk: 20+(lvl*10), mana: 0 };
    document.getElementById('m-portrait').style.backgroundImage = `url('assets/monster_goblin.jpg')`; 
    appState.turn = "PLAYER"; 
    appState.lootActive = false; 
    refreshUI();
}

function initPhaser() {
    if (phaserGame) return;
    phaserGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game-container',
        width: 680,
        height: 680,
        scene: GameScene,
        transparent: true
    });
}

// Логика лута
window.takeLoot = () => {
    appState.player.equip[appState.currentLoot.slot] = appState.currentLoot;
    appState.player.armor = appState.player.maxArmor;
    closeLoot();
};

window.sellLoot = () => {
    appState.player.gold += 50;
    closeLoot();
};

function closeLoot() {
    document.getElementById('loot-overlay').style.display = 'none';
    appState.player.level++;
    spawnMob();
}

// Привязка кнопок UI
document.getElementById('btn-ultra').onclick = () => {
    const scene = phaserGame.scene.keys.GameScene;
    if (scene) scene.useUltra();
};
document.getElementById('btn-take-loot').onclick = () => window.takeLoot();
document.getElementById('btn-sell-loot').onclick = () => window.sellLoot();
