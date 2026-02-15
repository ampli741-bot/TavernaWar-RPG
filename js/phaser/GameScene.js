import { app } from "../core/app.js";

const SIZE = 8;
const TILE = 80;
const SPEED = 150;

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
        this.turn = this.emptyTurn();

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

    spawnTile(x, y, fromTop = false) {
        const t = Phaser.Utils.Array.GetRandom(COLORS);

        const rect = this.add.rectangle(
            x * TILE + TILE / 2,
            fromTop ? -TILE : y * TILE + TILE / 2,
            TILE - 6,
            TILE - 6,
            t.color
        ).setInteractive();

        rect.on("pointerdown", () => this.click(x, y));

        if (fromTop) {
            this.tweens.add({
                targets: rect,
                y: y * TILE + TILE / 2,
                duration: SPEED
            });
        }

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

    click(x, y) {
        if (this.locked) return;

        if (!this.selected) {
            this.selected = { x, y };
            this.tiles[y][x].rect.setStrokeStyle(3, 0xffffff);
            return;
        }

        const a = this.selected;
        const b = { x, y };
        this.tiles[a.y][a.x].rect.setStrokeStyle();
        this.selected = null;

        if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) return;

        this.trySwap(a, b);
    }

    trySwap(a, b) {
        this.locked = true;

        const A = this.tiles[a.y][a.x];
        const B = this.tiles[b.y][b.x];

        this.animateSwap(A.rect, B.rect, () => {
            this.swapData(a, b);

            if (!this.hasMatches()) {
                // ❌ НЕТ совпадения → откат
                this.animateSwap(B.rect, A.rect, () => {
                    this.swapData(a, b);
                    this.locked = false;
                });
                return;
            }

            this.resolve();
        });
    }

    animateSwap(r1, r2, done) {
        this.tweens.add({
            targets: r1,
            x: r2.x,
            y: r2.y,
            duration: SPEED
        });
        this.tweens.add({
            targets: r2,
            x: r1.x,
            y: r1.y,
            duration: SPEED,
            onComplete: done
        });
    }

    swapData(a, b) {
        [this.grid[a.y][a.x], this.grid[b.y][b.x]] =
        [this.grid[b.y][b.x], this.grid[a.y][a.x]];

        [this.tiles[a.y][a.x], this.tiles[b.y][b.x]] =
        [this.tiles[b.y][b.x], this.tiles[a.y][a.x]];
    }

    hasMatches() {
        return this.findMatches().length > 0;
    }

    findMatches() {
        const out = [];
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const t = this.grid[y][x];
                if (!t) continue;

                if (x < SIZE - 2 &&
                    t === this.grid[y][x + 1] &&
                    t === this.grid[y][x + 2]) out.push({ x, y, type: t });

                if (y < SIZE - 2 &&
                    t === this.grid[y + 1][x] &&
                    t === this.grid[y + 2][x]) out.push({ x, y, type: t });
            }
        }
        return out;
    }

    resolve() {
        const matches = this.findMatches();
        if (!matches.length) {
            console.log("TURN RESULT:", this.turn);
            this.turn = this.emptyTurn();
            this.locked = false;
            return;
        }

        matches.forEach(m => this.turn[m.type]++);

        matches.forEach(m => {
            const t = this.tiles[m.y][m.x];
            this.tweens.add({
                targets: t.rect,
                alpha: 0,
                scale: 0.2,
                duration: 120,
                onComplete: () => t.rect.destroy()
            });
            this.tiles[m.y][m.x] = null;
            this.grid[m.y][m.x] = null;
        });

        this.time.delayedCall(150, () => this.gravity());
    }

    gravity() {
        for (let x = 0; x < SIZE; x++) {
            for (let y = SIZE - 1; y >= 0; y--) {
                if (!this.grid[y][x]) {
                    for (let yy = y - 1; yy >= 0; yy--) {
                        if (this.grid[yy][x]) {
                            this.grid[y][x] = this.grid[yy][x];
                            this.tiles[y][x] = this.tiles[yy][x];
                            this.grid[yy][x] = null;
                            this.tiles[yy][x] = null;

                            this.tweens.add({
                                targets: this.tiles[y][x].rect,
                                y: y * TILE + TILE / 2,
                                duration: SPEED
                            });
                            break;
                        }
                    }
                }
            }
        }

        for (let x = 0; x < SIZE; x++) {
            for (let y = 0; y < SIZE; y++) {
                if (!this.grid[y][x]) {
                    const t = this.spawnTile(x, y, true);
                    this.grid[y][x] = t.type;
                    this.tiles[y][x] = t;
                }
            }
        }

        this.time.delayedCall(200, () => this.resolve());
    }
}
