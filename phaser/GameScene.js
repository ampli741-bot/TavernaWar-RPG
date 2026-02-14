import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS } from "../data/constants.js";
import { appState, refreshUI, log } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() { 
        super('GameScene'); 
        this.isAnimating = false;
        this.sel = null;
    }

    preload() {
        // Ничего не грузим, чтобы избежать 404 ошибок
    }

    create() {
        console.log("PHASER: Сцена создана!");
        window.gameScene = this; 
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

        // Рисуем просто цветной квадрат (без картинок!)
        const bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type] || 0xffffff, 1);
        bg.fillRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 10);

        // Буква руны
        const txt = this.add.text(0, 0, type[0].toUpperCase(), { 
            fontSize: '32px', color: '#fff', fontStyle: 'bold' 
        }).setOrigin(0.5);

        container.add([bg, txt]);
        
        container.type = type;
        container.gridR = r;
        container.gridC = c;

        const hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0, 0)
            .setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', () => this.handlePointer(container));
        container.add(hitArea);

        this.grid[r][c] = container;
        if (fromTop) {
            this.tweens.add({ targets: container, y: r * TILE_S + TILE_S / 2, duration: 300 });
        }
    }

    async handlePointer(t) {
        if (this.isAnimating || appState.turn !== "PLAYER") return;

        if (!this.sel) {
            this.sel = t;
            t.setScale(1.2);
        } else {
            const t1 = this.sel;
            const t2 = t;
            t1.setScale(1);
            this.sel = null;

            const dist = Math.abs(t1.gridR - t2.gridR) + Math.abs(t1.gridC - t2.gridC);
            if (dist === 1) {
                this.isAnimating = true;
                // Простая логика обмена для проверки
                let r1 = t1.gridR, c1 = t1.gridC, r2 = t2.gridR, c2 = t2.gridC;
                this.grid[r1][c1] = t2; this.grid[r2][c2] = t1;
                t1.gridR = r2; t1.gridC = c2; t2.gridR = r1; t2.gridC = c1;

                this.tweens.add({ targets: t1, x: c2 * TILE_S + TILE_S / 2, y: r2 * TILE_S + TILE_S / 2, duration: 200 });
                this.tweens.add({ targets: t2, x: c1 * TILE_S + TILE_S / 2, y: r1 * TILE_S + TILE_S / 2, duration: 200, onComplete: () => {
                    this.isAnimating = false;
                }});
            }
        }
    }
}
