import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS, SLOT_NAMES, ADJECTIVES } from "../data/constants.js";
import { appState, refreshUI } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() { 
        super('GameScene'); 
    }

    preload() {
        ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => 
            this.load.image(`t_${c}`, `assets/rune_${c}.png`)
        );
    }

    create() {
        this.grid = [];
        this.isAnimating = false;
        this.sel = null;

        // Генерация начальной сетки
        for (let r = 0; r < 8; r++) {
            this.grid[r] = [];
            for (let c = 0; c < 8; c++) {
                this.spawnTile(r, c);
            }
        }
        console.log("GameScene: Сетка создана");
    }

    spawnTile(r, c, fromTop = false) {
        let types = ['red', 'blue', 'green', 'purple', 'yellow'];
        let type = Phaser.Utils.Array.GetRandom(types);
        let x = c * TILE_S + TILE_S / 2;
        let y = fromTop ? -TILE_S : r * TILE_S + TILE_S / 2;

        let container = this.add.container(x, y);

        // Визуальные слои
        let bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type] || 0x333333, 1);
        bg.fillRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 12);

        let img = this.add.image(0, 0, `t_${type}`);
        let zoom = (type === 'red' || type === 'blue' || type === 'purple') ? 2.15 : 1.5;
        img.setDisplaySize(VISUAL_S * zoom, VISUAL_S * zoom);

        let ghost = this.add.graphics().setAlpha(0);
        ghost.lineStyle(6, 0xffffff, 0.6);
        ghost.strokeRoundedRect(-VISUAL_S/2 - 2, -VISUAL_S/2 - 2, VISUAL_S + 4, VISUAL_S + 4, 12);

        container.add([bg, img, ghost]);
        container.gridR = r;
        container.gridC = c;
        container.type = type;
        container.ghost = ghost;

        let hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0, 0).setInteractive();
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

    async handlePointer(t) {
        if (this.isAnimating || appState.turn !== "PLAYER") return;

        if (!this.sel) {
            this.sel = t;
            t.ghost.setAlpha(1);
            t.setScale(1.1);
        } else {
            let t1 = this.sel;
            let t2 = t;
            t1.ghost.setAlpha(0);
            t1.setScale(1);
            this.sel = null;

            if (t1 === t2) return;

            let dist = Math.abs(t1.gridR - t2.gridR) + Math.abs(t1.gridC - t2.gridC);
            if (dist === 1) {
                this.isAnimating = true;
                await this.swap(t1, t2);
                
                let matches = this.findMatches();
                if (matches.length > 0) {
                    await this.processSequence();
                    appState.turn = "MOB";
                    this.time.delayedCall(600, () => this.mobAI());
                } else {
                    await this.swap(t1, t2); // Возврат
                    this.isAnimating = false;
                }
            }
        }
    }

    async swap(t1, t2) {
        let r1 = t1.gridR, c1 = t1.gridC, r2 = t2.gridR, c2 = t2.gridC;
        this.grid[r1][c1] = t2; this.grid[r2][c2] = t1;
        t1.gridR = r2; t1.gridC = c2; t2.gridR = r1; t2.gridC = c1;

        return new Promise(res => {
            this.tweens.add({ targets: t1, x: c2 * TILE_S + TILE_S / 2, y: r2 * TILE_S + TILE_S / 2, duration: 200 });
            this.tweens.add({ targets: t2, x: c1 * TILE_S + TILE_S / 2, y: r1 * TILE_S + TILE_S / 2, duration: 200, onComplete: res });
        });
    }

    findMatches() {
        let matched = new Set();
        // Ряды
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 6; c++) {
                let t1 = this.grid[r][c], t2 = this.grid[r][c+1], t3 = this.grid[r][c+2];
                if (t1 && t2 && t3 && t1.type === t2.type && t1.type === t3.type) {
                    matched.add(t1); matched.add(t2); matched.add(t3);
                }
            }
        }
        // Столбцы
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

    async processSequence() {
        let matches = this.findMatches();
        while (matches.length > 0) {
            await this.explode(matches);
            await this.fillGaps();
            matches = this.findMatches();
        }
        this.isAnimating = false;
    }

    async explode(matches) {
        let counts = { red: 0, blue: 0, green: 0, purple: 0, yellow: 0 };
        matches.forEach(t => {
            counts[t.type]++;
            this.grid[t.gridR][t.gridC] = null;
        });

        return new Promise(res => {
            this.tweens.add({
                targets: matches, scale: 0, alpha: 0, duration: 250,
                onComplete: () => {
                    matches.forEach(t => t.destroy());
                    this.applySummaryEffect(counts);
                    res();
                }
            });
        });
    }

    async fillGaps() {
        let promises = [];
        for (let c = 0; c < 8; c++) {
            let empty = 0;
            for (let r = 7; r >= 0; r--) {
                if (this.grid[r][c] === null) empty++;
                else if (empty > 0) {
                    let t = this.grid[r][c];
                    this.grid[r + empty][c] = t;
                    this.grid[r][c] = null;
                    t.gridR = r + empty;
                    promises.push(new Promise(res => {
                        this.tweens.add({ targets: t, y: t.gridR * TILE_S + TILE_S / 2, duration: 300, onComplete: res });
                    }));
                }
            }
            for (let i = 0; i < empty; i++) {
                let t = this.spawnTile(i, c, true);
                t.y = -TILE_S * (empty - i);
            }
        }
        await Promise.all(promises);
    }

    applySummaryEffect(counts) {
        let p = appState.player, m = appState.mob;
        if (appState.turn === "PLAYER") {
            if (counts.red > 0) m.hp -= (p.baseAtk * counts.red);
            if (counts.blue > 0) p.mana = Math.min(100, p.mana + counts.blue * 5);
        } else {
            let dmg = counts.red * 10;
            p.hp -= dmg;
        }
        refreshUI();
    }

    unlock() {
        this.isAnimating = false;
    }

    async mobAI() {
        if (appState.mob.hp <= 0) return;
        // Упрощенный AI: просто имитируем ход
        this.time.delayedCall(1000, () => {
            appState.turn = "PLAYER";
            this.isAnimating = false;
            refreshUI();
        });
    }
}
