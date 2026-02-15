import { app } from "../core/app.js";

const SIZE = 8;
const TILE = 80;

const TYPES = [
    { key: "damage", color: 0xff4444 },
    { key: "mana",   color: 0x4488ff },
    { key: "heal",   color: 0x44ff44 },
    { key: "gold",   color: 0xffdd44 },
    { key: "curse",  color: 0xaa44ff }
];

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
        this.grid = [];
        this.tiles = [];
        this.selected = null;
        this.locked = false;
    }

    create() {
        console.log("🎮 GameScene create");

        for (let y = 0; y < SIZE; y++) {
            this.grid[y] = [];
            this.tiles[y] = [];

            for (let x = 0; x < SIZE; x++) {
                let tile;
                do {
                    tile = this.spawnTile(x, y);
                } while (this.causesMatch(x, y, tile.type));

                this.grid[y][x] = tile.type;
                this.tiles[y][x] = tile;
            }
        }
    }

    /* ================= TILE ================= */

    spawnTile(x, y) {
        const t = Phaser.Utils.Array.GetRandom(TYPES);

        const rect = this.add.rectangle(
            x * TILE + TILE / 2,
            y * TILE + TILE / 2,
            TILE - 6,
            TILE - 6,
            t.color
        ).setInteractive();

        const tile = { rect, type: t.key, x, y };
        rect.on("pointerdown", () => this.click(tile));

        return tile;
    }

    causesMatch(x, y, type) {
        if (x >= 2 &&
            this.grid[y][x - 1] === type &&
            this.grid[y][x - 2] === type) return true;

        if (y >= 2 &&
            this.grid[y - 1][x] === type &&
            this.grid[y - 2][x] === type) return true;

        return false;
    }

    /* ================= INPUT ================= */

    click(tile) {
        if (this.locked) return;

        if (!this.selected) {
            this.selected = tile;
            tile.rect.setStrokeStyle(3, 0xffffff);
            return;
        }

        const a = this.selected;
        const b = tile;

        a.rect.setStrokeStyle();
        this.selected = null;

        if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) return;

        this.trySwap(a, b);
    }

    /* ================= SWAP ================= */

    trySwap(a, b) {
        this.locked = true;

        this.animateSwap(a, b, () => {
            this.swapData(a, b);

            const matches = this.findMatches();
            if (!matches.length) {
                // ❌ откат
                this.animateSwap(a, b, () => {
                    this.swapData(a, b);
                    this.locked = false;
                });
            } else {
                this.resolveTurn(matches);
            }
        });
    }

    animateSwap(a, b, done) {
        this.tweens.add({
            targets: a.rect,
            x: b.rect.x,
            y: b.rect.y,
            duration: 120,
            ease: "Back.Out"
        });

        this.tweens.add({
            targets: b.rect,
            x: a.rect.x,
            y: a.rect.y,
            duration: 120,
            ease: "Back.Out",
            onComplete: done
        });
    }

    swapData(a, b) {
        [this.grid[a.y][a.x], this.grid[b.y][b.x]] =
        [this.grid[b.y][b.x], this.grid[a.y][a.x]];

        [this.tiles[a.y][a.x], this.tiles[b.y][b.x]] =
        [this.tiles[b.y][b.x], this.tiles[a.y][a.x]];

        [a.x, b.x] = [b.x, a.x];
        [a.y, b.y] = [b.y, a.y];
    }

    /* ================= MATCH ================= */

    findMatches() {
        const res = [];

        // rows
        for (let y = 0; y < SIZE; y++) {
            let run = 1;
            for (let x = 1; x <= SIZE; x++) {
                if (x < SIZE && this.grid[y][x] === this.grid[y][x - 1]) run++;
                else {
                    if (run >= 3) {
                        for (let i = 0; i < run; i++) {
                            res.push(this.tiles[y][x - 1 - i]);
                        }
                    }
                    run = 1;
                }
            }
        }

        // cols
        for (let x = 0; x < SIZE; x++) {
            let run = 1;
            for (let y = 1; y <= SIZE; y++) {
                if (y < SIZE && this.grid[y][x] === this.grid[y - 1][x]) run++;
                else {
                    if (run >= 3) {
                        for (let i = 0; i < run; i++) {
                            res.push(this.tiles[y - 1 - i][x]);
                        }
                    }
                    run = 1;
                }
            }
        }

        return [...new Set(res)];
    }

    /* ================= TURN ================= */

    resolveTurn(matches) {
        const result = { damage: 0, mana: 0, heal: 0, gold: 0, curse: 0 };
        matches.forEach(t => result[t.type]++);

        console.log("🧮 TURN RESULT:", result);

        this.removeMatches(matches, () => {
            this.gravity(() => {
                const again = this.findMatches();
                if (again.length) {
                    this.resolveTurn(again);
                } else {
                    this.applyPlayerTurn(result);
                }
            });
        });
    }

    applyPlayerTurn(result) {
        const dmg = result.damage * 10;
        app.mob.hp -= dmg;

        console.log(`⚔️ Player hits enemy for ${dmg}`);
        console.log(`👹 Enemy HP: ${app.mob.hp}`);

        if (app.mob.hp <= 0) {
            console.log("☠️ ENEMY DEFEATED");
            this.locked = false;
            return;
        }

        // ход врага
        this.time.delayedCall(500, () => this.enemyTurn());
    }

    enemyTurn() {
        console.log("👹 Enemy turn");

        const dmg = 8;
        app.player.hp -= dmg;

        console.log(`💥 Enemy hits player for ${dmg}`);
        console.log(`❤️ Player HP: ${app.player.hp}`);

        this.locked = false;
    }

    /* ================= REMOVE ================= */

    removeMatches(matches, done) {
        matches.forEach(t => {
            this.grid[t.y][t.x] = null;
            this.tiles[t.y][t.x] = null;

            this.tweens.add({
                targets: t.rect,
                scale: 0,
                duration: 150,
                ease: "Back.In",
                onComplete: () => t.rect.destroy()
            });
        });

        this.time.delayedCall(180, done);
    }

    /* ================= GRAVITY ================= */

    gravity(done) {
        for (let x = 0; x < SIZE; x++) {
            let writeY = SIZE - 1;

            for (let y = SIZE - 1; y >= 0; y--) {
                const t = this.tiles[y][x];
                if (t) {
                    if (y !== writeY) {
                        this.tiles[writeY][x] = t;
                        this.grid[writeY][x] = t.type;
                        this.tiles[y][x] = null;
                        this.grid[y][x] = null;

                        t.y = writeY;
                        this.tweens.add({
                            targets: t.rect,
                            y: writeY * TILE + TILE / 2,
                            duration: 200,
                            ease: "Bounce.Out"
                        });
                    }
                    writeY--;
                }
            }

            for (let y = writeY; y >= 0; y--) {
                const t = this.spawnTile(x, y);
                t.rect.y = -TILE;

                this.tiles[y][x] = t;
                this.grid[y][x] = t.type;

                this.tweens.add({
                    targets: t.rect,
                    y: y * TILE + TILE / 2,
                    duration: 220,
                    ease: "Bounce.Out"
                });
            }
        }

        this.time.delayedCall(260, done);
    }
}
