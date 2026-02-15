export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    create() {
        this.tileSize = 80;
        this.gridSize = 8;
        this.tiles = [];
        this.selected = null;
        this.busy = false;

        // 🎯 результат текущего хода
        this.turnResult = this.emptyTurnResult();

        // 🎨 цвета
        this.colorMap = {
            0xff4444: "damage",    // red
            0x4488ff: "mana",      // blue
            0x44ff44: "heal",      // green
            0xffdd44: "gold",      // yellow
            0xaa44ff: "curse"      // purple
        };

        this.colors = Object.keys(this.colorMap).map(c => Number(c));

        for (let r = 0; r < this.gridSize; r++) {
            this.tiles[r] = [];
            for (let c = 0; c < this.gridSize; c++) {
                this.spawnTileSafe(r, c);
            }
        }

        console.log("FIELD READY");
    }

    emptyTurnResult() {
        return {
            damage: 0,
            mana: 0,
            heal: 0,
            gold: 0,
            curse: 0
        };
    }

    /* ---------- SPAWN ---------- */

    spawnTileSafe(r, c, fromTop = false) {
        let color;
        do {
            color = Phaser.Utils.Array.GetRandom(this.colors);
        } while (this.createsMatch(r, c, color));

        this.spawnTile(r, c, color, fromTop);
    }

    createsMatch(r, c, color) {
        if (c >= 2 &&
            this.tiles[r][c - 1]?.colorValue === color &&
            this.tiles[r][c - 2]?.colorValue === color) return true;

        if (r >= 2 &&
            this.tiles[r - 1]?.[c]?.colorValue === color &&
            this.tiles[r - 2]?.[c]?.colorValue === color) return true;

        return false;
    }

    spawnTile(r, c, color, fromTop = false) {
        const x = c * this.tileSize + this.tileSize / 2;
        const y = fromTop ? -this.tileSize : r * this.tileSize + this.tileSize / 2;

        const tile = this.add.rectangle(
            x, y,
            this.tileSize - 6,
            this.tileSize - 6,
            color
        );

        tile.setInteractive();
        tile.setStrokeStyle(2, 0x000000);

        tile.row = r;
        tile.col = c;
        tile.colorValue = color;

        tile.on("pointerdown", () => this.onClick(tile));
        this.tiles[r][c] = tile;

        if (fromTop) {
            this.tweens.add({
                targets: tile,
                y: r * this.tileSize + this.tileSize / 2,
                duration: 250
            });
        }
    }

    /* ---------- INPUT ---------- */

    onClick(tile) {
        if (this.busy) return;

        if (!this.selected) {
            this.select(tile);
            return;
        }

        if (tile === this.selected) {
            this.clearSelect();
            return;
        }

        if (this.isNeighbor(tile, this.selected)) {
            this.trySwap(tile, this.selected);
        } else {
            this.select(tile);
        }
    }

    select(tile) {
        this.clearSelect();
        this.selected = tile;
        tile.setStrokeStyle(6, 0xffffff);
    }

    clearSelect() {
        if (this.selected) {
            this.selected.setStrokeStyle(2, 0x000000);
            this.selected = null;
        }
    }

    isNeighbor(a, b) {
        return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
    }

    /* ---------- SWAP ---------- */

    async trySwap(a, b) {
        this.busy = true;
        this.turnResult = this.emptyTurnResult(); // 🔄 новый ход

        this.swapData(a, b);
        const valid = this.findMatches().length > 0;
        this.swapData(a, b);

        if (!valid) {
            await this.animateSwap(a, b);
            await this.animateSwap(a, b);
            this.clearSelect();
            this.busy = false;
            return;
        }

        this.swapData(a, b);
        await this.animateSwap(a, b);
        await this.resolveMatches();

        // 📊 итог хода
        console.log("TURN RESULT:", this.turnResult);

        this.clearSelect();
        this.busy = false;
    }

    swapData(a, b) {
        const ar = a.row, ac = a.col;
        const br = b.row, bc = b.col;

        this.tiles[ar][ac] = b;
        this.tiles[br][bc] = a;

        a.row = br; a.col = bc;
        b.row = ar; b.col = ac;
    }

    animateSwap(a, b) {
        return new Promise(res => {
            this.tweens.add({
                targets: a,
                x: a.col * this.tileSize + this.tileSize / 2,
                y: a.row * this.tileSize + this.tileSize / 2,
                duration: 150
            });
            this.tweens.add({
                targets: b,
                x: b.col * this.tileSize + this.tileSize / 2,
                y: b.row * this.tileSize + this.tileSize / 2,
                duration: 150,
                onComplete: res
            });
        });
    }

    /* ---------- MATCH ---------- */

    async resolveMatches() {
        const matches = this.findMatches();
        if (!matches.length) return;

        // 🎯 считаем цвета
        matches.forEach(tile => {
            const type = this.colorMap[tile.colorValue];
            if (type) this.turnResult[type]++;
        });

        await this.remove(matches);
        await this.drop();
        await this.resolveMatches();
    }

    findMatches() {
        const set = new Set();

        for (let r = 0; r < 8; r++) {
            let cnt = 1;
            for (let c = 1; c <= 8; c++) {
                const cur = this.tiles[r][c];
                const prev = this.tiles[r][c - 1];
                if (cur && prev && cur.colorValue === prev.colorValue) cnt++;
                else {
                    if (cnt >= 3)
                        for (let k = 0; k < cnt; k++)
                            set.add(this.tiles[r][c - 1 - k]);
                    cnt = 1;
                }
            }
        }

        for (let c = 0; c < 8; c++) {
            let cnt = 1;
            for (let r = 1; r <= 8; r++) {
                const cur = this.tiles[r]?.[c];
                const prev = this.tiles[r - 1]?.[c];
                if (cur && prev && cur.colorValue === prev.colorValue) cnt++;
                else {
                    if (cnt >= 3)
                        for (let k = 0; k < cnt; k++)
                            set.add(this.tiles[r - 1 - k][c]);
                    cnt = 1;
                }
            }
        }

        return [...set];
    }

    async remove(matches) {
        return new Promise(res => {
            this.tweens.add({
                targets: matches,
                scale: 0,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    matches.forEach(t => {
                        this.tiles[t.row][t.col] = null;
                        t.destroy();
                    });
                    res();
                }
            });
        });
    }

    async drop() {
        for (let c = 0; c < 8; c++) {
            let empty = 0;
            for (let r = 7; r >= 0; r--) {
                const t = this.tiles[r][c];
                if (!t) empty++;
                else if (empty) {
                    this.tiles[r + empty][c] = t;
                    this.tiles[r][c] = null;
                    t.row = r + empty;
                    this.tweens.add({
                        targets: t,
                        y: t.row * this.tileSize + this.tileSize / 2,
                        duration: 200
                    });
                }
            }
            for (let i = 0; i < empty; i++) {
                this.spawnTileSafe(i, c, true);
            }
        }
        return new Promise(r => this.time.delayedCall(300, r));
    }
}
