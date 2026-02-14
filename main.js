/**
 * TAVERNA WAR - CORE SKELETON
 * Жесткая привязка к ассетам из папки assets/
 */

const TILE_SIZE = 80;
const GRID_SIZE = 8;
// Названия файлов строго по твоему скриншоту
const TYPES = ['rune_red', 'rune_blue', 'rune_green', 'rune_purple', 'rune_yellow'];

window.app = {
    player: null,
    mob: null,
    turn: "PLAYER",
    log: (msg, type) => {
        const log = document.getElementById('battle-log');
        if (!log) return;
        const color = {p: '#4f4', m: '#f44', crit: '#a4f', sys: '#ffd700'}[type] || '#ccc';
        log.innerHTML = `<div style="color:${color}; margin-bottom:5px;">> ${msg}</div>` + log.innerHTML;
    }
};

// Функция запуска
window.startGame = function(heroType) {
    console.log("Игра запущена для класса:", heroType);

    // 1. Скрываем меню выбора (принудительно через style, если класс hidden не сработал)
    const menu = document.getElementById('menu-overlay');
    if (menu) {
        menu.style.display = 'none'; 
    }

    // 2. Установка портрета (исправлено написание assasin с одной 's' под твой HTML)
    const imgName = heroType === 'assassin' ? 'hero_assasin.jpg' : `hero_${heroType}.jpg`;
    const pPort = document.getElementById('p-portrait');
    if (pPort) pPort.style.backgroundImage = `url('assets/${imgName}')`;

    // 3. Данные игрока и моба
    window.app.player = {
        hp: 1000, maxHp: 1000, mana: 0, armor: 50, maxArmor: 100,
        atk: 30, gold: 0, dodge: 5
    };

    window.app.mob = {
        name: "ГРУНТ ГОРНЫЙ", hp: 600, maxHp: 600, atk: 20
    };

    updateUI();
    initPhaser();
};

function updateUI() {
    const p = window.app.player;
    const m = window.app.mob;
    if(!p || !m) return;

    const setW = (id, val) => { const e = document.getElementById(id); if(e) e.style.width = val + '%'; };
    const setT = (id, txt) => { const e = document.getElementById(id); if(e) e.innerText = txt; };

    setW('p-hp-f', (p.hp / p.maxHp * 100));
    setT('p-hp-t', `${Math.ceil(p.hp)} / ${p.maxHp}`);
    setW('p-mn-f', p.mana);
    setT('p-mn-t', `МАНА: ${p.mana}%`);
    setW('p-arm-f', (p.armor / p.maxArmor * 100));
    setT('p-arm-t', `БРОНЯ: ${p.armor} / ${p.maxArmor}`);
    
    setT('stat-atk', p.atk);
    setT('stat-dodge', p.dodge + '%');
    setT('gold-val', `${p.gold} 💰`);

    const btn = document.getElementById('btn-ultra');
    if(btn) btn.className = (p.mana >= 100) ? 'btn-ultra ready' : 'btn-ultra';

    setW('m-hp-f', (m.hp / m.maxHp * 100));
    setT('m-hp-t', `${Math.ceil(m.hp)} / ${m.maxHp}`);
}

