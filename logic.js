// =========================================================
// LOGIC.JS: СЕРДЦЕ ТВОЕЙ ИГРЫ (GOTHIC EDITION)
// =========================================================

const TILE_S = 85; 
const TILE_P = 4; 
const VISUAL_S = TILE_S - (TILE_P * 2); 

let phaserGame, scene, currentLoot = null;

// Названия и настройки для генерации предметов
const adjs = ["Древний", "Мифический", "Проклятый", "Тёмный", "Вечный", "Стальной", "Святой", "Забытый", "Ледяной", "Кровавый"];
const slotNames = { weapon: "Оружие", body: "Доспех", legs: "Поножи", head: "Шлем", ring: "Перстень", necklace: "Амулет", hands: "Перчатки" };

// Цвета рун для Phaser
const BG_COLORS = { red: 0x3d0a0a, blue: 0x0a1a2f, green: 0x0a240a, purple: 0x220a35, yellow: 0x2d2405 };

window.app = { 
    player: null, 
    mob: null, 
    lootActive: false, 
    turn: "PLAYER",
    
    // Логирование боя (вывод в правую панель)
    log: (msg, type) => {
        const log = document.getElementById('battle-log');
        if (!log) return;
        const entry = document.createElement('div');
        entry.style.color = type==='p'?'#4f4':type==='m'?'#f44':type==='crit'?'#aa44ff':'#ffd700';
        entry.innerText = `> ${msg}`;
        log.prepend(entry);
    },

    // Основной хук обновления состояния
    onStep: () => {
        if (window.app.player.hp <= 0) {
            alert("Герой пал в пещере...");
            location.reload();
        }
    },

    onShopClick: () => { 
        window.app.log('Торговец еще не пришел в это подземелье', 'sys'); 
    }
};

/**
 * Инициализация игрока при выборе персонажа
 */
function startGame(key) {
    document.getElementById('menu-overlay').style.display = 'none';
    
    // Базовые статы классов
    const base = { 
        'warrior': {hp:1600, atk:25, agi:5}, 
        'mage':    {hp:800,  atk:65, agi:2}, 
        'archer':  {hp:1000, atk:40, agi:18}, 
        'assassin':{hp:900,  atk:55, agi:14} 
    }[key];

    window.app.player = { 
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

    // Установка портрета в "пещерную" рамку
    const pPort = document.getElementById('p-portrait');
    pPort.style.backgroundImage = `url('assets/hero_${key}.jpg')`;
    pPort.style.backgroundSize = 'cover';

    initPhaser(); 
    spawnMob(); 
    refreshUI();
}

/**
 * Создание врага
 */
function spawnMob() {
    let lvl = window.app.player.level;
    window.app.mob = { 
        name: "Гоблин-разведчик", 
        hp: 200 + (lvl * 100), 
        maxHp: 200 + (lvl * 100), 
        atk: 20 + (lvl * 10), 
        mana: 0 
    };
    
    const mPort = document.getElementById('m-portrait');
    mPort.style.backgroundImage = `url('assets/monster_goblin.jpg')`; 
    
    window.app.turn = "PLAYER"; 
    window.app.lootActive = false; 
    refreshUI();
}

/**
 * Синхронизация данных игрока с HTML элементами (те самые бары и цифры с фото)
 */
function refreshUI() {
    if(!window.app.player) return;
    const p = window.app.player; 
    const m = window.app.mob;

    // Считаем бонусы от экипировки
    let gearAtk=0, gearArm=0, gearAgi=0, invH = "";
    for(let s in slotNames) { 
        let i = p.equip[s]; 
        if(i) { gearAtk += i.atk; gearArm += i.arm; gearAgi += i.agi; }
        let color = i ? `var(--rar${i.rar})` : '#444';
        invH += `<div class="inv-item" style="border-left: 4px solid ${color}">
                    <b>${slotNames[s]}:</b> ${i ? i.n : '---'} 
                    <span style="float:right; opacity:0.6;">${i ? '⚔️'+i.atk : ''}</span>
                 </div>`;
    }
    
    p.maxArmor = gearArm;

    // Обновляем текстовые значения и полоски (как на скриншоте)
    document.getElementById('p-hp-t').innerText = `${Math.floor(p.hp)} / ${p.maxHp}`;
    document.getElementById('p-hp-f').style.width = (p.hp / p.maxHp * 100) + '%';
    
    document.getElementById('p-arm-t').innerText = `Броня: ${Math.floor(p.armor)} / ${p.maxArmor}`;
    document.getElementById('p-arm-f').style.width = p.maxArmor > 0 ? (p.armor / p.maxArmor * 100) + '%' : '0%';
    
    document.getElementById('p-mn-t').innerText = `Мана: ${p.mana}%`;
    document.getElementById('p-mn-f').style.width = p.mana + '%';

    // Кнопка СУПЕРУДАР
    const ultraBtn = document.getElementById('btn-ultra');
    if (p.mana >= 100) ultraBtn.classList.add('ready');
    else ultraBtn.classList.remove('ready');

    // Нижние статы
    document.getElementById('stat-atk').innerText = p.baseAtk + gearAtk;
    document.getElementById('stat-dodge').innerText = Math.min(60, p.baseAgi + gearAgi) + "%";
    document.getElementById('gold-val').innerText = p.gold;

    // Статы врага
    document.getElementById('m-hp-t').innerText = `${Math.floor(m.hp)} / ${m.maxHp}`;
    document.getElementById('m-hp-f').style.width = (m.hp / m.maxHp * 100) + '%';
    
    document.getElementById('inv-box').innerHTML = invH;
}

// ... (Далее идет код Phaser Scene, который мы обсуждали ранее)
// Он остается внутри logic.js для управления полем боя.

function initPhaser() {
    phaserGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game-container',
        width: 680,
        height: 680,
        transparent: true, // Чтобы видеть пещеру за рунами
        scene: GameScene
    });
}

class GameScene extends Phaser.Scene {
    // Весь класс GameScene переносим сюда без изменений механики
    // (preload, create, spawnTile, handlePointer, swap, findMatches, explodeUnique, refill, mobAI)
    // Я не дублирую его здесь полностью, чтобы не загромождать, 
    // но он должен быть в этом файле.
}
