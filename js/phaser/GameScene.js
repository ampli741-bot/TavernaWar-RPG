import { app } from "../core/app.js";

const SIZE = 8;
const TILE = 80;

const COLORS = [
    { key: "damage", color: 0xff4444 }, // красный
    { key: "mana",   color: 0x4488ff }, // синий
    { key: "heal",   color: 0x44ff44 }, // зелёный
    { key: "gold",   color: 0xffdd44 }, // жёлтый
    { key: "curse",  color: 0xaa44ff }  // фиолетовый
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

    /* =========================
       UTILS
    ========================= */

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

        rect.on("pointerdown", () => this.clickTile(x, y));

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

    /* =========================
       INPUT
    ========================= */

    clickTile(x, y) {
        if (this.locked) return;
        if (!this.tiles[y][x]) return;

        if (!this.selected) {
            this.selected = { x, y };
            this.tiles[y][x].rect.setStrokeStyle(3, 0xffffff);
            return;
        }

        const a = this.selected;
        const b = { x, y };

        this.tiles[a.y][a.x].rect.setStrokeStyle();
        this.selected = null;

        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);

        if (dx + dy !== 1) return;

        this.swap(a.x, a.y, b.x, b.y);
    }

    /* =========================
       SWAP
    ========================= */

    swap(ax, ay, bx, by) {
        if (this.locked) return;
        if (!this.tiles[ay][ax] || !this.tiles[by][bx]) return;

        this.locked = true;

        this.swapData(ax, ay, bx, by);

        if (!this.hasMatches()) {
            // ❌ пустой ход — вернуть назад
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
    }

    /* =========================
       MATCH LOGIC
    ========================= */

    hasMatches() {
        return this.findMatches().length > 0;
    }

    findMatches() {
        const matches = [];

        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const t = this.grid[y][x];
                if (!t) continue;

                if (
                    x < SIZE - 2 &&
                    t === this.grid[y][x + 1] &&
                    t === this.grid[y][x + 2]
                ) matches.push({ x, y, type: t });

                if (
                    y < SIZE - 2 &&
                    t === this.grid[y + 1][x] &&
                    t === this.grid[y + 2][x]
                ) matches.push({ x, y, type: t });
            }
        }
        return matches;
    }

    resolveMatches() {
        const matches = this.findMatches();

        if (!matches.length) {
            console.log("TURN RESULT:", this.turnResult);

            // 🔥 пример применения (можно расширять)
            if (app.player && app.mob) {
                app.mob.hp -= this.turnResult.damage * 10;
                app.player.mana += this.turnResult.mana * 5;
                app.player.gold += this.turnResult.gold;
                app.player.curse += this.turnResult.curse;
            }

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

    /* =========================
       GRAVITY
    ========================= */

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

                            this.tiles[y][x].rect.y =
                                y * TILE + TILE / 2;
                            break;
                        }
                    }
                }
            }
        }

        // новые плитки сверху
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
