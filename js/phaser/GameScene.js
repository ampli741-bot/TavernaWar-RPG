import { app } from "../core/app.js";

const SIZE = 8;
const TILE = 80;

const COLORS = [
    { key: "damage", color: 0xff4444 },
    { key: "mana",   color: 0x4488ff },
    { key: "heal",   color: 0x44ff44 },
    { key: "gold",   color: 0xffdd44 },
    { key: "curse",  color: 0xaa44ff }
];

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    create() {
        console.log("🎮 GameScene create");

        this.grid = [];
        this.tiles = [];
        this.selected = null;
        this.locked = false;
        this.turnResult = this.emptyTurn();

        for (let y = 0; y < SIZE; y++) {
            this.grid[y] = [];
            this.tiles[y] = [];

            for (let x = 0; x < SIZE; x++) {
                let tile;
                do {
                    tile = this.spawnTile(x, y);
                } while (this.createsMatch(x, y, tile.type));

                this.grid[y][x] = tile.type;
                this.tiles[y][x] = tile;
            }
        }
    }

    emptyTurn() {
        return { damage: 0, mana: 0, heal: 0, gold: 0, curse: 0 };
    }

    spawnTile(x, y) {
        const t = Phaser.Utils.Array.GetRandom(COLORS);
        const rect = this.add.rectangle(
            x * TILE + TILE / 2,
            y * TILE + TILE / 2,
            TILE - 4,
            TILE - 4,
            t.color
        ).setInteractive();

        rect.data = { x, y, type: t.key };
        rect.on("pointerdown", () => this.clickTile(rect));

        return { rect, type: t.key };
    }

    createsMatch(x, y, type) {
        return (
            (x >= 2 &&
                this.grid[y][x - 1] === type &&
                this.grid[y][x - 2] === type) ||
            (y >= 2 &&
                this.grid[y - 1][x] === type &&
                this.grid[y - 2][x] === type)
        );
    }

    clickTile(tile) {
        if (this.locked) return;

        if (!this.selected) {
            this.selected = tile;
            tile.setStrokeStyle(3, 0xffffff);
            return;
        }

        const a = this.selected;
        const b = tile;

        this.selected.setStrokeStyle();
        this.selected = null;

        const dx = Math.abs(a.data.x - b.data.x);
        const dy = Math.abs(a.data.y - b.data.y);

        if (dx + dy !== 1) return;

        this.swap(a.data.x, a.data.y, b.data.x, b.data.y);
    }

    swap(ax, ay, bx, by) {
        if (this.locked) return;
        if (!this.tiles[ay][ax] || !this.tiles[by][bx]) return;

        this.locked = true;

        this.swapData(ax, ay, bx, by);

        if (!this.hasMatches()) {
            this.time.delayedCall(150, () => {
                this.swapData(ax, ay, bx, by);
                this.locked = false;
            });
            return;
        }

        this.resolveMatches();
    }

    swapData(ax, ay, bx, by) {
        const a = this.tiles[ay][ax];
        const b = this.tiles[by][bx];
        if (!a || !b) return;

        [this.grid[ay][ax], this.grid[by][bx]] =
        [this.grid[by][bx], this.grid[ay][ax]];

        [this.tiles[ay][ax], this.tiles[by][bx]] =
        [this.tiles[by][bx], this.tiles[ay][ax]];

        a.rect.setPosition(bx * TILE + TILE / 2, by * TILE + TILE / 2);
        b.rect.setPosition(ax * TILE + TILE / 2, ay * TILE + TILE / 2);

        a.rect.data.x = bx; a.rect.data.y = by;
        b.rect.data.x = ax; b.rect.data.y = ay;
    }

    hasMatches() {
        return this.findMatches().length > 0;
    }

    findMatches() {
        const matches = [];
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const t = this.grid[y][x];
                if (!t) continue;

                if (x < SIZE - 2 &&
                    t === this.grid[y][x + 1] &&
                    t === this.grid[y][x + 2]) {
                    matches.push({ x, y, type: t });
                }

                if (y < SIZE - 2 &&
                    t === this.grid[y + 1][x] &&
                    t === this.grid[y + 2][x]) {
                    matches.push({ x, y, type: t });
                }
            }
        }
        return matches;
    }

    resolveMatches() {
        const matches = this.findMatches();
        if (!matches.length) {
            console.log("TURN RESULT:", this.turnResult);
            this.turnResult = this.emptyTurn();
            this.locked = false;
            return;
        }

        matches.forEach(m => this.turnResult[m.type]++);

        matches.forEach(m => {
            const tile = this.tiles[m.y][m.x];
            if (!tile) return;
            tile.rect.destroy();
            this.tiles[m.y][m.x] = null;
            this.grid[m.y][m.x] = null;
        });

        this.time.delayedCall(200, () => this.dropTiles());
    }

    dropTiles() {
        for (let x = 0; x < SIZE; x++) {
            for (let y = SIZE - 1; y >= 0; y--) {
                if (this.grid[y][x] === null) {
                    for (let yy = y - 1; yy >= 0; yy--) {
                        if (this.grid[yy][x] !== null) {
                            this.grid[y][x] = this.grid[yy][x];
                            this.tiles[y][x] = this.tiles[yy][x];
                            this.grid[yy][x] = null;
                            this.tiles[yy][x] = null;

                            const tile = this.tiles[y][x];
                            tile.rect.data.y = y;
                            tile.rect.y = y * TILE + TILE / 2;
                            break;
                        }
                    }
                }
            }
        }

        for (let x = 0; x < SIZE; x++) {
            for (let y = 0; y < SIZE; y++) {
                if (this.grid[y][x] === null) {
                    const tile = this.spawnTile(x, y);
                    this.grid[y][x] = tile.type;
                    this.tiles[y][x] = tile;
                }
            }
        }

        this.time.delayedCall(200, () => this.resolveMatches());
    }
}
