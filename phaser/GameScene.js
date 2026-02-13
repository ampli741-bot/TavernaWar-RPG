import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS, SLOT_NAMES, ADJECTIVES } from "../data/constants.js";
import { appState, refreshUI } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => 
            this.load.image(`t_${c}`, `assets/rune_${c}.png`)
        );
    }

    create() {
        window.gameScene = this; 
        this.grid = [];
        this.isAnimating = false;
        this.sel = null;

        for (let r = 0; r < 8; r++) {
            this.grid[r] = [];
            for (let c = 0; c < 8; c++) this.spawnTile(r, c);
        }

        this.input.on('gameobjectover', (ptr, obj) => { if (obj.container) obj.container.setHover(true); });
        this.input.on('gameobjectout', (ptr, obj) => { if (obj.container) obj.container.setHover(false); });
    }

    spawnTile(r, c, fromTop = false) {
        let types = ['red', 'blue', 'green', 'purple', 'yellow'];
        let type = Phaser.Utils.Array.GetRandom(types);
        let x = c * TILE_S + TILE_S / 2;
        let y = fromTop ? -TILE_S : r * TILE_S + TILE_S / 2;

        let container = this.add.container(x, y);

        let glow = this.add.graphics();
        glow.fillStyle(GLOW_COLORS[type], 0.4);
        glow.fillRoundedRect(-VISUAL_S / 2 - 2, -VISUAL_S / 2 - 2, VISUAL_S + 4, VISUAL_S + 4, 14);

        let bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type], 1);
        bg.fillRoundedRect(-VISUAL_S / 2, -VISUAL_S / 2, VISUAL_S, VISUAL_S, 12);

        let img = this.add.image(0, 0, `t_${type}`);
        let zoom = (type === 'red' || type === 'blue' || type === 'purple') ? 2.15 : 1.5;
        img.setDisplaySize(VISUAL_S * zoom, VISUAL_S * zoom);

        let frame = this.add.graphics();
        frame.lineStyle(4, 0x444444, 1);
        frame.strokeRoundedRect(-VISUAL_S / 2, -VISUAL_S / 2, VISUAL_S, VISUAL_S, 10);

        let hoverGlow = this.add.graphics().setAlpha(0);
        hoverGlow.lineStyle(4, 0xffffff, 1);
        hoverGlow.strokeRoundedRect(-VISUAL_S / 2 - 4, -VISUAL_S / 2 - 4, VISUAL_S + 8, VISUAL_S + 8, 14);

        let ghostGlow = this.add.graphics().setAlpha(0);
        ghostGlow.lineStyle(8, 0xffffff, 0.6);
        ghostGlow.strokeRoundedRect(-VISUAL_S / 2 - 2, -VISUAL_S / 2 - 2, VISUAL_S + 4, VISUAL_S + 4, 12);

        container.add([glow, bg, img, frame, hoverGlow, ghostGlow]);
        container.gridR = r; container.gridC = c; container.type = type;
        container.hoverGlow = hoverGlow;
        container.ghostGlow = ghostGlow;

        let hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0x000000, 0).setInteractive();
        hitArea.container = container;
        container.add(hitArea);
        hitArea.on('pointerdown', () => this.handlePointer(container));

        container.setHover = (val) => {
            this.tweens.add({ targets: hoverGlow, alpha: val ? 0.6 : 0, duration: 200 });
        };

        container.setGhost = (val) => {
            if (val) {
                container.ghostGlow.alpha = 1;
                container.ghostPulse = this.tweens.add({
                    targets: container.ghostGlow,
                    alpha: 0.2, scale: 1.05, duration: 600, yoyo: true, repeat: -1
                });
            } else {
                if (container.ghostPulse) container.ghostPulse.stop();
                container.ghostGlow.alpha = 0;
                container.ghostGlow.scale = 1;
            }
        };

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
        if (this.isAnimating || appState.turn !== "PLAYER" || appState.lootActive) return;

        if (!this.sel) {
            this.sel = t;
            t.setGhost(true);
            t.setScale(1.1);
        } else {
            let t1 = this.sel, t2 = t;
            if (t1 === t2) {
                t1.setGhost(false); t1.setScale(1); this.sel = null;
                return;
            }

            if (Math.abs(t1.gridR - t2.gridR) + Math.abs(t1.gridC - t2.gridC) === 1) {
                this.isAnimating = true;
                t1.setGhost(false); t1.setScale(1);
                
                // Пробуем поменять
                await this.swap(t1, t2);
                let matches = this.findMatches();
                
                if (matches.length > 0) {
                    await this.check();
                    appState.turn = "MOB";
                    this.time.delayedCall(600, () => this.mobAI());
                } else {
                    // Возвращаем если нет совпадений
                    await this.swap(t1, t2);
                    this.isAnimating = false;
                }
            } else {
                t1.setGhost(false); t1.setScale(1);
                this.sel = t2;
                t2.setGhost(true); t2.setScale(1.1);
            }
            if (!this.isAnimating) this.sel = null;
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
        let match = new Set();
        // Горизонтальные
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 6; c++) {
                let t1 = this.grid[r][c], t2 = this.grid[r][c+1], t3 = this.grid[r][c+2];
                if (t1 && t2 && t3 && t1.type === t2.type && t1.type === t3.type) {
                    match.add(t1); match.add(t2); match.add(t3);
                }
            }
        }
        // Вертикальные
        for (let c = 0; c < 8; c++) {
            for (let r = 0; r < 6; r++) {
                let t1 = this.grid[r][c], t2 = this.grid[r+1][c], t3 = this.grid[r+2][c];
                if (t1 && t2 && t3 && t1.type === t2.type && t1.type === t3.type) {
                    match.add(t1); match.add(t2); match.add(t3);
                }
            }
        }
        return Array.from(match);
    }

    async check() {
        let match = this.findMatches();
        if (match.length > 0) {
            this.isAnimating = true;
            await this.explodeUnique(match);
            await this.refill();
            await this.check();
        } else {
            this.isAnimating = false;
        }
    }

    async explodeUnique(unique) {
        let counts = { red: 0, blue: 0, green: 0, purple: 0, yellow: 0 };
        unique.forEach(t => {
            counts[t.type]++;
            this.grid[t.gridR][t.gridC] = null;
            // Частицы
            let color = GLOW_COLORS[t.type];
            for(let i=0; i<6; i++) {
                let p = this.add.rectangle(t.x, t.y, 6, 6, color);
                this.tweens.add({
                    targets: p, alpha: 0, scale: 0,
                    x: t.x + Phaser.Math.Between(-40, 40), y: t.y + Phaser.Math.Between(-40, 40),
                    duration: 400, onComplete: () => p.destroy()
                });
            }
        });

        return new Promise(res => {
            this.tweens.add({
                targets: unique, scale: 0, alpha: 0, duration: 200,
                onComplete: () => {
                    unique.forEach(t => t.destroy());
                    this.applySummaryEffect(counts);
                    res();
                }
            });
        });
    }

    async refill() {
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
                        this.tweens.add({ 
                            targets: t, 
                            y: t.gridR * TILE_S + TILE_S / 2, 
                            duration: 300, 
                            onComplete: res 
                        });
                    }));
                }
            }
            for (let i = 0; i < empty; i++) {
                let t = this.spawnTile(i, c, true);
                t.y = -TILE_S * (i + 1); // Улучшенное появление сверху
            }
        }
        await Promise.all(promises);
        await new Promise(r => this.time.delayedCall(150, r));
    }

    // ... (остальные методы applySummaryEffect, mobAI, useUltra, showLootScreen оставляем без изменений)
}
