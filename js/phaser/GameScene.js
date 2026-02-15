import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS } from "../config/constants.js";
import { app } from "../core/app.js";

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => {
            this.load.image(`t_${c}`, `assets/rune_${c}.png`);
        });
    }

    create() {
        this.grid = [];
        this.isAnimating = false;
        this.sel = null;

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
        container.type = type;
        container.gridR = r;
        container.gridC = c;

        const bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type], 1);
        bg.fillRoundedRect(-VISUAL_S / 2, -VISUAL_S / 2, VISUAL_S, VISUAL_S, 12);

        const img = this.add.image(0, 0, `t_${type}`);
        img.setDisplaySize(VISUAL_S * 1.8, VISUAL_S * 1.8);

        const frame = this.add.graphics();
        frame.lineStyle(3, 0x444444);
        frame.strokeRoundedRect(-VISUAL_S / 2, -VISUAL_S / 2, VISUAL_S, VISUAL_S, 12);

        container.add([bg, img, frame]);

        const hit = this.add.rectangle(0, 0, TILE_S, TILE_S, 0x000000, 0)
            .setInteractive();

        hit.on('pointerdown', () => this.handleClick(container));
        container.add(hit);

        this.grid[r][c] = container;

        if (fromTop) {
            this.tweens.add({
                targets: container,
                y: r * TILE_S + TILE_S / 2,
                duration: 300
            });
        }
    }

    async handleClick(tile) {
        if (this.isAnimating || app.turn !== "PLAYER") return;

        if (!this.sel) {
            this.sel = tile;
            tile.setScale(1.2);
            return;
        }

        if (this.sel === tile) {
            tile.setScale(1);
            this.sel = null;
            return;
        }

        const d =
            Math.abs(this.sel.gridR - tile.gridR) +
            Math.abs(this.sel.gridC - tile.gridC);

        if (d === 1) {
            if (this.hasMatch(this.sel, tile)) {
                await this.swap(this.sel, tile);
                await this.checkMatches();
            }
        }

        this.sel.setScale(1);
        this.sel = null;
    }

    hasMatch(a, b) {
        this.swapGrid(a, b);
        const has = this.findMatches().length > 0;
        this.swapGrid(a, b);
        return has;
    }

    swapGrid(a, b) {
        const r1 = a.gridR, c1 = a.gridC;
        const r2 = b.gridR, c2 = b.gridC;
        this.grid[r1][c1] = b;
        this.grid[r2][c2] = a;
    }

    async swap(a, b) {
        this.isAnimating = true;

        this.swapGrid(a, b);

        [a.gridR, b.gridR] = [b.gridR, a.gridR];
        [a.gridC, b.gridC] = [b.gridC, a.gridC];

        await Promise.all([
            this.tweenTo(a),
            this.tweenTo(b)
        ]);

        this.isAnimating = false;
    }

    tweenTo(tile) {
        return new Promise(res => {
            this.tweens.add({
                targets: tile,
                x: tile.gridC * TILE_S + TILE_S / 2,
                y: tile.gridR * TILE_S + TILE_S / 2,
                duration: 200,
                onComplete: res
            });
        });
    }

    findMatches() {
        const out = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 6; c++) {
                const t = this.grid[r][c];
                if (
                    t &&
                    this.grid[r][c + 1]?.type === t.type &&
                    this.grid[r][c + 2]?.type === t.type
                ) {
                    out.push(t, this.grid[r][c + 1], this.grid[r][c + 2]);
                }
            }
        }

        for (let c = 0; c < 8; c++) {
            for (let r = 0; r < 6; r++) {
                const t = this.grid[r][c];
                if (
                    t &&
                    this.grid[r + 1][c]?.type === t.type &&
                    this.grid[r + 2][c]?.type === t.type
                ) {
                    out.push(t, this.grid[r + 1][c], this.grid[r + 2][c]);
                }
            }
        }

        return [...new Set(out)];
    }

    async checkMatches() {
        const matches = this.findMatches();
        if (matches.length === 0) return;

        this.isAnimating = true;

        matches.forEach(t => {
            this.grid[t.gridR][t.gridC] = null;
            this.tweens.add({
                targets: t,
                scale: 0,
                alpha: 0,
                duration: 200,
                onComplete: () => t.destroy()
            });
        });

        await this.time.delayedCall(250);
        await this.refill();
        this.isAnimating = false;

        this.checkMatches();
    }

    async refill() {
        for (let c = 0; c < 8; c++) {
            let empty = 0;
            for (let r = 7; r >= 0; r--) {
                if (!this.grid[r][c]) {
                    empty++;
                } else if (empty > 0) {
                    const t = this.grid[r][c];
                    this.grid[r + empty][c] = t;
                    this.grid[r][c] = null;
                    t.gridR += empty;
                    this.tweens.add({
                        targets: t,
                        y: t.gridR * TILE_S + TILE_S / 2,
                        duration: 200
                    });
                }
            }
            for (let i = 0; i < empty; i++) {
                this.spawnTile(i, c, true);
            }
        }
    }
}

export default GameScene;
