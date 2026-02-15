export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    create() {
        console.log("🎮 GameScene create");

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
                this.spawnTile(r, c);
            }
        }
    }

    spawnTile(row, col, fromTop = false) {
        const color = Phaser.Utils.Array.GetRandom(this.colors);
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
                duration: 200
            });
        }
    }

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
            this.swapTiles(this.selected, tile);
        } else {
            this.selectTile(tile);
        }
    }

    selectTile(tile) {
        this.clearSelection();
        this.selected = tile;
        tile.setStrokeStyle(4, 0xffffff);
    }

    clearSelection() {
        if (this.selected) {
            this.selected.setStrokeStyle(2, 0x000000);
            this.selected = null;
        }
    }

    isNeighbor(a, b) {
        const dr = Math.abs(a.row - b.row);
        const dc = Math.abs(a.col - b.col);
        return dr + dc === 1;
    }

    swapTiles(a, b) {
        this.isAnimating = true;

        const aRow = a.row, aCol = a.col;
        const bRow = b.row, bCol = b.col;

        this.tiles[aRow][aCol] = b;
        this.tiles[bRow][bCol] = a;

        a.row = bRow; a.col = bCol;
        b.row = aRow; b.col = aCol;

        this.tweens.add({
            targets: a,
            x: bCol * this.tileSize + this.tileSize / 2,
            y: bRow * this.tileSize + this.tileSize / 2,
            duration: 150
        });

        this.tweens.add({
            targets: b,
            x: aCol * this.tileSize + this.tileSize / 2,
            y: aRow * this.tileSize + this.tileSize / 2,
            duration: 150,
            onComplete: async () => {
                this.clearSelection();
                await this.resolveMatches();
                this.isAnimating = false;
            }
        });
    }

    async resolveMatches() {
        const matches = this.findMatches();
        if (matches.length === 0) return;

        await this.removeMatches(matches);
        await this.dropTiles();
        await this.resolveMatches();
    }

    findMatches() {
        const result = new Set();

        // horizontal
        for (let r = 0; r < this.gridSize; r++) {
            let count = 1;
            for (let c = 1; c <= this.gridSize; c++) {
                const curr = this.tiles[r][c];
                const prev = this.tiles[r][c - 1];

                if (curr && prev && curr.colorValue === prev.colorValue) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let k = 0; k < count; k++) {
                            result.add(this.tiles[r][c - 1 - k]);
                        }
                    }
                    count = 1;
                }
            }
        }

        // vertical
        for (let c = 0; c < this.gridSize; c++) {
            let count = 1;
            for (let r = 1; r <= this.gridSize; r++) {
                const curr = this.tiles[r]?.[c];
                const prev = this.tiles[r - 1]?.[c];

                if (curr && prev && curr.colorValue === prev.colorValue) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let k = 0; k < count; k++) {
                            result.add(this.tiles[r - 1 - k][c]);
                        }
                    }
                    count = 1;
                }
            }
        }

        return Array.from(result);
    }

    async removeMatches(matches) {
        return new Promise(resolve => {
            this.tweens.add({
                targets: matches,
                scale: 0,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    matches.forEach(tile => {
                        this.tiles[tile.row][tile.col] = null;
                        tile.destroy();
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
                if (!tile) {
                    empty++;
                } else if (empty > 0) {
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
                this.spawnTile(i, c, true);
            }
        }

        return new Promise(r => this.time.delayedCall(250, r));
    }
}
