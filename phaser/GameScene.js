import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS } from "../data/constants.js";
import { appState, refreshUI, log } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() { 
        super('GameScene'); 
        this.isAnimating = false;
        this.sel = null;
    }

    preload() {
        ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => {
            this.load.image(`t_${c}`, `assets/rune_${c}.png`);
        });
    }

    create() {
        window.gameScene = this; // Для доступа из main.js (ульта)
        this.grid = [];
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

        // Свечение (Glow)
        const glow = this.add.graphics();
        glow.fillStyle(GLOW_COLORS[type], 0.4);
        glow.fillRoundedRect(-VISUAL_S/2 - 2, -VISUAL_S/2 - 2, VISUAL_S + 4, VISUAL_S + 4, 14);

        // Фон плитки
        const bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type], 1);
        bg.fillRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 12);

        // Иконка руны
        const img = this.add.image(0, 0, `t_${type}`);
        const zoom = (type === 'red' || type === 'blue' || type === 'purple') ? 2.15 : 1.5;
        img.setDisplaySize(VISUAL_S * zoom, VISUAL_S * zoom);
        if (type === 'yellow') img.y += 4;

        // Маска (чтобы не вылезало за края)
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRoundedRect(x - VISUAL_S/2, y - VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
        img.setMask(maskShape.createGeometryMask());

        // Рамка (Gothic Frame)
        const frame = this.add.graphics();
        frame.lineStyle(6, 0x444444, 1);
        frame.strokeRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 10);

        // Эффект выделения (Ghost Glow)
        const ghostGlow = this.add.graphics();
        ghostGlow.alpha = 0;
        ghostGlow.lineStyle(8, 0xffffff, 0.6);
        ghostGlow.strokeRoundedRect(-VISUAL_S/2 - 2, -VISUAL_S/2 - 2, VISUAL_S + 4, VISUAL_S + 4, 12);

        container.add([glow, bg, img, frame, ghostGlow]);
        container.type = type;
        container.gridR = r;
        container.gridC = c;
        container.ghostGlow = ghostGlow;
        container.maskShape = maskShape;

        // Интерактив
        const hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0, 0).setInteractive();
        hitArea.on('pointerdown', () => this.handlePointer(container));
        container.add(hitArea);

        // Пульсация (дыхание плитки)
        this.tweens.add({
            targets: container,
            scale: 1.03,
            duration: 800 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.grid[r][c] = container;
        if (fromTop) {
            this.tweens.add({ targets: container, y: r * TILE_S + TILE_S / 2, duration: 400 });
        }
        return container;
    }

    update() {
        // Обновление позиции маски при движении плиток
        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                let t = this.grid[r][c];
                if(t && t.maskShape) {
                    t.maskShape.clear();
                    t.maskShape.fillStyle(0xffffff);
                    t.maskShape.fillRoundedRect(t.x - VISUAL_S/2, t.y - VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
                }
            }
        }
    }

    async handlePointer(t) {
        if (this.isAnimating || appState.turn !== "PLAYER") return;

        if (!this.sel) {
            this.sel = t;
            t.ghostGlow.alpha = 1;
            t.setScale(1.15);
        } else {
            const t1 = this.sel;
            const t2 = t;
            t1.ghostGlow.alpha = 0;
            t1.setScale(1);
            this.sel = null;

            if (t1 === t2) return;

            const dist = Math.abs(t1.gridR - t2.gridR) + Math.abs(t1.gridC - t2.gridC);
            if (dist === 1) {
                this.isAnimating = true;
                await this.swap(t1, t2);
                const hasMatches = await this.check();
                
                if (hasMatches) {
                    appState.turn = "MOB";
                    this.time.delayedCall(800, () => this.mobAI());
                } else {
                    await this.swap(t1, t2); // Назад если нет мачта
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
        let match = [];
        for(let r=0; r<8; r++) 
            for(let c=0; c<6; c++) 
                if(this.grid[r][c] && this.grid[r][c+1] && this.grid[r][c+2] && 
                   this.grid[r][c].type === this.grid[r][c+1].type && 
                   this.grid[r][c].type === this.grid[r][c+2].type) 
                   match.push(this.grid[r][c], this.grid[r][c+1], this.grid[r][c+2]);

        for(let c=0; c<8; c++) 
            for(let r=0; r<6; r++) 
                if(this.grid[r][c] && this.grid[r+1][c] && this.grid[r+2][c] && 
                   this.grid[r][c].type === this.grid[r+1][c].type && 
                   this.grid[r][c].type === this.grid[r+2][c].type) 
                   match.push(this.grid[r][c], this.grid[r+1][c], this.grid[r+2][c]);
        
        return [...new Set(match)];
    }

    async check() {
        let match = this.findMatches();
        if (match.length > 0) {
            await this.explodeUnique(match);
            await this.refill();
            await this.check();
            return true;
        }
        return false;
    }

    async explodeUnique(unique) {
        this.isAnimating = true;
        let counts = { red: 0, blue: 0, green: 0, purple: 0, yellow: 0 };

        unique.forEach(t => {
            counts[t.type]++;
            // Частицы взрыва
            for(let i=0; i<6; i++) {
                let p = this.add.rectangle(t.x, t.y, 6, 6, GLOW_COLORS[t.type]);
                this.tweens.add({
                    targets: p,
                    x: t.x + Phaser.Math.Between(-40, 40),
                    y: t.y + Phaser.Math.Between(-40, 40),
                    alpha: 0, scale: 0, duration: 400, onComplete: () => p.destroy()
                });
            }
        });

        return new Promise(res => {
            this.tweens.add({
                targets: unique, scale: 0, alpha: 0, duration: 250,
                onComplete: () => {
                    unique.forEach(t => { 
                        this.grid[t.gridR][t.gridC] = null; 
                        t.destroy(); 
                    });
                    this.applyEffects(counts);
                    res();
                }
            });
        });
    }

    applyEffects(counts) {
        const p = appState.player;
        const m = appState.mob;
        let totalDmg = p.baseAtk * (counts.red || 0) + (p.baseAtk * 1.5 * (counts.purple || 0));
        
        if (totalDmg > 0) {
            m.hp -= Math.floor(totalDmg);
            log(`Атака: -${Math.floor(totalDmg)}`, 'p');
        }
        if (counts.blue) {
            p.mana = Math.min(100, p.mana + counts.blue * 5);
            log(`Мана: +${counts.blue * 5}%`, 'sys');
        }
        if (counts.green) {
            p.hp = Math.min(p.maxHp, p.hp + counts.green * 15);
            log(`Лечение: +${counts.green * 15}`, 'p');
        }
        
        refreshUI();
        if (m.hp <= 0) window.showLootScreen(); 
    }

    async refill() {
        for (let c = 0; c < 8; c++) {
            let empty = 0;
            for (let r = 7; r >= 0; r--) {
                if (!this.grid[r][c]) empty++;
                else if (empty > 0) {
                    let t = this.grid[r][c];
                    this.grid[r + empty][c] = t;
                    this.grid[r][c] = null;
                    t.gridR = r + empty;
                    this.tweens.add({ targets: t, y: t.gridR * TILE_S + TILE_S / 2, duration: 250 });
                }
            }
            for (let i = 0; i < empty; i++) this.spawnTile(i, c, true);
        }
        await new Promise(r => this.time.delayedCall(300, r));
    }

    async mobAI() {
        if (appState.mob.hp <= 0) return;
        // Простое ИИ: наносит урон и передает ход
        log(`Враг атакует!`, 'm');
        appState.player.hp -= appState.mob.atk;
        appState.turn = "PLAYER";
        this.isAnimating = false;
        refreshUI();
    }
}
