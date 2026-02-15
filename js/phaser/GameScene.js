const VERSION = "v6.3";

const TILE_SIZE = 64;
const COLS = 8;
const ROWS = 8;

const COLORS = ["red", "blue", "green", "yellow", "purple"];

const COLOR_MAP = {
    red: 0xff4d4d,
    blue: 0x4d8cff,
    green: 0x4dff4d,
    yellow: 0xffe04d,
    purple: 0xb04dff
};

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    preload() {
        this.load.image("bg", "assets/bg.jpg");
        this.load.image("hero_warrior", "assets/hero_warrior.jpg");
        this.load.image("hero_mage", "assets/hero_mage.jpg");
        this.load.image("hero_archer", "assets/hero_archer.jpg");
        this.load.image("hero_assassin", "assets/hero_assassin.jpg");
    }

    create() {
        const { width, height } = this.scale;

        // ===== VERSION =====
        this.add.text(width / 2, 10, VERSION, {
            fontSize: "16px",
            color: "#ffffff"
        }).setOrigin(0.5, 0);

        // ===== PANELS =====
        this.createPanels(width, height);

        // ===== BOARD POSITION =====
        this.boardOffsetX = width / 2 - (COLS * TILE_SIZE) / 2;
        this.boardOffsetY = height / 2 - (ROWS * TILE_SIZE) / 2;

        // ===== BACKGROUND =====
        this.add.image(
            width / 2,
            height / 2,
            "bg"
        ).setDisplaySize(
            COLS * TILE_SIZE + 40,
            ROWS * TILE_SIZE + 40
        ).setDepth(-1);

        // ===== BOARD =====
        this.tiles = [];
        this.selected = null;
        this.isBusy = false;
        this.isPlayerTurn = true;

        this.createBoard();
    }

    createPanels(width, height) {
        // LEFT (PLAYER)
        const leftX = 40;
        this.add.rectangle(leftX, height / 2, 200, height - 80, 0x222222)
            .setStrokeStyle(2, 0xffffff);

        this.add.image(leftX, 100, "hero_warrior")
            .setDisplaySize(96, 96);

        // RIGHT (MOB)
        const rightX = width - 40;
        this.add.rectangle(rightX, height / 2, 200, height - 80, 0x222222)
            .setStrokeStyle(2, 0xffffff);

        this.add.image(rightX, 100, "hero_assassin")
            .setDisplaySize(96, 96);
    }

    createBoard() {
        for (let y = 0; y < ROWS; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < COLS; x++) {
                let color;
                do {
                    color = Phaser.Utils.Array.GetRandom(COLORS);
                } while (
                    (x >= 2 &&
                        this.tiles[y][x - 1]?.color === color &&
                        this.tiles[y][x - 2]?.color === color) ||
                    (y >= 2 &&
                        this.tiles[y - 1][x]?.color === color &&
                        this.tiles[y - 2][x]?.color === color)
                );

                const tile = this.createTile(x, y, color);
                this.tiles[y][x] = tile;
            }
        }
    }

    createTile(x, y, color) {
        const rect = this.add.rectangle(
            this.boardOffsetX + x * TILE_SIZE + TILE_SIZE / 2,
            this.boardOffsetY + y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE - 4,
            TILE_SIZE - 4,
            COLOR_MAP[color]
        ).setInteractive();

        rect.color = color;
        rect.gridX = x;
        rect.gridY = y;

        rect.on("pointerdown", () => this.onTileClick(rect));
        return rect;
    }

    onTileClick(tile) {
        if (this.isBusy || !this.isPlayerTurn) return;

        if (!this.selected) {
            this.selected = tile;
            tile.setStrokeStyle(4, 0xffffff);
            return;
        }

        if (this.isNeighbor(this.selected, tile)) {
            this.trySwap(this.selected, tile);
        }

        this.selected.setStrokeStyle();
        this.selected = null;
    }

    isNeighbor(a, b) {
        return (
            Math.abs(a.gridX - b.gridX) +
            Math.abs(a.gridY - b.gridY) === 1
        );
    }

    trySwap(a, b) {
        this.swapTiles(a, b);

        const matches = this.findMatches();
        if (matches.length === 0) {
            this.swapTiles(a, b);
            return;
        }

        this.isBusy = true;
        this.resolveMatches(matches, () => {
            this.isPlayerTurn = false;
            this.time.delayedCall(400, () => this.enemyTurn());
        });
    }

    swapTiles(a, b) {
        const ax = a.gridX, ay = a.gridY;
        const bx = b.gridX, by = b.gridY;

        this.tiles[ay][ax] = b;
        this.tiles[by][bx] = a;

        a.gridX = bx; a.gridY = by;
        b.gridX = ax; b.gridY = ay;

        this.moveTile(a);
        this.moveTile(b);
    }

    moveTile(tile) {
        this.tweens.add({
            targets: tile,
            x: this.boardOffsetX + tile.gridX * TILE_SIZE + TILE_SIZE / 2,
            y: this.boardOffsetY + tile.gridY * TILE_SIZE + TILE_SIZE / 2,
            duration: 150
        });
    }

    findMatches() {
        const matches = [];

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const t = this.tiles[y][x];
                if (!t) continue;

                const h = [t];
                for (let i = x + 1; i < COLS; i++) {
                    if (this.tiles[y][i]?.color === t.color) h.push(this.tiles[y][i]);
                    else break;
                }
                if (h.length >= 3) matches.push(...h);

                const v = [t];
                for (let i = y + 1; i < ROWS; i++) {
                    if (this.tiles[i][x]?.color === t.color) v.push(this.tiles[i][x]);
                    else break;
                }
                if (v.length >= 3) matches.push(...v);
            }
        }

        return [...new Set(matches)];
    }

    resolveMatches(matches, done) {
        matches.forEach(t => {
            this.tiles[t.gridY][t.gridX] = null;
            this.tweens.add({
                targets: t,
                alpha: 0,
                scale: 0,
                duration: 200,
                onComplete: () => t.destroy()
            });
        });

        this.time.delayedCall(250, () => {
            this.dropTiles();
            done();
        });
    }

    dropTiles() {
        for (let x = 0; x < COLS; x++) {
            let pointer = ROWS - 1;
            for (let y = ROWS - 1; y >= 0; y--) {
                if (this.tiles[y][x]) {
                    this.tiles[pointer][x] = this.tiles[y][x];
                    this.tiles[pointer][x].gridY = pointer;
                    this.moveTile(this.tiles[pointer][x]);
                    pointer--;
                }
            }
            for (let y = pointer; y >= 0; y--) {
                const color = Phaser.Utils.Array.GetRandom(COLORS);
                const t = this.createTile(x, y, color);
                t.y = this.boardOffsetY - TILE_SIZE;
                this.tiles[y][x] = t;
                this.moveTile(t);
            }
        }

        const chain = this.findMatches();
        if (chain.length > 0) {
            this.resolveMatches(chain, () => {});
        } else {
            this.isBusy = false;
            this.isPlayerTurn = true;
        }
    }

    enemyTurn() {
        // простой умный ход (лучший матч)
        const moves = [];

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const t = this.tiles[y][x];
                [[1,0],[0,1]].forEach(([dx,dy]) => {
                    const nx = x + dx, ny = y + dy;
                    if (!this.tiles[ny]?.[nx]) return;
                    this.swapTiles(t, this.tiles[ny][nx]);
                    const m = this.findMatches();
                    this.swapTiles(t, this.tiles[ny][nx]);
                    if (m.length) moves.push({ a: t, b: this.tiles[ny][nx], score: m.length });
                });
            }
        }

        if (moves.length === 0) {
            this.isPlayerTurn = true;
            return;
        }

        moves.sort((a, b) => b.score - a.score);
        const move = moves[0];

        this.swapTiles(move.a, move.b);
        this.resolveMatches(this.findMatches(), () => {
            this.isPlayerTurn = true;
        });
    }
}
