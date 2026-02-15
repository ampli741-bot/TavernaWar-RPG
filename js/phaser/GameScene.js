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
                const tile = this.spawnTile(x, y);
                this.grid[y][x] = tile.type;
                this.tiles[y][x] = tile;
            }
        }
    }

    emptyTurn() {
        return { damage: 0, mana: 0, heal: 0, gold: 0, curse: 0 };
    }

    spawnTile(x, y) {
        const type = Phaser.Utils.Array.GetRandom(COLORS);
        const rect = this.add.rectangle(
            x * TILE + TILE / 2,
            y * TILE + TILE / 2,
            TILE - 4,
            TILE - 4,
            type.color
        ).setInteractive();

        rect.data = { x, y, type: type.key };

        rect.on("pointerdown", () => this.clickTile(rect));

        return { rect, type: type.key };
    }

    clickTile(tile) {
        if (this.locked) return;

        const { x, y } = tile.data;
        console.log("CLICK", `[${x},${y}]`);

        if (!this.selected) {
            this.selected = tile;
            tile.setStrokeStyle(3, 0xffffff);
            return;
        }

        const dx = Math.abs(tile.data.x - this.selected.data.x);
        const dy = Math.abs(tile.data.y - this.selected.data.y);

        this.selected.setStrokeStyle();

        if (dx + dy === 1) {
            this.swapTiles(this.selected, tile);
        }

        this.selected = null;
    }

    swapTiles(a, b) {
        console.log("SWAP");
        this.locked = true;

        const ax = a.data.x, ay = a.data.y;
        const bx = b.data.x, by = b.data.y;

        [this.grid[ay][ax], this.grid[by][bx]] =
        [this.grid[by][bx], this.grid[ay][ax]];

        [this.tiles[ay][ax], this.tiles[by][bx]] =
        [this.tiles[by][bx], this.tiles[ay][ax]];

        a.data.x = bx; a.data.y = by;
        b.data.x = ax; b.data.y = ay;

        this.resolveMatches();
    }

    resolveMatches() {
        const matches = [];

        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                const t = this.grid[y][x];
                if (
                    x < SIZE - 2 &&
                    t === this.grid[y][x + 1] &&
                    t === this.grid[y][x + 2]
                ) {
                    matches.push({ x, y, type: t });
                }
            }
        }

        if (!matches.length) {
            console.log("TURN RESULT:", this.turnResult);

            if (app.player && app.mob) {
                app.mob.hp -= this.turnResult.damage * 10;
                app.player.mana += this.turnResult.mana * 5;
                app.player.gold += this.turnResult.gold;
            }

            this.turnResult = this.emptyTurn();
            this.locked = false;
            return;
        }

        matches.forEach(m => {
            this.turnResult[m.type]++;
        });

        this.time.delayedCall(200, () => this.resolveMatches());
    }
}
