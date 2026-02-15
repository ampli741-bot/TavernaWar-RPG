export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    create() {
        console.log("GameScene create V6.1");

        this.SIZE = 8;
        this.TILE = 64;
        this.OFFSET_X = 360;
        this.OFFSET_Y = 80;

        this.colors = ["red", "blue", "green", "yellow", "purple"];
        this.colorMap = {
            red: 0xff4b4b,
            blue: 0x4b8bff,
            green: 0x4bff6a,
            yellow: 0xffe04b,
            purple: 0xb44bff
        };

        this.grid = [];
        this.tiles = [];

        this.selected = null;
        this.turn = "player";
        this.inputLocked = false;

        this.createGrid();
    }

    createGrid() {
        for (let y = 0; y < this.SIZE; y++) {
            this.grid[y] = [];
            this.tiles[y] = [];
            for (let x = 0; x < this.SIZE; x++) {
                let color;
                do {
                    color = Phaser.Utils.Array.GetRandom(this.colors);
                } while (
                    (x >= 2 &&
                        this.grid[y][x - 1] === color &&
                        this.grid[y][x - 2] === color) ||
                    (y >= 2 &&
                        this.grid[y - 1][x] === color &&
                        this.grid[y - 2][x] === color)
                );

                this.grid[y][x] = color;
                this.spawnTile(x, y, color);
            }
        }
    }

    spawnTile(x, y, color) {
        const rect = this.add.rectangle(
            this.OFFSET_X + x * this.TILE,
            this.OFFSET_Y + y * this.TILE,
            this.TILE - 6,
            this.TILE - 6,
            this.colorMap[color]
        );

        rect.setInteractive();
        rect.on("pointerdown", () => this.clickTile(x, y));

        rect.gridX = x;
        rect.gridY = y;
        rect.color = color;

        this.tiles[y][x] = rect;
    }

    clickTile(x, y) {
        if (this.turn !== "player" || this.inputLocked) return;

        if (!this.selected) {
            this.selected = { x, y };
            this.tiles[y][x].setStrokeStyle(3, 0xffffff);
            return;
        }

        const a = this.selected;
        const b = { x, y };
        this.clearSelection();

        if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) return;

        this.trySwap(a, b);
    }

    clearSelection() {
        if (this.selected) {
            const t = this.tiles[this.selected.y][this.selected.x];
            t.setStrokeStyle();
        }
        this.selected = null;
    }

    trySwap(a, b) {
        this.swapData(a, b);

        if (this.findMatches().length === 0) {
            this.swapData(a, b);
            return;
        }

        this.inputLocked = true;
        this.resolveBoard(() => {
            this.turn = "mob";
            this.mobTurn();
        });
    }

    mobTurn() {
        console.log("MOB TURN");

        const moves = this.findAllValidMoves();
        if (moves.length === 0) {
            this.turn = "player";
            this.inputLocked = false;
            return;
        }

        const move = Phaser.Utils.Array.GetRandom(moves);
        this.swapData(move.a, move.b);

        this.resolveBoard(() => {
            this.turn = "player";
            this.inputLocked = false;
        });
    }

    resolveBoard(onComplete) {
        const matches = this.findMatches();
        if (matches.length === 0) {
            onComplete && onComplete();
            return;
        }

        matches.forEach(({ x, y }) => {
            this.tiles[y][x].destroy();
            this.tiles[y][x] = null;
            this.grid[y][x] = null;
        });

        this.time.delayedCall(200, () => {
            this.dropTiles();
            this.time.delayedCall(200, () => {
                this.resolveBoard(onComplete);
            });
        });
    }

    dropTiles() {
        for (let x = 0; x < this.SIZE; x++) {
            for (let y = this.SIZE - 1; y >= 0; y--) {
                if (this.grid[y][x] === null) {
                    for (let yy = y - 1; yy >= 0; yy--) {
                        if (this.grid[yy][x]) {
                            this.grid[y][x] = this.grid[yy][x];
                            this.tiles[y][x] = this.tiles[yy][x];

                            this.tiles[y][x].gridY = y;
                            this.tweens.add({
                                targets: this.tiles[y][x],
                                y: this.OFFSET_Y + y * this.TILE,
                                duration: 150
                            });

                            this.grid[yy][x] = null;
                            this.tiles[yy][x] = null;
                            break;
                        }
                    }

                    if (!this.grid[y][x]) {
                        const color = Phaser.Utils.Array.GetRandom(this.colors);
                        this.grid[y][x] = color;
                        this.spawnTile(x, y, color);
                    }
                }
            }
        }
    }

    swapData(a, b) {
        [this.grid[a.y][a.x], this.grid[b.y][b.x]] =
            [this.grid[b.y][b.x], this.grid[a.y][a.x]];

        [this.tiles[a.y][a.x], this.tiles[b.y][b.x]] =
            [this.tiles[b.y][b.x], this.tiles[a.y][a.x]];

        this.updateTilePosition(this.tiles[a.y][a.x], a.x, a.y);
        this.updateTilePosition(this.tiles[b.y][b.x], b.x, b.y);
    }

    updateTilePosition(tile, x, y) {
        tile.gridX = x;
        tile.gridY = y;
        this.tweens.add({
            targets: tile,
            x: this.OFFSET_X + x * this.TILE,
            y: this.OFFSET_Y + y * this.TILE,
            duration: 150
        });
    }

    findMatches() {
        const res = [];

        for (let y = 0; y < this.SIZE; y++) {
            for (let x = 0; x < this.SIZE - 2; x++) {
                const c = this.grid[y][x];
                if (c && c === this.grid[y][x + 1] && c === this.grid[y][x + 2]) {
                    res.push({ x, y }, { x: x + 1, y }, { x: x + 2, y });
                }
            }
        }

        for (let x = 0; x < this.SIZE; x++) {
            for (let y = 0; y < this.SIZE - 2; y++) {
                const c = this.grid[y][x];
                if (c && c === this.grid[y + 1][x] && c === this.grid[y + 2][x]) {
                    res.push({ x, y }, { x, y: y + 1 }, { x, y: y + 2 });
                }
            }
        }

        return res;
    }

    findAllValidMoves() {
        const moves = [];

        for (let y = 0; y < this.SIZE; y++) {
            for (let x = 0; x < this.SIZE; x++) {
                const dirs = [
                    { x: x + 1, y },
                    { x, y: y + 1 }
                ];

                dirs.forEach(d => {
                    if (d.x < this.SIZE && d.y < this.SIZE) {
                        this.swapData({ x, y }, d);
                        if (this.findMatches().length > 0) {
                            moves.push({ a: { x, y }, b: d });
                        }
                        this.swapData({ x, y }, d);
                    }
                });
            }
        }

        return moves;
    }
}
