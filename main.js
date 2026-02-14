import { appState, log, refreshUI } from "./game/appState.js";
import { GameScene } from "./phaser/GameScene.js";
import { adjs, slotNames } from "./data/constants.js";

window.startGame = function(key) {
    document.getElementById('menu-overlay').style.display = 'none';
    const baseStats = { 
        'warrior':{hp:1600,atk:25,agi:5}, 
        'mage':{hp:800,atk:65,agi:2}, 
        'archer':{hp:1000,atk:40,agi:18}, 
        'assassin':{hp:900,atk:55,agi:14} 
    };
    const base = baseStats[key];
    const imgKey = key === 'assassin' ? 'assasin' : key;

    appState.player = { 
        job:key.toUpperCase(), key, hp:base.hp, maxHp:base.hp, 
        armor:0, maxArmor:0, mana:0, gold:0, level:1, 
        baseAtk:base.atk, baseAgi:base.agi, 
        equip: { weapon:{n:"Старая палка",atk:12,arm:0,agi:0,rar:0} } 
    };

    document.getElementById('p-portrait').style.backgroundImage = `url('assets/hero_${imgKey}.jpg')`;
    
    if (window.phaserGame) window.phaserGame.destroy(true);
    window.phaserGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game-container',
        width: 680, height: 680,
        scene: GameScene,
        transparent: true
    });

    window.spawnMob();
};

window.spawnMob = function() {
    let lvl = appState.player.level;
    appState.mob = { name: "Гоблин Ур."+lvl, hp: 200+(lvl*100), maxHp: 200+(lvl*100), atk: 20+(lvl*10), mana: 0 };
    document.getElementById('m-portrait').style.backgroundImage = `url('assets/monster_goblin.jpg')`; 
    appState.turn = "PLAYER"; 
    appState.lootActive = false; 
    refreshUI();
};

// Пропиши глобально функции для кнопок в HTML
window.useUltra = () => { /* твоя логика ульты */ };
window.takeLoot = () => { /* твоя логика взять лут */ };
window.sellLoot = () => { /* твоя логика продать */ };
