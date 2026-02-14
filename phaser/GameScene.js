import { TILE_S, VISUAL_S, BG_COLORS } from "../data/constants.js";
import { appState, refreshUI } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() { 
        super('GameScene'); 
        this.isAnimating = false;
        this.selectedTile = null;
    }

    preload() {
        ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => {
            this.load.image(`t_${c}`, `assets/rune_${c}.png`);
        });
    }

    create() {
        this.grid = [];
        // Генерируем начальную сетку 8x8
        for (let r = 0; r < 8; r++) {
            this.grid[r] = [];
            for (let c = 0; c < 8; c++) {
                this.spawnTile(r, c);
            }
        }
    }

    spawnTile(r, c, fromTop = false) {
        const types = ['red', 'blue', 'green', 'purple', 'yellow'];
        const type = Phaser.Utils.Array.GetRandom(types);
        const x = c * TILE_S + TILE_S / 2;
        const y = fromTop ? -TILE_S : r * TILE_S + TILE_S / 2;

        const container = this.add.container(x, y);
        
        // Фон
        const bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type] || 0x444444, 1);
        bg.fillRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 12);

        // Иконка
        const img = this.add.image(0, 0, `t_${type}`);
        img.setDisplaySize(VISUAL_S * 0.8, VISUAL_S * 0.8);

        // Рамка выделения
        const frame = this.add.graphics();
        frame.lineStyle(4, 0xffffff, 1);
        frame.strokeRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
        frame.setVisible(false);

        container.add([bg, img, frame]);
        container.type = type;
        container.gridR = r;
        container.gridC = c;
        container.frame = frame;

        // Интерактив
        const hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0, 0).setInteractive();
        hitArea.on('pointerdown', () => this.handlePointer(container));
        container.add(hitArea);

        this.grid[r][c] = container;

        if (fromTop) {
            this.tweens.add({
                targets: container,
                y: r * TILE_S + TILE_S / 2,
                duration: 400,
                ease: 'Back.easeOut'
            });
        }
        return container;
    }

    async handlePointer(tile) {
        if (this.isAnimating || appState.turn !== "PLAYER") return;

        if (!this.selectedTile) {
            this.selectedTile = tile;
            tile.frame.setVisible(true);
            tile.setScale(1.1);
        } else {
            const t1 = this.selectedTile;
            const t2 = tile;
            t1.frame.setVisible(false);
            t1.setScale(1);
            this.selectedTile = null;

            if (t1 === t2) return;

            const dist = Math.abs(t1.gridR - t2.gridR) + Math.abs(t1.gridC - t2.gridC);
            if (dist === 1) {
                this.isAnimating = true;
                await this.swapTiles(t1, t2);
                
                const matches = this.findMatches();
                if (matches.length > 0) {
                    await this.processAllMatches();
                    appState.turn = "MOB";
                    this.time.delayedCall(500, () => this.mobAI());
                } else {
                    await this.swapTiles(t1, t2); // Возврат если нет матча
                    this.isAnimating = false;
                }
            }
        }
    }

    async swapTiles(t1, t2) {
        const r1 = t1.gridR, c1 = t1.gridC, r2 = t2.gridR, c2 = t2.gridC;
        this.grid[r1][c1] = t2; this.grid[r2][c2] = t1;
        t1.gridR = r2; t1.gridC = c2; t2.gridR = r1; t2.gridC = c1;

        return new Promise(res => {
            this.tweens.add({
                targets: t1, x: c2 * TILE_S + TILE_S / 2, y: r2 * TILE_S + TILE_S / 2,
                duration: 250, ease: 'Quad.easeInOut'
            });
            this.tweens.add({
                targets: t2, x: c1 * TILE_S + TILE_S / 2, y: r1 * TILE_S + TILE_S / 2,
                duration: 250, ease: 'Quad.easeInOut', onComplete: res
            });
        });
    }

    findMatches() {
        let matched = new Set();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 6; c++) {
                let t1 = this.grid[r][c], t2 = this.grid[r][c+1], t3 = this.grid[r][c+2];
                if (t1 && t2 && t3 && t1.type === t2.type && t1.type === t2.type && t1.type === t3.type) {
                    matched.add(t1); matched.add(t2); matched.add(t3);
                }
            }
        }
        for (let c = 0; c < 8; c++) {
            for (let r = 0; r < 6; r++) {
                let t1 = this.grid[r][c], t2 = this.grid[r+1][c], t3 = this.grid[r+2][c];
                if (t1 && t2 && t3 && t1.type === t2.type && t1.type === t3.type) {
                    matched.add(t1); matched.add(t2); matched.add(t3);
                }
            }
        }
        return Array.from(matched);
    }

    async processAllMatches() {
        let matches = this.findMatches();
        while (matches.length > 0) {
            const counts = {};
            matches.forEach(t => {
                counts[t.type] = (counts[t.type] || 0) + 1;
                this.grid[t.gridR][t.gridC] = null;
            });

            await new Promise(res => {
                this.tweens.add({
                    targets: matches, scale: 0, alpha: 0, duration: 300,
                    onComplete: () => { matches.forEach(t => t.destroy()); res(); }
                });
            });

            this.applyEffects(counts);
            await this.refillGrid();
            matches = this.findMatches();
        }
        this.isAnimating = false;
    }

    async refillGrid() {
        let promises = [];
        for (let c = 0; c < 8; c++) {
            let empty = 0;
            for (let r = 7; r >= 0; r--) {
                if (this.grid[r][c] === null) empty++;
                else if (empty > 0) {
                    const t = this.grid[r][c];
                    this.grid[r+empty][c] = t; this.grid[r][c] = null;
                    t.gridR = r + empty;
                    promises.push(new Promise(res => {
                        this.tweens.add({ targets: t, y: t.gridR * TILE_S + TILE_S / 2, duration: 300, onComplete: res });
                    }));
                }
            }
            for (let i = 0; i < empty; i++) {
                const nt = this.spawnTile(i, c, true);
                nt.y = -(empty - i) * TILE_S;
            }
        }
        if (promises.length > 0) await Promise.all(promises);
    }

    applyEffects(counts) {
        const p = appState.player, m = appState.mob;
        if (counts.red) m.hp -= counts.red * p.baseAtk;
        if (counts.blue) p.mana = Math.min(100, p.mana + counts.blue * 5);
        if (counts.green) p.hp = Math.min(p.maxHp, p.hp + counts.green * 10);
        refreshUI();
    }

    mobAI() {
        if (!appState.mob || appState.mob.hp <= 0) return;
        appState.player.hp -= appState.mob.atk;
        appState.turn = "PLAYER";
        refreshUI();
        console.log("🤖 Моб атаковал!");
    }
}
