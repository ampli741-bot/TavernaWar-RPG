import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS } from "../data/constants.js";
import { appState, refreshUI, log } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() { 
        super('GameScene'); 
        this.isAnimating = false;
        this.sel = null;
    }

    preload() {
        // Загрузка ассетов рун
        ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => {
            this.load.image(`t_${c}`, `assets/rune_${c}.png`);
        });
    }

    create() {
        window.gameScene = this; // Для связи с main.js (ульта)
        this.grid = [];
        
        // Генерация начальной сетки
        for (let r = 0; r < 8; r++) {
            this.grid[r] = [];
            for (let c = 0; c < 8; c++) {
                this.spawnTile(r, c);
            }
        }

        // Слушатели событий наведения (Hover)
        this.input.on('gameobjectover', (ptr, obj) => { if(obj.container) obj.container.setHover(true); });
        this.input.on('gameobjectout', (ptr, obj) => { if(obj.container) obj.container.setHover(false); });
    }

    spawnTile(r, c, fromTop = false) {
        const types = ['red', 'blue', 'green', 'purple', 'yellow'];
        const type = Phaser.Utils.Array.GetRandom(types);
        const x = c * TILE_S + TILE_S / 2;
        const y = fromTop ? -TILE_S : r * TILE_S + TILE_S / 2;

        const container = this.add.container(x, y);

        // 1. Фоновое свечение (Glow)
        const glow = this.add.graphics();
        glow.fillStyle(GLOW_COLORS[type], 0.4);
        glow.fillRoundedRect(-VISUAL_S/2 - 2, -VISUAL_S/2 - 2, VISUAL_S + 4, VISUAL_S + 4, 14);

        // 2. Основной фон плитки
        const bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type], 1);
        bg.fillRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 12);

        // 3. Иконка руны
        const img = this.add.image(0, 0, `t_${type}`);
        const zoom = (type === 'red' || type === 'blue' || type === 'purple') ? 2.15 : 1.5;
        img.setDisplaySize(VISUAL_S * zoom, VISUAL_S * zoom);
        if (type === 'yellow') img.y += 4;

        // 4. Маска
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRoundedRect(x - VISUAL_S/2, y - VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
        img.setMask(maskShape.createGeometryMask());

        // 5. Тройная готическая рамка (как в оригинале)
        const frame = this.add.graphics();
        frame.lineStyle(6, 0x444444, 1);
        frame.strokeRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 10);
        frame.lineStyle(2, 0x666666, 0.8);
        frame.strokeRoundedRect(-VISUAL_S/2 + 2, -VISUAL_S/2 + 2, VISUAL_S - 4, VISUAL_S - 4, 8);
        frame.lineStyle(1.5, 0xbc962c, 0.4);
        frame.strokeRoundedRect(-VISUAL_S/2 + 8, -VISUAL_S/2 + 8, VISUAL_S - 16, VISUAL_S - 16, 6);

        // 6. Ховер и Призрачное свечение
        const hoverGlow = this.add.graphics();
        hoverGlow.alpha = 0;
        hoverGlow.lineStyle(4, 0xffffff, 1);
        hoverGlow.strokeRoundedRect(-VISUAL_S/2 - 4, -VISUAL_S/2 - 4, VISUAL_S + 8, VISUAL_S + 8, 14);

        const ghostGlow = this.add.graphics();
        ghostGlow.alpha = 0;
        ghostGlow.lineStyle(8, 0xffffff, 0.6);
        ghostGlow.strokeRoundedRect(-VISUAL_S/2 - 2, -VISUAL_S/2 - 2, VISUAL_S + 4, VISUAL_S + 4, 12);

        container.add([glow, bg, img, frame, hoverGlow, ghostGlow]);
        
        container.type = type;
        container.gridR = r;
        container.gridC = c;
        container.maskShape = maskShape;
        container.hoverGlow = hoverGlow;
        container.ghostGlow = ghostGlow;

        // Интерактивность
        const hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0, 0).setInteractive();
        hitArea.container = container;
        container.add(hitArea);
        hitArea.on('pointerdown', () => this.handlePointer(container));

        // Методы визуальных эффектов
        container.setHover = (val) => {
            this.tweens.add({ targets: hoverGlow, alpha: val ? 0.6 : 0, duration: 200 });
        };

        container.setGhost = (val) => {
            if (val) {
                container.ghostGlow.alpha = 1;
                container.ghostPulse = this.tweens.add({
                    targets: container.ghostGlow,
                    alpha: 0.2, scale: 1.05, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                });
            } else {
                if (container.ghostPulse) container.ghostPulse.stop();
                container.ghostGlow.alpha = 0;
                container.ghostGlow.scale = 1;
            }
        };

        // Дыхание плитки
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
        // Перерисовка маски при движении
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
        if (this.isAnimating || appState.turn !== "PLAYER" || appState.lootActive) return;

        if (!this.sel) {
            this.sel = t;
            t.setGhost(true);
            t.setScale(1.15);
        } else {
            const t1 = this.sel;
            const t2 = t;
            t1.setGhost(false);
            t1.setScale(1);
            this.sel = null;

            if (t1 === t2) return;

            const dist = Math.abs(t1.gridR - t2.gridR) + Math.abs(t1.gridC - t2.gridC);
            if (dist === 1) {
                if (this.checkPotentialMatch(t1, t2)) {
                    await this.swap(t1, t2);
                    await this.check();
                    appState.turn = "MOB";
                    this.time.delayedCall(800, () => this.mobAI());
                } else {
                    this.tweens.add({ targets: [t1, t2], x: "+=5", yoyo: true, duration: 50 });
                }
            }
        }
    }

    checkPotentialMatch(t1, t2) {
        let r1 = t1.gridR, c1 = t1.gridC, r2 = t2.gridR, c2 = t2.gridC;
        this.grid[r1][c1] = t2; this.grid[r2][c2] = t1;
        let hasMatch = this.findMatches().length > 0;
        this.grid[r1][c1] = t1; this.grid[r2][c2] = t2;
        return hasMatch;
    }

    async swap(t1, t2) {
        this.isAnimating = true;
        let r1 = t1.gridR, c1 = t1.gridC, r2 = t2.gridR, c2 = t2.gridC;
        this.grid[r1][c1] = t2; this.grid[r2][c2] = t1;
        t1.gridR = r2; t1.gridC = c2; t2.gridR = r1; t2.gridC = c1;

        return new Promise(res => {
            this.tweens.add({ targets: t1, x: c2 * TILE_S + TILE_S / 2, y: r2 * TILE_S + TILE_S / 2, duration: 200 });
            this.tweens.add({ targets: t2, x: c1 * TILE_S + TILE_S / 2, y: r1 * TILE_S + TILE_S / 2, duration: 200, onComplete: () => {
                this.isAnimating = false;
                res();
            }});
        });
    }

    findMatches() {
        let match = [];
        for(let r=0; r<8; r++) 
            for(let c=0; c<6; c++) 
                if(this.grid[r][c] && this.grid[r][c+1] && this.grid[r][c+2] && 
                   this.grid[r][c].type === this.grid[r][c+1].type && this.grid[r][c].type === this.grid[r][c+2].type) 
                   match.push(this.grid[r][c], this.grid[r][c+1], this.grid[r][c+2]);

        for(let c=0; c<8; c++) 
            for(let r=0; r<6; r++) 
                if(this.grid[r][c] && this.grid[r+1][c] && this.grid[r+2][c] && 
                   this.grid[r][c].type === this.grid[r+1][c].type && this.grid[r][c].type === this.grid[r+2][c].type) 
                   match.push(this.grid[r][c], this.grid[r+1][c], this.grid[r+2][c]);
        
        return match;
    }

    async check() {
        let match = this.findMatches();
        if (match.length > 0) {
            await this.explodeUnique([...new Set(match)]);
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
            if (!t || !t.scene) return;
            counts[t.type]++;
            for(let i=0; i<8; i++) {
                let rect = this.add.rectangle(t.x, t.y, 8, 8, GLOW_COLORS[t.type]);
                this.tweens.add({
                    targets: rect,
                    x: t.x + Phaser.Math.Between(-50, 50), y: t.y + Phaser.Math.Between(-50, 50),
                    alpha: 0, scale: 0, duration: 500, onComplete: () => rect.destroy()
                });
            }
        });

        return new Promise(res => {
            this.tweens.add({
                targets: unique, scale: 0, alpha: 0, duration: 250,
                onComplete: () => {
                    unique.forEach(t => { 
                        if(t && t.scene) { this.grid[t.gridR][t.gridC] = null; t.destroy(); }
                    });
                    this.applySummaryEffect(counts);
                    res();
                }
            });
        });
    }

    applySummaryEffect(counts) {
        const p = appState.player;
        const m = appState.mob;
        let unitAtk = p.baseAtk;
        // Добавляем урон от экипировки
        for(let s in p.equip) if(p.equip[s]) unitAtk += p.equip[s].atk;

        if (appState.turn === "PLAYER") {
            if(counts.red) { m.hp -= unitAtk * counts.red; log(`Урон: -${unitAtk * counts.red}`, 'p'); }
            if(counts.purple) { m.hp -= Math.floor(unitAtk * 1.5) * counts.purple; log(`Крит: -${Math.floor(unitAtk * 1.5) * counts.purple}`, 'crit'); }
            if(counts.blue) { p.mana = Math.min(100, p.mana + counts.blue * 5); log(`Мана: +${counts.blue * 5}%`, 'sys'); }
            if(counts.green) { 
                p.hp = Math.min(p.maxHp, p.hp + counts.green * 15); 
                p.armor = Math.min(p.maxArmor, p.armor + counts.green * 10);
                log(`Лечение: +${counts.green * 15}`, 'p');
            }
            if(counts.yellow) { p.gold += counts.yellow * 2; log(`Золото: +${counts.yellow * 2}`, 'sys'); }
        } else {
            // Урон моба (упрощенно)
            let dmg = counts.red * 10 + counts.purple * 15;
            if(dmg > 0) { p.hp -= dmg; log(`Враг ранил вас: -${dmg}`, 'm'); }
        }
        
        refreshUI();
        if (m.hp <= 0 && !appState.lootActive) window.showLootScreen(); 
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
        if (appState.mob.hp <= 0 || appState.lootActive) return;
        // Простая имитация хода врага (наносит урон и передает ход)
        log(`Ход врага...`, 'm');
        appState.player.hp -= appState.mob.atk;
        appState.turn = "PLAYER";
        this.isAnimating = false;
        refreshUI();
    }
}
