import { appState, log, refreshUI } from "./game/appState.js";
import { GameScene } from "./phaser/GameScene.js";
import { adjs, slotNames } from "./data/constants.js";

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let currentLoot = null;

// --- ИНИЦИАЛИЗАЦИЯ ИГРЫ ---
// Экспортируем функцию в window, чтобы HTML её видел
window.startGame = function(key) {
    const overlay = document.getElementById('menu-overlay');
    if (overlay) overlay.style.display = 'none';
    
    const baseStats = { 
        'warrior': { hp: 1600, atk: 25, agi: 5 }, 
        'mage':    { hp: 800,  atk: 65, agi: 2 }, 
        'archer':  { hp: 1000, atk: 40, agi: 18 }, 
        'assassin':{ hp: 900,  atk: 55, agi: 14 } 
    };
    
    const base = baseStats[key];
    const imgKey = key === 'assassin' ? 'assasin' : key;

    // Заполняем состояние игрока
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
        equip: { 
            weapon: { n: "Старая палка", atk: 12, arm: 0, agi: 0, rar: 0 } 
        } 
    };
    
    // Установка портрета
    const portrait = document.getElementById('p-portrait');
    if (portrait) portrait.style.backgroundImage = `url('assets/hero_${imgKey}.jpg')`;
    
    // Запуск Phaser
    window.phaserGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game-container',
        width: 680,
        height: 680,
        scene: GameScene,
        transparent: true
    });

    // Важно: спавним моба ПОСЛЕ инициализации игрока
    spawnMob();
};

// --- МОНСТРЫ ---
function spawnMob() {
    if (!appState.player) return;

    let lvl = appState.player.level;
    appState.mob = { 
        name: "Гоблин Ур." + lvl, 
        hp: 200 + (lvl * 100), 
        maxHp: 200 + (lvl * 100), 
        atk: 20 + (lvl * 10), 
        mana: 0 
    };

    const mName = document.getElementById('m-name');
    const mPortrait = document.getElementById('m-portrait');
    
    if (mName) mName.innerText = appState.mob.name;
    if (mPortrait) mPortrait.style.backgroundImage = `url('assets/monster_goblin.jpg')`;
    
    appState.turn = "PLAYER";
    appState.lootActive = false;
    
    // Даем Phaser время на загрузку перед логом
    setTimeout(() => {
        refreshUI();
        log(`Появился ${appState.mob.name}!`, 'sys');
    }, 100);
}

// --- СИСТЕМА ЛУТА ---
window.showLootScreen = function() {
    appState.lootActive = true;
    currentLoot = generateLoot();
    
    let old = appState.player.equip[currentLoot.slot] || { n: "Пусто", atk: 0, arm: 0, agi: 0, rar: 0 };
    
    const compareBox = document.getElementById('loot-compare');
    if (compareBox) {
        compareBox.innerHTML = `
            <div style="background:#222; padding:10px; border: 1px solid #444;">
                <div style="font-size:10px; color:#888;">ТЕКУЩИЙ ПРЕДМЕТ:</div>
                <b style="color:var(--rar${old.rar})">${old.n}</b><br>
                ⚔️${old.atk} 🛡️${old.arm} 💨${old.agi}
            </div>
            <div style="background:#222; padding:10px; border: 1px solid var(--gold);">
                <div style="font-size:10px; color:var(--gold);">НОВЫЙ ТРОФЕЙ:</div>
                <b style="color:var(--rar${currentLoot.rar})">${currentLoot.n}</b><br>
                ⚔️${currentLoot.atk} 🛡️${currentLoot.arm} 💨${currentLoot.agi}
            </div>
        `;
    }
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
    appState.player.equip[currentLoot.slot] = currentLoot;
    appState.player.armor = appState.player.maxArmor; 
    closeLoot();
};

window.sellLoot = function() {
    appState.player.gold += 50;
    log("Предмет продан за 50 золотых", "sys");
    closeLoot();
};

function closeLoot() {
    document.getElementById('loot-overlay').style.display = 'none';
    appState.player.level++;
    spawnMob();
}

// --- СУПЕРСПОСОБНОСТИ (УЛЬТА) ---
window.useUltra = async function() {
    const p = appState.player;
    if (!p || p.mana < 100 || appState.lootActive) return;
    
    const scene = window.gameScene; 
    if (!scene || scene.isAnimating) return;

    p.mana = 0;
    log(`УЛЬТА: ${p.job}!`, 'crit');
    
    let toExplode = [];
    const gridFlat = scene.grid.flat().filter(t => t);

    if (p.key === 'warrior') {
        toExplode = gridFlat.filter(t => t.type === 'red' || t.type === 'green');
    } else if (p.key === 'mage') {
        toExplode = gridFlat.filter(t => t.type === 'purple' || t.type === 'yellow');
    } else if (p.key === 'archer') {
        for(let i=0; i<4; i++) {
            let r = Math.floor(Math.random() * 8);
            for(let c=0; c<8; c++) if(scene.grid[r][c]) toExplode.push(scene.grid[r][c]);
        }
    } else if (p.key === 'assassin') {
        toExplode = Phaser.Utils.Array.Shuffle(gridFlat).slice(0, 20);
        appState.mob.hp -= (p.baseAtk * 2);
    }

    if (toExplode.length > 0) {
        await scene.explodeUnique([...new Set(toExplode)]);
        await scene.refill();
        await scene.check();
    }
    
    refreshUI();
};
