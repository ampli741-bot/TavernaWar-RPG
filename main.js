import { GameScene } from "./phaser/GameScene.js";
import { appState, refreshUI, log } from "./game/appState.js";
import { slotNames } from "./data/constants.js";

// --- Инициализация игры ---
window.startGame = () => {
    const config = {
        type: Phaser.AUTO,
        parent: 'game-container',
        width: 680,
        height: 680,
        scene: GameScene,
        transparent: true,
        physics: { default: 'arcade' }
    };
    window.phaserGame = new Phaser.Game(config);
    
    // Скрываем меню, показываем интерфейс
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
};

// --- Система ЛУТА ---
window.showLootScreen = () => {
    appState.lootActive = true;
    const container = document.getElementById('loot-container');
    const list = document.getElementById('loot-list');
    list.innerHTML = '';
    
    // Генерируем 3 случайных предмета
    for(let i=0; i<3; i++) {
        const item = generateRandomItem();
        const div = document.createElement('div');
        div.className = 'loot-item';
        div.innerHTML = `
            <img src="assets/items/${item.type}.png" onerror="this.src='assets/rune_yellow.png'">
            <div class="loot-info">
                <strong>${item.name}</strong><br>
                <small>${item.statText}</small>
            </div>
        `;
        div.onclick = () => pickLoot(item);
        list.appendChild(div);
    }
    container.classList.remove('hidden');
};

function generateRandomItem() {
    const types = [
        { id: 'sword', name: 'Стальной меч', slot: 'weapon', stat: { atk: 5 }, text: '+5 к атаке' },
        { id: 'shield', name: 'Кожаный щит', slot: 'armor', stat: { def: 3 }, text: '+3 к броне' },
        { id: 'pendant', name: 'Амулет маны', slot: 'pendant', stat: { mp: 20 }, text: '+20 макс. маны' }
    ];
    return types[Math.floor(Math.random() * types.length)];
}

function pickLoot(item) {
    // Экипируем предмет
    appState.player.equip[item.slot] = item.stat;
    
    // Обновляем статы игрока на основе экипировки
    if(item.slot === 'armor') appState.player.armor += item.stat.def;
    
    log(`Экипировано: ${item.name}`, 'crit');
    
    // Возвращаем игру в строй
    appState.lootActive = false;
    document.getElementById('loot-container').classList.add('hidden');
    
    // Спавним нового моба
    spawnNewMob();
}

function spawnNewMob() {
    appState.mob.hp = 100;
    appState.mob.maxHp = 100;
    appState.mob.atk += 2; // Моб становится сильнее
    log("Появился новый враг!", "m");
    refreshUI();
}

// --- Суперспособности (Ульта) ---
window.useAbility = (type) => {
    const p = appState.player;
    const scene = window.gameScene;

    if (!scene || scene.isAnimating || appState.turn !== "PLAYER") return;

    if (type === 'strike' && p.mana >= 40) {
        p.mana -= 40;
        log("УЛЬТА: Огненный шквал!", "crit");
        
        // Взрываем все красные плитки на поле
        const redTiles = [];
        scene.grid.forEach(row => row.forEach(tile => {
            if (tile && tile.type === 'red') redTiles.push(tile);
        }));
        
        if (redTiles.length > 0) {
            scene.explode(redTiles).then(() => scene.refill());
        }
    } 
    else if (type === 'heal' && p.mana >= 30) {
        p.mana -= 30;
        p.hp = Math.min(p.maxHp, p.hp + 50);
        log("МАГИЯ: Исцеление +50 HP", "p");
    }
    else {
        log("Недостаточно маны!", "m");
    }
    
    refreshUI();
};

// --- Вспомогательные функции для UI ---
window.toggleInventory = () => {
    const inv = document.getElementById('inventory-screen');
    inv.classList.toggle('hidden');
};

// Запуск при загрузке
window.addEventListener('load', () => {
    refreshUI();
});
