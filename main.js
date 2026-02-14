import { appState, log, refreshUI } from "./game/appState.js";
import { GameScene } from "./phaser/GameScene.js";
import { adjs, slotNames } from "./data/constants.js";

// --- ИНИЦИАЛИЗАЦИЯ ИГРЫ ---
window.startGame = function(key) {
    document.getElementById('menu-overlay').style.display = 'none';
    const baseStats = { 
        'warrior': { hp: 1600, atk: 25, agi: 5 }, 
        'mage':    { hp: 800,  atk: 65, agi: 2 }, 
        'archer':  { hp: 1000, atk: 40, agi: 18 }, 
        'assassin':{ hp: 900,  atk: 55, agi: 14 } 
    };
    const base = baseStats[key];
    const imgKey = key === 'assassin' ? 'assasin' : key;

    appState.player = { 
        job: key.toUpperCase(), 
        key: key, 
        hp: base.hp, maxHp: base.hp, 
        armor: 0, maxArmor: 0, mana: 0, gold: 0, level: 1, 
        baseAtk: base.atk, baseAgi: base.agi, 
        equip: { 
            weapon: { n: "Старая палка", atk: 12, arm: 0, agi: 0, rar: 0 } 
        } 
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

// --- МОНСТРЫ ---
window.spawnMob = function() {
    let lvl = appState.player.level;
    appState.mob = { 
        name: "Гоблин Ур." + lvl, 
        hp: 200 + (lvl * 100), maxHp: 200 + (lvl * 100), 
        atk: 20 + (lvl * 10), mana: 0 
    };
    
    document.getElementById('m-name').innerText = appState.mob.name;
    document.getElementById('m-portrait').style.backgroundImage = `url('assets/monster_goblin.jpg')`; 
    appState.turn = "PLAYER"; 
    appState.lootActive = false; 
    
    refreshUI();
    log(`Появился ${appState.mob.name}!`, 'sys');
};

// --- СИСТЕМА ЛУТА ---
window.showLootScreen = function() {
    appState.lootActive = true;
    appState.currentLoot = generateLoot();
    
    const loot = appState.currentLoot;
    const old = appState.player.equip[loot.slot] || { n: "Пусто", atk: 0, arm: 0, agi: 0, rar: 0 };
    
    document.getElementById('loot-compare').innerHTML = `
        <div style="background:#222; padding:10px; border:1px solid #444;">
            <div style="font-size:10px; color:#aaa;">ТЕКУЩИЙ:</div>
            <b style="color:var(--rar${old.rar})">${old.n}</b><br>
            <small>⚔️${old.atk} 🛡️${old.arm} 💨${old.agi}</small>
        </div>
        <div style="background:#222; padding:10px; border:1px solid var(--gold);">
            <div style="font-size:10px; color:#aaa;">НОВЫЙ:</div>
            <b style="color:var(--rar${loot.rar})">${loot.n}</b><br>
            <small>⚔️${loot.atk} 🛡️${loot.arm} 💨${loot.agi}</small>
        </div>
    `;
    document.getElementById('loot-overlay').style.display = 'flex';
};

function generateLoot() {
    const slots = Object.keys(slotNames);
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const rar = Math.random() > 0.95 ? 3 : Math.random() > 0.8 ? 2 : Math.random() > 0.5 ? 1 : 0;
    const power = (10 + appState.player.level * 8) * (1 + rar * 0.5);
    
    return { 
        slot, 
        rar, 
        n: `${adjs[Math.floor(Math.random() * adjs.length)]} ${slotNames[slot]}`, 
        atk: Math.floor(slot === 'weapon' || slot === 'ring' ? power : power / 4), 
        arm: Math.floor(slot === 'body' || slot === 'head' ? power * 2 : power / 3), 
        agi: Math.floor(Math.random() * 5 * (rar + 1)) 
    };
}

window.takeLoot = function() {
    const loot = appState.currentLoot;
    appState.player.equip[loot.slot] = loot;
    appState.player.armor = appState.player.maxArmor; // Восполняем броню при смене экипировки
    closeLoot();
};

window.sellLoot = function() {
    appState.player.gold += 50;
    log("Трофей продан за 50💰", "sys");
    closeLoot();
};

function closeLoot() {
    document.getElementById('loot-overlay').style.display = 'none';
    appState.player.level++;
    window.spawnMob();
}

// --- СУПЕРСПОСОБНОСТИ ---
window.useUltra = async function() {
    const p = appState.player;
    const scene = window.gameScene; // Ссылка на текущую сцену Phaser

    if(p.mana < 100 || appState.lootActive || !scene || scene.isAnimating) return;

    p.mana = 0;
    log(`УЛЬТА: ${p.job}!`, 'crit');

    let toExplode = [];
    const key = p.key;

    if(key === 'warrior') {
        toExplode = scene.grid.flat().filter(t => t && (t.type === 'red' || t.type === 'green'));
    } else if(key === 'mage') {
        toExplode = scene.grid.flat().filter(t => t && (t.type === 'purple' || t.type === 'yellow'));
    } else if(key === 'archer') {
        // Выбираем 4 случайных ряда
        for(let i=0; i<4; i++) {
            let r = Math.floor(Math.random() * 8);
            for(let c=0; c<8; c++) if(scene.grid[r][c]) toExplode.push(scene.grid[r][c]);
        }
    } else if(key === 'assassin') {
        // Взрываем 20 случайных плиток и бьем по лицу
        toExplode = Phaser.Utils.Array.Shuffle(scene.grid.flat().filter(t => t)).slice(0, 20);
        appState.mob.hp -= (p.baseAtk * 2);
    }

    if(toExplode.length > 0) {
        await scene.explode([...new Set(toExplode)]);
        await scene.refill();
        await scene.check();
    }
    
    refreshUI();
};
