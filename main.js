import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS } from "../data/constants.js";
import { appState, log, refreshUI } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Загрузка ресурсов
        ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => 
            this.load.image(`t_${c}`, `assets/rune_${c}.png`)
        );
    }

    create() {
        // Регистрируем сцену глобально для работы ульты из main.js
        window.gameScene = this;

        this.grid = [];
        this.isAnimating = false;
        this.sel = null;

        // Создаем начальное поле
        for(let r=0; r<8; r++) {
            this.grid[r] = [];
            for(let c=0; c<8; c++) this.spawnTile(r, c);
        }

        // Эффект наведения (hover)
        this.input.on('gameobjectover', (ptr, obj) => { if(obj.container) obj.container.setHover(true); });
        this.input.on('gameobjectout', (ptr, obj) => { if(obj.container) obj.container.setHover(false); });
    }

    spawnTile(r, c, fromTop=false) {
        const types = ['red', 'blue', 'green', 'purple', 'yellow'];
        const type = Phaser.Utils.Array.GetRandom(types);
        const x = c * TILE_S + TILE_S/2;
        const y = fromTop ? -TILE_S : r * TILE_S + TILE_S/2;
        
        const container = this.add.container(x, y);
        
        // Визуал плитки
        const glow = this.add.graphics().fillStyle(GLOW_COLORS[type], 0.3).fillRoundedRect(-VISUAL_S/2-2, -VISUAL_S/2-2, VISUAL_S+4, VISUAL_S+4, 14);
        const bg = this.add.graphics().fillStyle(BG_COLORS[type], 1).fillRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
        const img = this.add.image(0, 0, `t_${type}`);
        
        // Настройка размера картинки
        const scaleMult = (type==='red'||type==='blue'||type==='purple') ? 2.15 : 1.5;
        img.setDisplaySize(VISUAL_S * scaleMult, VISUAL_S * scaleMult);

        // Маска для скругления углов
        const maskShape = this.make.graphics().fillStyle(0xffffff).fillRoundedRect(x-VISUAL_S/2, y-VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
        img.setMask(maskShape.createGeometryMask());

        const hoverGlow = this.add.graphics().setAlpha(0).lineStyle(4, 0xffffff, 1).strokeRoundedRect(-VISUAL_S/2-4, -VISUAL_S/2-4, VISUAL_S+8, VISUAL_S+8, 14);
        
        container.add([glow, bg, img, hoverGlow]);
        
        container.gridR = r; 
        container.gridC = c; 
        container.type = type;
        container.maskShape = maskShape;
        container.setHover = (v) => this.tweens.add({ targets: hoverGlow, alpha: v?0.6:0, duration: 200 });

        // ИНТЕРАКТИВ (Тут было исправление контекста)
        const hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0, 0).setInteractive();
        hitArea.container = container;
        container.add(hitArea);
        
        // Важно: используем стрелочную функцию () =>
        hitArea.on('pointerdown', () => this.handlePointer(container));

        this.grid[r][c] = container;
        if(fromTop) this.tweens.add({targets: container, y: r*TILE_S+TILE_S/2, duration: 400});
    }

    async handlePointer(t) {
        if(this.isAnimating || appState.turn !== "PLAYER" || appState.lootActive) return;

        if(!this.sel) { 
            this.sel = t; 
            t.setScale(1.1); 
        } else {
            if(this.sel === t) { 
                t.setScale(1); 
                this.sel = null; 
                return; 
            }

            const dist = Math.abs(this.sel.gridR - t.gridR) + Math.abs(this.sel.gridC - t.gridC);
            if(dist === 1) {
                if (this.checkPotential(this.sel, t)) {
                    this.sel.setScale(1);
                    await this.swap(this.sel, t);
                    await this.check();
                    
                    // Переход хода к мобу после игрока
                    if (appState.mob.hp > 0) {
                        appState.turn = "MOB";
                        this.time.delayedCall(600, () => this.mobAI());
                    }
                } else {
                    // Тряска если ход невозможен
                    this.tweens.add({targets: [this.sel, t], x: "+=5", yoyo: true, duration: 50});
                }
            }
            if(this.sel) this.sel.setScale(1);
            this.sel = null;
        }
    }

    checkPotential(t1, t2) {
        const r1=t1.gridR, c1=t1.gridC, r2=t2.gridR, c2=t2.gridC;
        this.grid[r1][c1]=t2; this.grid[r2][c2]=t1;
        const hasMatch = this.findMatches().length > 0;
        this.grid[r1][c1]=t1; this.grid[r2][c2]=t2;
        return hasMatch;
    }

    async swap(t1, t2) {
        this.isAnimating = true;
        const r1=t1.gridR, c1=t1.gridC, r2=t2.gridR, c2=t2.gridC;
        this.grid[r1][c1]=t2; this.grid[r2][c2]=t1;
        t1.gridR=r2; t1.gridC=c2; t2.gridR=r1; t2.gridC=c1;
        
        return new Promise(res => {
            this.tweens.add({targets:t1, x:c2*TILE_S+TILE_S/2, y:r2*TILE_S+TILE_S/2, duration:200});
            this.tweens.add({targets:t2, x:c1*TILE_S+TILE_S/2, y:r1*TILE_S+TILE_S/2, duration:200, onComplete:()=>{this.isAnimating=false; res();}});
        });
    }

    findMatches() {
        let m = [];
        // Горизонтальные
        for(let r=0; r<8; r++) for(let c=0; c<6; c++) 
            if(this.grid[r][c] && this.grid[r][c+1] && this.grid[r][c+2] && 
               this.grid[r][c].type===this.grid[r][c+1].type && this.grid[r][c].type===this.grid[r][c+2].type) 
               m.push(this.grid[r][c], this.grid[r][c+1], this.grid[r][c+2]);
        // Вертикальные
        for(let c=0; c<8; c++) for(let r=0; r<6; r++) 
            if(this.grid[r][c] && this.grid[r+1][c] && this.grid[r+2][c] && 
               this.grid[r][c].type===this.grid[r+1][c].type && this.grid[r][c].type===this.grid[r+2][c].type) 
               m.push(this.grid[r][c], this.grid[r+1][c], this.grid[r+2][c]);
        return m;
    }

    async check() {
        const m = this.findMatches();
        if(m.length > 0) { 
            await this.explode([...new Set(m)]); 
            await this.refill(); 
            await this.check(); 
        }
    }

    async explode(uniques) {
        this.isAnimating = true;
        const counts = { red:0, blue:0, green:0, purple:0, yellow:0 };
        uniques.forEach(t => { counts[t.type]++; });
        
        return new Promise(res => {
            this.tweens.add({
                targets: uniques, scale: 0, alpha: 0, duration: 250,
                onComplete: () => {
                    uniques.forEach(t => { if(this.grid[t.gridR]) this.grid[t.gridR][t.gridC] = null; t.destroy(); });
                    this.applySummary(counts);
                    this.isAnimating = false;
                    res();
                }
            });
        });
    }

    applySummary(counts) {
        const p = appState.player, m = appState.mob;
        if(appState.turn === "PLAYER") {
            if(counts.red > 0) { 
                const dmg = (p.baseAtk + (p.equip.weapon?.atk || 0)) * counts.red;
                m.hp -= dmg; log(`Удар: -${dmg}`, 'p'); 
            }
            if(counts.purple > 0) { 
                const crit = (p.baseAtk * 2) * counts.purple;
                m.hp -= crit; log(`КРИТ: -${crit}`, 'crit'); 
            }
            if(counts.blue > 0) p.mana = Math.min(100, p.mana + counts.blue * 10);
            if(counts.green > 0) p.hp = Math.min(p.maxHp, p.hp + counts.green * 15);
        } else {
            const dmg = Math.max(0, m.atk - p.armor);
            p.hp -= dmg; log(`Враг бьет: -${dmg}`, 'm');
        }
        
        if(m.hp <= 0) window.showLootScreen();
        refreshUI();
    }

    async refill() {
        for(let c=0; c<8; c++) {
            let empty = 0;
            for(let r=7; r>=0; r--) {
                if(!this.grid[r][c]) empty++;
                else if(empty > 0) {
                    const t = this.grid[r][c]; 
                    this.grid[r+empty][c]=t; 
                    this.grid[r][c]=null;
                    t.gridR = r+empty;
                    this.tweens.add({targets: t, y: t.gridR*TILE_S+TILE_S/2, duration: 200});
                }
            }
            for(let i=0; i<empty; i++) this.spawnTile(i, c, true);
        }
        await new Promise(r => this.time.delayedCall(300, r));
    }

    async mobAI() {
        if(appState.mob.hp <= 0 || appState.turn !== "MOB") return;
        
        // Простой поиск хода для моба
        let moved = false;
        for(let r=0; r<8 && !moved; r++) {
            for(let c=0; c<7 && !moved; c++) {
                if(this.checkPotential(this.grid[r][c], this.grid[r][c+1])) {
                    await this.swap(this.grid[r][c], this.grid[r][c+1]);
                    await this.check();
                    moved = true;
                }
            }
        }
        appState.turn = "PLAYER";
        refreshUI();
    }

    update() {
        // Синхронизация масок с позицией плиток
        for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
            const t = this.grid[r][c];
            if(t && t.maskShape) {
                t.maskShape.clear().fillStyle(0xffffff).fillRoundedRect(t.x-VISUAL_S/2, t.y-VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
            }
        }
    }
}
