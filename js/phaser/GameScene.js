import { app } from "../core/app.js";

/* ================= VERSION ================= */
const VERSION = "2";

/* ================= CONFIG ================= */
const SIZE = 8;
const TILE = 80;

// размеры UI
const PANEL_W = 220;
const FIELD_W = SIZE * TILE;
const SCREEN_W = PANEL_W * 2 + FIELD_W;
const SCREEN_H = FIELD_W;

// смещение поля
const FIELD_X = PANEL_W;
const FIELD_Y = 0;

const TYPES = [
    { key: "damage", color: 0xff4444, score: 5 }, // красный
    { key: "mana",   color: 0x4488ff, score: 1 }, // синий
    { key: "heal",   color: 0x44ff44, score: 1 }, // зелёный
    { key: "gold",   color: 0xffdd44, score: 3 }, // жёлтый
    { key: "curse",  color: 0xaa44ff, score: 2 }  // фиолетовый
];

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
        this.grid = [];
        this.tiles = [];
        this.selected = null;
        this.locked = false;
        this.turnOwner = "player";
    }

    /* ================= CREATE ================= */

    create() {
        console.log("🎮 GameScene create");
        console.log("🧩 VERSION:", VERSION);

        this.cameras.main.setSize(SCREEN_W, SCREEN_H);

        this.drawPanels();
        this.drawVersion();

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

    /* ================= UI ================= */

    drawPanels() {
        // левое окно игрока
        this.add.rectangle(
            PANEL_W / 2,
            SCREEN_H / 2,
            PANEL_W - 10,
            SCREEN_H - 10,
            0x1e1e1e
        ).setStrokeStyle(2, 0xffffff);

        // правое окно врага
        this.add.rectangle(
            SCREEN_W - PANEL_W / 2,
            SCREEN_H / 2,
            PANEL_W - 10,
            SCREEN_H - 10,
            0x1e1e1e
        ).setStrokeStyle(2, 0xffffff);

        // места под иконки
        this.add.rectangle(PANEL_W / 2, 60, PANEL_W - 30, 80, 0x2a2a2a);
        this.add.rectangle(SCREEN_W - PANEL_W / 2, 60, PANEL_W - 30, 80, 0x2a2a2a);
    }

    drawVersion() {
        this.add.text(10, 10, `v${VERSION}`, {
            fontSize: "14px",
            color: "#ffffff",
            backgroundColor: "#000000",
            padding: { x: 6, y: 4 }
        }).setDepth(9999);
    }

    /* ================= TILE ================= */

    spawnTile(x, y) {
        const t = Phaser.Utils.Array.GetRandom(TYPES);

        const rect = this.add.rectangle(
            FIELD_X + x * TILE + TILE / 2,
            FIELD_Y + y * TILE + TILE / 2,
            TILE - 6,
            TILE - 6,
            t.color
        ).setInteractive();

        const tile = { rect, type: t.key, x, y };
        rect.on("pointerdown", () => this.onClick(tile));
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

    onClick(tile) {
        if (this.locked || this.turnOwner !== "player") return;

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

        for (let y = 0; y < SIZE; y++) {
            let run = 1;
            for (let x = 1; x <= SIZE; x++) {
                if (x < SIZE && this.grid[y][x] === this.grid[y][x - 1]) run++;
                else {
                    if (run >= 3) {
                        for (let i = 0; i < run; i++)
                            res.push(this.tiles[y][x - 1 - i]);
                    }
                    run = 1;
                }
            }
        }

        for (let x = 0; x < SIZE; x++) {
            let run = 1;
            for (let y = 1; y <= SIZE; y++) {
                if (y < SIZE && this.grid[y][x] === this.grid[y - 1][x]) run++;
                else {
                    if (run >= 3) {
                        for (let i = 0; i < run; i++)
                            res.push(this.tiles[y - 1 - i][x]);
                    }
                    run = 1;
                }
            }
        }

        return [...new Set(res)];
    }

    /* ================= TURN ================= */

    resolveTurn(matches) {
        const result = { damage:0, mana:0, heal:0, gold:0, curse:0 };
        matches.forEach(t => result[t.type]++);

        this.removeMatches(matches, () => {
            this.gravity(() => {
                const again = this.findMatches();
                if (again.length) this.resolveTurn(again);
                else this.applyTurnResult(result);
            });
        });
    }

    applyTurnResult(result) {
        if (this.turnOwner === "player") {
            const dmg = result.damage * 10;
            app.mob.hp -= dmg;
            console.log("⚔️ Player dmg:", dmg);

            this.turnOwner = "enemy";
            this.time.delayedCall(500, () => this.enemyMove());
        } else {
            const dmg = result.damage * 8 + result.gold * 4;
            app.player.hp -= dmg;
            console.log("👹 Enemy dmg:", dmg);

            this.turnOwner = "player";
            this.locked = false;
        }
    }

    /* ================= SMART ENEMY ================= */

    enemyMove() {
        console.log("👹 ENEMY MOVE v" + VERSION);

        const best = this.findBestEnemyMove();
        if (!best) {
            console.log("👹 Enemy has no moves");
            this.turnOwner = "player";
            this.locked = false;
            return;
        }

        console.log("👹 Enemy choose move score =", best.score, best.preview);
        this.trySwap(best.a, best.b);
    }

    findBestEnemyMove() {
        let best = null;

        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const a = this.tiles[y][x];
                if (!a) continue;

                const dirs = [[1,0],[0,1]];
                for (let [dx,dy] of dirs) {
                    const nx = x+dx, ny = y+dy;
                    if (nx>=SIZE||ny>=SIZE) continue;
                    const b = this.tiles[ny][nx];

                    this.swapData(a,b);
                    const matches = this.findMatches();
                    this.swapData(a,b);

                    if (!matches.length) continue;

                    const preview = { damage:0, mana:0, heal:0, gold:0, curse:0 };
                    let score = 0;

                    matches.forEach(t => {
                        preview[t.type]++;
                        const typeDef = TYPES.find(tt => tt.key === t.type);
                        score += typeDef.score;
                    });

                    if (!best || score > best.score) {
                        best = { a, b, score, preview };
                    }
                }
            }
        }
        return best;
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
                            y: FIELD_Y + writeY * TILE + TILE / 2,
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
                    y: FIELD_Y + y * TILE + TILE / 2,
                    duration: 220,
                    ease: "Bounce.Out"
                });
            }
        }

        this.time.delayedCall(260, done);
    }
}