function initPhaser() {
    // Удаляем старую канву, если она была (защита от дублей)
    const container = document.getElementById('game-container');
    if (container) container.innerHTML = '';

    const config = {
        type: Phaser.AUTO,
        parent: 'game-container',
        width: GRID_SIZE * TILE_SIZE,
        height: GRID_SIZE * TILE_SIZE,
        transparent: true,
        scene: GameScene
    };
    new Phaser.Game(config);
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        // Загрузка рун строго по списку файлов в твоей папке assets
        TYPES.forEach(t => {
            this.load.image(t, `assets/${t}.png`);
        });
    }

    create() {
        this.grid = [];
        this.isAnimating = false;
        this.selectedTile = null;

        for (let r = 0; r < GRID_SIZE; r++) {
            this.grid[r] = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                this.spawnTile(r, c);
            }
        }
    }

    spawnTile(r, c, fromTop = false) {
        const type = Phaser.Utils.Array.GetRandom(TYPES);
        const x = c * TILE_SIZE + TILE_SIZE / 2;
        const y = fromTop ? -TILE_SIZE : r * TILE_SIZE + TILE_SIZE / 2;

        const container = this.add.container(x, y);
        const img = this.add.image(0, 0, type).setDisplaySize(70, 70);
        
        container.add(img);
        container.type = type;
        container.gridR = r;
        container.gridC = c;

        img.setInteractive();
        img.on('pointerdown', () => this.handleSelect(container));

        this.grid[r][c] = container;
        if (fromTop) {
            this.tweens.add({ targets: container, y: r * TILE_SIZE + TILE_SIZE / 2, duration: 300 });
        }
    }

    async handleSelect(tile) {
        if (this.isAnimating || window.app.turn !== "PLAYER") return;
        if (!this.selectedTile) {
            this.selectedTile = tile;
            tile.setScale(1.1);
        } else {
            const dist = Math.abs(this.selectedTile.gridR - tile.gridR) + Math.abs(this.selectedTile.gridC - tile.gridC);
            if (dist === 1) {
                await this.swapTiles(this.selectedTile, tile);
                const matches = this.checkMatches();
                if (matches.length > 0) {
                    await this.handleMatches(matches);
                    this.time.delayedCall(500, () => this.mobTurn());
                } else {
                    await this.swapTiles(this.selectedTile, tile);
                }
            }
            if(this.selectedTile) this.selectedTile.setScale(1);
            this.selectedTile = null;
        }
    }

    async swapTiles(t1, t2) {
        this.isAnimating = true;
        const r1 = t1.gridR, c1 = t1.gridC, r2 = t2.gridR, c2 = t2.gridC;
        this.grid[r1][c1] = t2; this.grid[r2][c2] = t1;
        t1.gridR = r2; t1.gridC = c2; t2.gridR = r1; t2.gridC = c1;
        return new Promise(res => {
            this.tweens.add({ targets: t1, x: c2*TILE_SIZE+TILE_SIZE/2, y: r2*TILE_SIZE+TILE_SIZE/2, duration: 200 });
            this.tweens.add({ targets: t2, x: c1*TILE_SIZE+TILE_SIZE/2, y: r1*TILE_SIZE+TILE_SIZE/2, duration: 200, onComplete: () => { this.isAnimating = false; res(); } });
        });
    }

    checkMatches() {
        let matched = new Set();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE - 2; c++) {
                let t1 = this.grid[r][c], t2 = this.grid[r][c+1], t3 = this.grid[r][c+2];
                if (t1 && t2 && t3 && t1.type === t2.type && t2.type === t3.type) {
                    matched.add(t1); matched.add(t2); matched.add(t3);
                }
            }
        }
        for (let c = 0; c < GRID_SIZE; c++) {
            for (let r = 0; r < GRID_SIZE - 2; r++) {
                let t1 = this.grid[r][c], t2 = this.grid[r+1][c], t3 = this.grid[r+2][c];
                if (t1 && t2 && t3 && t1.type === t2.type && t2.type === t3.type) {
                    matched.add(t1); matched.add(t2); matched.add(t3);
                }
            }
        }
        return Array.from(matched);
    }

    async handleMatches(matches) {
        const p = window.app.player;
        matches.forEach(t => {
            if (t.type === 'rune_red') window.app.mob.hp -= p.atk;
            if (t.type === 'rune_blue') p.mana = Math.min(100, p.mana + 5);
            if (t.type === 'rune_green') p.hp = Math.min(p.maxHp, p.hp + 15);
            if (t.type === 'rune_yellow') p.gold += 10;
            if (t.type === 'rune_purple') p.armor = Math.min(p.maxArmor, p.armor + 10);
            this.grid[t.gridR][t.gridC] = null;
            t.destroy();
        });
        updateUI();
        await this.dropTiles();
        const next = this.checkMatches();
        if (next.length > 0) await this.handleMatches(next);
    }

    async dropTiles() {
        for (let c = 0; c < GRID_SIZE; c++) {
            let empty = 0;
            for (let r = GRID_SIZE - 1; r >= 0; r--) {
                if (!this.grid[r][c]) empty++;
                else if (empty > 0) {
                    let tile = this.grid[r][c];
                    this.grid[r + empty][c] = tile;
                    this.grid[r][c] = null;
                    tile.gridR = r + empty;
                    this.tweens.add({ targets: tile, y: tile.gridR * TILE_SIZE + TILE_SIZE / 2, duration: 200 });
                }
            }
            for (let i = 0; i < empty; i++) this.spawnTile(i, c, true);
        }
        await new Promise(res => this.time.delayedCall(300, res));
    }

    mobTurn() {
        if (!window.app.mob || window.app.mob.hp <= 0) { window.app.log("ПОБЕДА!", 'sys'); return; }
        const dmg = window.app.mob.atk;
        window.app.player.hp -= dmg;
        window.app.log(`Враг наносит ${dmg} урона!`, 'm');
        updateUI();
    }
}

// Глобальная функция для кнопки ульты
window.useUltra = function() {
    if(!window.app.player || window.app.player.mana < 100) return;
    window.app.player.mana = 0;
    window.app.mob.hp -= (window.app.player.atk * 3);
    window.app.log("УЛЬТРАУДАР!", 'crit');
    updateUI();
};
