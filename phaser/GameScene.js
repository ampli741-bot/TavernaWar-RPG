import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS } from "../data/constants.js";
import { appState, refreshUI, log } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() { 
        super('GameScene'); 
        this.isAnimating = false;
        this.sel = null;
    }

    preload() {
        // Временно ничего не грузим, чтобы исключить ошибки путей
    }

    create() {
        console.log("Phaser Scene Created!"); // Проверка в консоли
        window.gameScene = this; 
        this.grid = [];
        
        for (let r = 0; r < 8; r++) {
            this.grid[r] = [];
            for (let c = 0; c < 8; c++) {
                this.spawnTile(r, c);
            }
        }

        this.input.on('gameobjectover', (ptr, obj) => { if(obj.container) obj.container.setHover(true); });
        this.input.on('gameobjectout', (ptr, obj) => { if(obj.container) obj.container.setHover(false); });
    }

    spawnTile(r, c, fromTop = false) {
        const types = ['red', 'blue', 'green', 'purple', 'yellow'];
        const type = Phaser.Utils.Array.GetRandom(types);
        const x = c * TILE_S + TILE_S / 2;
        const y = fromTop ? -TILE_S : r * TILE_S + TILE_S / 2;

        const container = this.add.container(x, y);

        // 1. Свечение
        const glow = this.add.graphics();
        glow.fillStyle(GLOW_COLORS[type], 0.4);
        glow.fillRoundedRect(-VISUAL_S/2 - 2, -VISUAL_S/2 - 2, VISUAL_S + 4, VISUAL_S + 4, 14);

        // 2. Фон
        const bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type], 1);
        bg.fillRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 12);

        // 3. ТЕКСТ ВМЕСТО КАРТИНКИ (Чтобы не зависало без файлов)
        const txt = this.add.text(0, 0, type[0].toUpperCase(), { 
            fontSize: '32px', 
            fill: '#ffffff', 
            fontStyle: 'bold' 
        }).setOrigin(0.5);

        // 4. Рамка
        const frame = this.add.graphics();
        frame.lineStyle(4, 0x444444, 1);
        frame.strokeRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 10);

        const hoverGlow = this.add.graphics().setAlpha(0);
        hoverGlow.lineStyle(4, 0xffffff, 1);
        hoverGlow.strokeRoundedRect(-VISUAL_S/2 - 4, -VISUAL_S/2 - 4, VISUAL_S + 8, VISUAL_S + 8, 14);

        const ghostGlow = this.add.graphics().setAlpha(0);
        ghostGlow.lineStyle(8, 0xffffff, 0.6);
        ghostGlow.strokeRoundedRect(-VISUAL_S/2 - 2, -VISUAL_S/2 - 2, VISUAL_S + 4, VISUAL_S + 4, 12);

        container.add([glow, bg, txt, frame, hoverGlow, ghostGlow]);
        
        container.type = type;
        container.gridR = r;
        container.gridC = c;
        container.hoverGlow = hoverGlow;
        container.ghostGlow = ghostGlow;

        const hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0, 0).setInteractive();
        hitArea.container = container;
        container.add(hitArea);
        hitArea.on('pointerdown', () => this.handlePointer(container));

        container.setHover = (v) => { this.tweens.add({ targets: hoverGlow, alpha: v ? 0.6 : 0, duration: 200 }); };
        container.setGhost = (v) => {
            if (v) {
                container.ghostGlow.alpha = 1;
                container.ghostPulse = this.tweens.add({
                    targets: container.ghostGlow, alpha: 0.2, scale: 1.05, duration: 600, yoyo: true, repeat: -1
                });
            } else {
                if (container.ghostPulse) container.ghostPulse.stop();
                container.ghostGlow.alpha = 0;
            }
        };

        this.grid[r][c] = container;
        if (fromTop) {
            this.tweens.add({ targets: container, y: r * TILE_S + TILE_S / 2, duration: 400 });
        }
        return container;
    }

    // ... (остальные методы: handlePointer, swap, check, refill, explodeUnique - скопируй из предыдущего ответа)
    // ВАЖНО: убедись, что в update() нет ошибок с маской, если мы её убрали для теста
    update() {} 

    async handlePointer(t) {
        if (this.isAnimating || appState.turn !== "PLAYER") return;
        if (!this.sel) {
            this.sel = t; t.setGhost(true);
        } else {
            const t1 = this.sel; const t2 = t;
            t1.setGhost(false); this.sel = null;
            if (t1 === t2) return;
            const dist = Math.abs(t1.gridR - t2.gridR) + Math.abs(t1.gridC - t2.gridC);
            if (dist === 1) {
                await this.swap(t1, t2);
                await this.check();
                appState.turn = "MOB";
                this.time.delayedCall(800, () => { 
                    appState.player.hp -= 10; 
                    appState.turn = "PLAYER"; 
                    refreshUI(); 
                });
            }
        }
    }

    async swap(t1, t2) {
        this.isAnimating = true;
        let r1 = t1.gridR, c1 = t1.gridC, r2 = t2.gridR, c2 = t2.gridC;
        this.grid[r1][c1] = t2; this.grid[r2][c2] = t1;
        t1.gridR = r2; t1.gridC = c2; t2.gridR = r1; t2.gridC = c1;
        return new Promise(res => {
            this.tweens.add({ targets: t1, x: c2 * TILE_S + TILE_S / 2, y: r2 * TILE_S + TILE_S / 2, duration: 200 });
            this.tweens.add({ targets: t2, x: c1 * TILE_S + TILE_S / 2, y: r1 * TILE_S + TILE_S / 2, duration: 200, onComplete: () => { this.isAnimating = false; res(); } });
        });
    }

    async check() {
        let match = [];
        for(let r=0; r<8; r++) for(let c=0; c<6; c++) 
            if(this.grid[r][c] && this.grid[r][c+1] && this.grid[r][c+2] && this.grid[r][c].type === this.grid[r][c+1].type && this.grid[r][c].type === this.grid[r][c+2].type)
                match.push(this.grid[r][c], this.grid[r][c+1], this.grid[r][c+2]);
        
        for(let c=0; c<8; c++) for(let r=0; r<6; r++)
            if(this.grid[r][c] && this.grid[r+1][c] && this.grid[r+2][c] && this.grid[r][c].type === this.grid[r+1][c].type && this.grid[r][c].type === this.grid[r+2][c].type)
                match.push(this.grid[r][c], this.grid[r+1][c], this.grid[r+2][c]);

        if (match.length > 0) {
            let unique = [...new Set(match)];
            unique.forEach(t => { this.grid[t.gridR][t.gridC] = null; t.destroy(); });
            await this.refill();
            await this.check();
        }
    }

    async refill() {
        for (let c = 0; c < 8; c++) {
            let empty = 0;
            for (let r = 7; r >= 0; r--) {
                if (!this.grid[r][c]) empty++;
                else if (empty > 0) {
                    let t = this.grid[r][c];
                    this.grid[r + empty][c] = t; this.grid[r][c] = null; t.gridR = r + empty;
                    this.tweens.add({ targets: t, y: t.gridR * TILE_S + TILE_S / 2, duration: 200 });
                }
            }
            for (let i = 0; i < empty; i++) this.spawnTile(i, c, true);
        }
        await new Promise(r => this.time.delayedCall(250, r));
    }
}
