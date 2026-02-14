// --- Инициализация игры ---
window.startGame = (heroType) => {
    // Проверяем, загружен ли Phaser и GameScene
    if (typeof Phaser === 'undefined') {
        console.error("Phaser не загружен!");
        return;
    }

    const config = {
        type: Phaser.AUTO,
        parent: 'game-container',
        width: 680,
        height: 680,
        // GameScene должна быть объявлена глобально в GameScene.js или подключена в HTML выше
        scene: window.GameScene, 
        transparent: true,
        physics: { default: 'arcade' }
    };

    window.phaserGame = new Phaser.Game(config);
    
    // Скрываем меню, показываем интерфейс
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('ui-left').classList.remove('hidden');
    document.getElementById('ui-right').classList.remove('hidden');
    
    console.log("Игра запущена за класс:", heroType);
};

// --- Система ЛУТА ---
window.showLootScreen = () => {
    if (typeof appState !== 'undefined') appState.lootActive = true;
    const container = document.getElementById('loot-container');
    if (!container) return;
    
    const list = document.getElementById('loot-list');
    list.innerHTML = '';
    
    const items = [
        { id: 'sword', name: 'Стальной меч', slot: 'weapon', stat: { atk: 5 }, text: '+5 к атаке' },
        { id: 'shield', name: 'Кожаный щит', slot: 'armor', stat: { def: 3 }, text: '+3 к броне' },
        { id: 'pendant', name: 'Амулет маны', slot: 'pendant', stat: { mp: 20 }, text: '+20 макс. маны' }
    ];

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'loot-item';
        div.innerHTML = `<strong>${item.name}</strong><br><small>${item.text}</small>`;
        div.onclick = () => pickLoot(item);
        list.appendChild(div);
    });
    
    container.classList.remove('hidden');
};

function pickLoot(item) {
    console.log("Выбран лут:", item.name);
    document.getElementById('loot-container').classList.add('hidden');
    if (typeof appState !== 'undefined') {
        appState.lootActive = false;
        // Здесь можно добавить логику обновления статов в appState
    }
}

// --- Суперспособности (Ульта) ---
window.useAbility = (type) => {
    // Берем сцену напрямую из Phaser
    const scene = window.phaserGame ? window.phaserGame.scene.scenes[0] : null;
    
    if (!scene || scene.isAnimating) return;

    if (type === 'strike') {
        console.log("Используем УДАР");
        // Логика взрыва плиток в GameScene
        if (scene.handleUltimate) scene.handleUltimate('red');
    } else if (type === 'heal') {
        console.log("Используем ЛЕЧЕНИЕ");
        if (typeof appState !== 'undefined') {
            appState.player.hp = Math.min(appState.player.maxHp, appState.player.hp + 50);
            if (window.refreshUI) window.refreshUI();
        }
    }
};

// Запуск начального UI
window.addEventListener('load', () => {
    console.log("Main.js загружен и готов");
});
