export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    create() {
        this.tileSize = 80;
        this.gridSize = 8;
        this.tiles = [];
        this.selected = null;
        this.isAnimating = false;

        this.colors = [
            0xff4444, // red
            0x4488ff, // blue
            0x44ff44, // green
            0xffdd44, // yellow
            0xaa44ff  // purple
        ];

        for (let r = 0; r < this.gridSize; r++) {
            this.tiles[r] = [];
            for (let c = 0; c < this.gridSize; c++) {
                this.spawnTileSafe(r, c);
            }
        }

        console.log("✅ Field generated without matches");
    }

    /* ---------------- FIELD GENERATION ---------------- */

    spawnTileSafe(row, col, fromTop = false) {
        let color;
        do {
            color = Phaser.Utils.Array.GetRandom(this.colors);
        } while (this.createsMatch(row, col, color));

        this.spawnTile(row, col, color, fromTop);
    }

    createsMatch(row, col, color) {
        // horizontal
        if (
            col >= 2 &&
            this.tiles[row][col - 1]?.colorValue === color &&
            this.tiles[row][col - 2]?.colorValue === color
        ) return true;

        // vertical
        if (
            row >= 2 &&
            this.tiles[row - 1]?.[col]?.colorValue === color &&
            this.tiles[row - 2]?.[col]?.colorValue === color
        ) return true;

        return false;
    }

    spawnTile(row, col, color, fromTop = false) {
        const x = col * this.tileSize + this.tileSize / 2;
        const y = fromTop ? -this.tileSize : row * this.tileSize + this.tileSize / 2;

        const tile = this.add.rectangle(
            x,
            y,
            this.tileSize - 6,
            this.tileSize - 6,
            color
        );

        tile.setStrokeStyle(2, 0x000000);
        tile.setInteractive();

        tile.row = row;
        tile.col = col;
        tile.colorValue = color;

        tile.on("pointerdown", () => this.onTileClick(tile));
        this.tiles[row][col] = tile;

        if (fromTop) {
            this.tweens.add({
                targets: tile,
                y: row * this.tileSize + this.tileSize / 2,
                duration: 250
            });
        }
    }

    /* ---------------- INPUT ---------------- */

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
    }

    clearSelection() {
        if (this.selected) {
            this.selected.setStrokeStyle(2, 0x000000);
            this.selected = null;
        }
    }

    isNeighbor(a, b) {
        return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
    }

    /* ---------------- SWAP LOGIC ---------------- */

    async trySwap(a, b) {
        this.isAnimating = true;
        await this.swapTiles(a, b);

        const matches = this.findMatches();
        if (matches.length === 0) {
            // ❌ invalid move → swap back
            await this.swapTiles(a, b);
        } else {
            await this.resolveMatches();
        }

        this.clearSelection();
        this.isAnimating = false;
    }

    swapTiles(a, b) {
        return new Promise(resolve => {
            const aRow = a.row, aCol = a.col;
            const bRow = b.row, bCol = b.col;

            this.tiles[aRow][aCol] = b;
            this.tiles[bRow][bCol] = a;

            a.row = bRow; a.col = bCol;
            b.row = aRow; b.col = aCol;

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
                onComplete: resolve
            });
        });
    }

    /* ---------------- MATCH / FALL ---------------- */

    async resolveMatches() {
        const matches = this.findMatches();
        if (matches.length === 0) return;

        await this.removeMatches(matches);
        await this.dropTiles();
        await this.resolveMatches();
    }

    findMatches() {
        const result = new Set();

        for (let r = 0; r < this.gridSize; r++) {
            let count = 1;
            for (let c = 1; c <= this.gridSize; c++) {
                const curr = this.tiles[r][c];
                const prev = this.tiles[r][c - 1];
                if (curr && prev && curr.colorValue === prev.colorValue) count++;
                else {
                    if (count >= 3)
                        for (let k = 0; k < count; k++)
                            result.add(this.tiles[r][c - 1 - k]);
                    count = 1;
                }
            }
        }

        for (let c = 0; c < this.gridSize; c++) {
            let count = 1;
            for (let r = 1; r <= this.gridSize; r++) {
                const curr = this.tiles[r]?.[c];
                const prev = this.tiles[r - 1]?.[c];
                if (curr && prev && curr.colorValue === prev.colorValue) count++;
                else {
                    if (count >= 3)
                        for (let k = 0; k < count; k++)
                            result.add(this.tiles[r - 1 - k][c]);
                    count = 1;
                }
            }
        }

        return [...result];
    }

    async removeMatches(matches) {
        return new Promise(resolve => {
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
                    resolve();
                }
            });
        });
    }

    async dropTiles() {
        for (let c = 0; c < this.gridSize; c++) {
            let empty = 0;
            for (let r = this.gridSize - 1; r >= 0; r--) {
                const tile = this.tiles[r][c];
                if (!tile) empty++;
                else if (empty > 0) {
                    this.tiles[r + empty][c] = tile;
                    this.tiles[r][c] = null;
                    tile.row = r + empty;
                    this.tweens.add({
                        targets: tile,
                        y: tile.row * this.tileSize + this.tileSize / 2,
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
