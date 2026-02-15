import { app } from "../core/app.js";

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");

        this.size = 8;
        this.tileSize = 80;

        this.grid = [];
        this.selected = null;
        this.isAnimating = false;

        this.turnResult = null;

        // цвет → эффект
        this.colorMap = {
            0xff0000: "damage", // красный
            0x3399ff: "mana",   // синий
            0x33ff33: "heal",   // зелёный
            0xffdd33: "gold",   // жёлтый
            0xaa44ff: "curse"   // фиолетовый
        };

        this.colors = Object.keys(this.colorMap).map(c => Number(c));
    }

    create() {
        console.log("🎮 GameScene create");

        for (let r = 0; r < this.size; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.size; c++) {
                const tile = this.spawnTile(r, c);
                this.grid[r][c] = tile;
            }
        }

        this.resolveStartMatches();
    }

    /* =========================
       TILE SPAWN
    ========================= */

    spawnTile(row, col, fromTop = false) {
        let color;
        do {
            color = Phaser.Utils.Array.GetRandom(this.colors);
        } while (this.causesMatch(row, col, color));

        const x = col * this.tileSize + this.tileSize / 2;
        const y = fromTop ? -this.tileSize : row * this.tileSize + this.tileSize / 2;

        const tile = this.add.rectangle(
            x,
            y,
            this.tileSize - 4,
            this.tileSize - 4,
            color
        );

        tile.setStrokeStyle(2, 0x000000);
        tile.setInteractive();

        tile.row = row;
        tile.col = col;
        tile.colorValue = color;

        tile.on("pointerdown", () => this.onTileClick(tile));

        if (fromTop) {
            this.tweens.add({
                targets: tile,
                y: row * this.tileSize + this.tileSize / 2,
                duration: 250
            });
        }

        return tile;
    }

    /* =========================
       INPUT
    ========================= */

    onTileClick(tile) {
        if (this.isAnimating) return;

        if (!this.selected) {
            this.selectTile(tile);
            return;
        }

        if (this.selected === tile) {
            this.clearSelection();
            return;
        }

        if (this.isNeighbor(this.selected, tile)) {
            this.trySwap(this.selected, tile);
        } else {
            this.selectTile(tile);
        }
    }

    selectTile(tile) {
        this.clearSelection();
        this.selected = tile;
        tile.setStrokeStyle(6, 0xffffff);
        tile.setDepth(10);
    }

    clearSelection() {
        if (this.selected) {
            this.selected.setStrokeStyle(2, 0x000000);
            this.selected.setDepth(1);
            this.selected = null;
        }
    }

    isNeighbor(a, b) {
        const dr = Math.abs(a.row - b.row);
        const dc = Math.abs(a.col - b.col);
        return dr + dc === 1;
    }

    /* =========================
       SWAP
    ========================= */

    async trySwap(a, b) {
        this.isAnimating = true;
        this.clearSelection();

        this.swapGrid(a, b);
        await this.animateSwap(a, b);

        const matches = this.findMatches();

        if (!matches.length) {
            // откат
            this.swapGrid(a, b);
            await this.animateSwap(a, b);
            this.isAnimating = false;
            return;
        }

        this.turnResult = {
            damage: 0,
            mana: 0,
            heal: 0,
            gold: 0,
            curse: 0
        };

        await this.resolveMatches();
        this.applyTurnResult();

        this.isAnimating = false;
    }

    swapGrid(a, b) {
        const ar = a.row, ac = a.col;
        const br = b.row, bc = b.col;

        this.grid[ar][ac] = b;
        this.grid[br][bc] = a;

        a.row = br; a.col = bc;
        b.row = ar; b.col = ac;
    }

    animateSwap(a, b) {
        return new Promise(resolve => {
            this.tweens.add({
                targets: a,
                x: a.col * this.tileSize + this.tileSize / 2,
                y: a.row * this.tileSize + this.tileSize / 2,
                duration: 200
            });

            this.tweens.add({
                targets: b,
                x: b.col * this.tileSize + this.tileSize / 2,
                y: b.row * this.tileSize + this.tileSize / 2,
                duration: 200,
                onComplete: resolve
            });
        });
    }

    /* =========================
       MATCH FIND
    ========================= */

    findMatches() {
        const matches = new Set();

        // горизонталь
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size - 2; c++) {
                const a = this.grid[r][c];
                const b = this.grid[r][c + 1];
                const d = this.grid[r][c + 2];
                if (a && b && d && a.colorValue === b.colorValue && a.colorValue === d.colorValue) {
                    matches.add(a); matches.add(b); matches.add(d);
                }
            }
        }

        // вертикаль
        for (let c = 0; c < this.size; c++) {
            for (let r = 0; r < this.size - 2; r++) {
                const a = this.grid[r][c];
                const b = this.grid[r + 1][c];
                const d = this.grid[r + 2][c];
                if (a && b && d && a.colorValue === b.colorValue && a.colorValue === d.colorValue) {
                    matches.add(a); matches.add(b); matches.add(d);
                }
            }
        }

        return Array.from(matches);
    }

    /* =========================
       RESOLVE
    ========================= */

    async resolveMatches() {
        const matches = this.findMatches();

        if (!matches.length) return;

        matches.forEach(tile => {
            const type = this.colorMap[tile.colorValue];
            if (type) this.turnResult[type]++;
        });

        await this.remove(matches);
        await this.drop();
        await this.resolveMatches();
    }

    remove(matches) {
        return new Promise(resolve => {
            matches.forEach(tile => {
                this.grid[tile.row][tile.col] = null;
                this.tweens.add({
                    targets: tile,
                    scale: 0,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => tile.destroy()
                });
            });
            this.time.delayedCall(220, resolve);
        });
    }

    async drop() {
        for (let c = 0; c < this.size; c++) {
            let empty = 0;
            for (let r = this.size - 1; r >= 0; r--) {
                const tile = this.grid[r][c];
                if (!tile) {
                    empty++;
                } else if (empty > 0) {
                    this.grid[r + empty][c] = tile;
                    this.grid[r][c] = null;
                    tile.row = r + empty;
                    this.tweens.add({
                        targets: tile,
                        y: tile.row * this.tileSize + this.tileSize / 2,
                        duration: 200
                    });
                }
            }

            for (let i = 0; i < empty; i++) {
                const tile = this.spawnTile(i, c, true);
                this.grid[i][c] = tile;
            }
        }

        await new Promise(r => this.time.delayedCall(250, r));
    }

    /* =========================
       APPLY TURN
    ========================= */

    applyTurnResult() {
        console.log("TURN RESULT:", this.turnResult);

        if (app.player) {
            app.player.applyTurn(this.turnResult);
        }

        if (app.mob && this.turnResult.damage) {
            app.mob.takeDamage(this.turnResult.damage * 10);
        }
    }

    /* =========================
       START SAFETY
    ========================= */

    causesMatch(r, c, color) {
        if (c >= 2) {
            const a = this.grid[r]?.[c - 1];
            const b = this.grid[r]?.[c - 2];
            if (a && b && a.colorValue === color && b.colorValue === color) return true;
        }

        if (r >= 2) {
            const a = this.grid[r - 1]?.[c];
            const b = this.grid[r - 2]?.[c];
            if (a && b && a.colorValue === color && b.colorValue === color) return true;
        }

        return false;
    }

    resolveStartMatches() {
        while (this.findMatches().length) {
            for (let r = 0; r < this.size; r++) {
                for (let c = 0; c < this.size; c++) {
                    const tile = this.grid[r][c];
                    tile.colorValue = Phaser.Utils.Array.GetRandom(this.colors);
                    tile.fillColor = tile.colorValue;
                }
            }
        }
    }
}
