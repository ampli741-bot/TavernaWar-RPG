const TILE = 64;
const COLS = 8;
const ROWS = 8;

const COLORS = ["red", "blue", "green", "yellow", "purple"];

const COLOR_MAP = {
    red: 0xff4d4d,
    blue: 0x4d88ff,
    green: 0x4dff4d,
    yellow: 0xffdd4d,
    purple: 0xaa4dff
};

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
        this.grid = [];
        this.selected = null;
        this.locked = false;
    }

    create() {
        const { width, height } = this.scale;

        // === BACKGROUND ===
        this.add.image(width / 2, height / 2, null)
            .setDisplaySize(width, height)
            .setDepth(-10);

        // === BOARD ORIGIN (НЕ зависит от UI) ===
        this.boardX = width / 2 - (COLS * TILE) / 2;
        this.boardY = height / 2 - (ROWS * TILE) / 2;

        this.createBoard();
    }

    createBoard() {
        for (let y = 0; y < ROWS; y++) {
            this.grid[y] = [];
            for (let x = 0; x < COLS; x++) {
                const color = Phaser.Utils.Array.GetRandom(COLORS);
                const tile = this.createTile(x, y, color);
                this.grid[y][x] = tile;
            }
        }
    }

    createTile(x, y, color) {
        const rect = this.add.rectangle(
            this.boardX + x * TILE + TILE / 2,
            this.boardY + y * TILE + TILE / 2,
            TILE - 4,
            TILE - 4,
            COLOR_MAP[color]
        ).setInteractive();

        rect.data = { x, y, color };

        rect.on("pointerdown", () => this.clickTile(rect));
        return rect;
    }

    clickTile(tile) {
        if (this.locked) return;

        if (!this.selected) {
            this.select(tile);
            return;
        }

        if (this.areNeighbors(this.selected, tile)) {
            this.swap(this.selected, tile);
            this.selected = null;
        } else {
            this.select(tile);
        }
    }

    select(tile) {
        if (this.selected) this.selected.setStrokeStyle();
        this.selected = tile;
        tile.setStrokeStyle(3, 0xffffff);
    }

    areNeighbors(a, b) {
        const dx = Math.abs(a.data.x - b.data.x);
        const dy = Math.abs(a.data.y - b.data.y);
        return dx + dy === 1;
    }

    swap(a, b) {
        this.locked = true;

        const ax = a.data.x;
        const ay = a.data.y;
        const bx = b.data.x;
        const by = b.data.y;

        this.grid[ay][ax] = b;
        this.grid[by][bx] = a;

        [a.data.x, b.data.x] = [bx, ax];
        [a.data.y, b.data.y] = [by, ay];

        this.tweens.add({
            targets: [a, b],
            x: (_, t) => t.data.x * TILE + this.boardX + TILE / 2,
            y: (_, t) => t.data.y * TILE + this.boardY + TILE / 2,
            duration: 150,
            onComplete: () => {
                this.resolveTurn();
            }
        });
    }

    resolveTurn() {
        // логика подсчёта совпадений — ОСТАЁТСЯ КАК У ТЕБЯ
        // здесь только разблокировка
        this.locked = false;
    }
}
