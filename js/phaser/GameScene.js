// js/phaser/GameScene.js
const VERSION = "v7.1";

const COLS = 8;
const ROWS = 8;
const TILE = 56;

const COLORS = [
    { key: "red",    value: "damage", color: 0xff4444 },
    { key: "blue",   value: "mana",   color: 0x4488ff },
    { key: "green",  value: "heal",   color: 0x44ff44 },
    { key: "yellow", value: "gold",   color: 0xffdd44 },
    { key: "purple", value: "curse",  color: 0xaa44ff }
];

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    preload() {
        this.load.image("bg", "assets/bg.jpg");
        this.load.image("hero", "assets/hero_warrior.jpg");
    }

    create() {
        console.log("🎮 GameScene create", VERSION);

        this.turnLock = false;
        this.isPlayerTurn = true;
        this.selected = null;

        // ===== BACKGROUND =====
        const bg = this.add.image(640, 360, "bg");
        bg.setDisplaySize(1280, 720);

        // ===== VERSION LABEL =====
        this.add.text(640, 10, VERSION, {
            font: "16px monospace",
            color: "#fff"
        }).setOrigin(0.5, 0);

        // ===== PANELS =====
        this.createPanels();

        // ===== BOARD POSITION =====
        this.boardX = 640 - (COLS * TILE) / 2;
        this.boardY = 360 - (ROWS * TILE) / 2;

        // ===== GRID =====
        this.grid = [];
        this.drawGrid();

        this.input.on("pointerdown", this.onClick, this);
    }

    createPanels() {
        // LEFT PANEL
        this.add.rectangle(120, 360, 200, 600)
            .setStrokeStyle(2, 0xffffff);

        this.add.text(120, 60, "PLAYER", {
            font: "20px Cinzel",
            color: "#fff"
        }).setOrigin(0.5);

        // HERO ICON (CIRCLE)
        const heroImg = this.add.image(120, 140, "hero").setDisplaySize(96, 96);
        const mask = this.make.graphics().fillCircle(120, 140, 48);
        heroImg.setMask(mask.createGeometryMask());

        // RIGHT PANEL
        this.add.rectangle(1160, 360, 200, 600)
            .setStrokeStyle(2, 0xffffff);

        this.add.text(1160, 60, "MOB", {
            font: "20px Cinzel",
            color: "#fff"
        }).setOrigin(0.5);
    }

    drawGrid() {
        for (let y = 0; y < ROWS; y++) {
            this.grid[y] = [];
            for (let x = 0; x < COLS; x++) {
                let tile;
                do {
                    tile = this.createTile(x, y);
                } while (this.createsMatch(x, y, tile.type));

                this.grid[y][x] = tile;
            }
        }
    }

    createTile(x, y) {
        const type = Phaser.Utils.Array.GetRandom(COLORS);
        const rect = this.add.rectangle(
            this.boardX + x * TILE + TILE / 2,
            this.boardY + y * TILE + TILE / 2,
            TILE - 4,
            TILE - 4,
            type.color
        );

        return { x, y, type, rect };
    }

    onClick(pointer) {
        if (this.turnLock || !this.isPlayerTurn) return;

        const x = Math.floor((pointer.x - this.boardX) / TILE);
        const y = Math.floor((pointer.y - this.boardY) / TILE);

        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;

        const tile = this.grid[y][x];
        if (!tile) return;

        if (!this.selected) {
            this.selected = tile;
            tile.rect.setStrokeStyle(3, 0xffffff);
            return;
        }

        if (this.isAdjacent(this.selected, tile)) {
            this.swapAndResolve(this.selected, tile);
        }

        this.selected.rect.setStrokeStyle();
        this.selected = null;
    }

    isAdjacent(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
    }

    swapAndResolve(a, b) {
        this.turnLock = true;
        this.swap(a, b);

        if (this.findMatches().length === 0) {
            this.time.delayedCall(150, () => {
                this.swap(a, b);
                this.turnLock = false;
            });
            return;
        }

        this.resolveTurn(true);
    }

    swap(a, b) {
        [a.type, b.type] = [b.type, a.type];
        a.rect.fillColor = a.type.color;
        b.rect.fillColor = b.type.color;
    }

    resolveTurn(playerTurn) {
        const matches = this.findMatches();
        if (matches.length === 0) {
            if (playerTurn) {
                this.isPlayerTurn = false;
                this.time.delayedCall(400, () => this.mobTurn());
            } else {
                this.isPlayerTurn = true;
            }
            this.turnLock = false;
            return;
        }

        this.removeMatches(matches);
        this.time.delayedCall(200, () => {
            this.dropTiles();
            this.resolveTurn(playerTurn);
        });
    }

    findMatches() {
        const matches = [];

        // horizontal
        for (let y = 0; y < ROWS; y++) {
            let run = [this.grid[y][0]];
            for (let x = 1; x < COLS; x++) {
                if (this.grid[y][x].type === run[0].type) {
                    run.push(this.grid[y][x]);
                } else {
                    if (run.length >= 3) matches.push(...run);
                    run = [this.grid[y][x]];
                }
            }
            if (run.length >= 3) matches.push(...run);
        }

        // vertical
        for (let x = 0; x < COLS; x++) {
            let run = [this.grid[0][x]];
            for (let y = 1; y < ROWS; y++) {
                if (this.grid[y][x].type === run[0].type) {
                    run.push(this.grid[y][x]);
                } else {
                    if (run.length >= 3) matches.push(...run);
                    run = [this.grid[y][x]];
                }
            }
            if (run.length >= 3) matches.push(...run);
        }

        return [...new Set(matches)];
    }

    removeMatches(matches) {
        matches.forEach(t => {
            t.type = null;
            t.rect.fillColor = 0x000000;
        });
    }

    dropTiles() {
        for (let x = 0; x < COLS; x++) {
            for (let y = ROWS - 1; y >= 0; y--) {
                if (!this.grid[y][x].type) {
                    for (let yy = y - 1; yy >= 0; yy--) {
                        if (this.grid[yy][x].type) {
                            this.grid[y][x].type = this.grid[yy][x].type;
                            this.grid[y][x].rect.fillColor = this.grid[y][x].type.color;
                            this.grid[yy][x].type = null;
                            this.grid[yy][x].rect.fillColor = 0x000000;
                            break;
                        }
                    }
                    if (!this.grid[y][x].type) {
                        const t = Phaser.Utils.Array.GetRandom(COLORS);
                        this.grid[y][x].type = t;
                        this.grid[y][x].rect.fillColor = t.color;
                    }
                }
            }
        }
    }

    createsMatch(x, y, type) {
        if (x >= 2) {
            if (
                this.grid[y][x - 1]?.type === type &&
                this.grid[y][x - 2]?.type === type
            ) return true;
        }
        if (y >= 2) {
            if (
                this.grid[y - 1][x]?.type === type &&
                this.grid[y - 2][x]?.type === type
            ) return true;
        }
        return false;
    }

    mobTurn() {
        console.log("👹 MOB TURN");
        this.isPlayerTurn = true;
    }
}
