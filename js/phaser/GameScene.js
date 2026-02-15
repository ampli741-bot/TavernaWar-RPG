const TILE = 64;
const COLS = 8;
const ROWS = 8;

const COLORS = ["red", "blue", "green", "yellow", "purple"];
const MAP = {
    red: 0xff4d4d,
    blue: 0x4d7cff,
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
        this.turn = "player";
    }

    preload() {
        this.load.image("bg", "assets/bg.jpg");
    }

    create() {
        const { width, height } = this.scale;

        this.add.image(width / 2, height / 2, "bg")
            .setDisplaySize(width, height)
            .setDepth(-10);

        this.boardX = width / 2 - (COLS * TILE) / 2;
        this.boardY = height / 2 - (ROWS * TILE) / 2;

        this.createBoard();
    }

    createBoard() {
        for (let y = 0; y < ROWS; y++) {
            this.grid[y] = [];
            for (let x = 0; x < COLS; x++) {
                const c = Phaser.Utils.Array.GetRandom(COLORS);
                const t = this.createTile(x, y, c);
                this.grid[y][x] = t;
            }
        }
    }

    createTile(x, y, color) {
        const r = this.add.rectangle(
            this.boardX + x * TILE + TILE / 2,
            this.boardY + y * TILE + TILE / 2,
            TILE - 6,
            TILE - 6,
            MAP[color]
        ).setInteractive();

        r.data = { x, y, color };
        r.on("pointerdown", () => this.clickTile(r));
        return r;
    }

    clickTile(tile) {
        if (this.locked || this.turn !== "player") return;

        if (!this.selected) {
            this.select(tile);
            return;
        }

        if (this.isNeighbor(this.selected, tile)) {
            this.swap(this.selected, tile, () => {
                this.turn = "mob";
                this.time.delayedCall(500, () => this.mobTurn());
            });
            this.selected.setStrokeStyle();
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

    isNeighbor(a, b) {
        return Math.abs(a.data.x - b.data.x) + Math.abs(a.data.y - b.data.y) === 1;
    }

    swap(a, b, cb) {
        this.locked = true;

        const ax = a.data.x, ay = a.data.y;
        const bx = b.data.x, by = b.data.y;

        this.grid[ay][ax] = b;
        this.grid[by][bx] = a;

        [a.data.x, b.data.x] = [bx, ax];
        [a.data.y, b.data.y] = [by, ay];

        this.tweens.add({
            targets: [a, b],
            x: (_, t) => this.boardX + t.data.x * TILE + TILE / 2,
            y: (_, t) => this.boardY + t.data.y * TILE + TILE / 2,
            duration: 180,
            onComplete: () => {
                this.locked = false;
                cb && cb();
            }
        });
    }

    mobTurn() {
        // простая ИИ-заглушка (не автоигра!)
        const x = Phaser.Math.Between(0, COLS - 2);
        const y = Phaser.Math.Between(0, ROWS - 1);

        const a = this.grid[y][x];
        const b = this.grid[y][x + 1];

        this.swap(a, b, () => {
            this.turn = "player";
        });
    }
}
