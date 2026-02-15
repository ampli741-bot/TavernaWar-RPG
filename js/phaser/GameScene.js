const BASE_COLS = 8;
const BASE_ROWS = 8;

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

        // фон
        this.add.image(width / 2, height / 2, "bg")
            .setDisplaySize(width, height)
            .setDepth(-10);

        // вычисляем размер плитки АДАПТИВНО
        const maxBoardWidth = width * 0.45;
        const maxBoardHeight = height * 0.8;

        this.TILE = Math.floor(
            Math.min(
                maxBoardWidth / BASE_COLS,
                maxBoardHeight / BASE_ROWS
            )
        );

        this.boardWidth = this.TILE * BASE_COLS;
        this.boardHeight = this.TILE * BASE_ROWS;

        this.boardX = width / 2 - this.boardWidth / 2;
        this.boardY = height / 2 - this.boardHeight / 2;

        this.createBoard();
    }

    createBoard() {
        for (let y = 0; y < BASE_ROWS; y++) {
            this.grid[y] = [];
            for (let x = 0; x < BASE_COLS; x++) {
                const color = Phaser.Utils.Array.GetRandom(COLORS);
                const tile = this.createTile(x, y, color);
                this.grid[y][x] = tile;
            }
        }
    }

    createTile(x, y, color) {
        const tile = this.add.rectangle(
            this.boardX + x * this.TILE + this.TILE / 2,
            this.boardY + y * this.TILE + this.TILE / 2,
            this.TILE - 6,
            this.TILE - 6,
            MAP[color]
        )
        .setInteractive({ useHandCursor: true });

        tile.data = { x, y, color };

        tile.on("pointerdown", () => this.onTileClick(tile));
        return tile;
    }

    onTileClick(tile) {
        if (this.locked || this.turn !== "player") return;

        if (!this.selected) {
            this.select(tile);
            return;
        }

        if (this.isNeighbor(this.selected, tile)) {
            this.swapTiles(this.selected, tile, () => {
                this.turn = "mob";
                this.time.delayedCall(600, () => this.mobTurn());
            });
            this.clearSelection();
        } else {
            this.select(tile);
        }
    }

    select(tile) {
        this.clearSelection();
        this.selected = tile;
        tile.setStrokeStyle(3, 0xffffff);
    }

    clearSelection() {
        if (this.selected) {
            this.selected.setStrokeStyle();
            this.selected = null;
        }
    }

    isNeighbor(a, b) {
        return Math.abs(a.data.x - b.data.x) + Math.abs(a.data.y - b.data.y) === 1;
    }

    swapTiles(a, b, onComplete) {
        this.locked = true;

        const ax = a.data.x, ay = a.data.y;
        const bx = b.data.x, by = b.data.y;

        this.grid[ay][ax] = b;
        this.grid[by][bx] = a;

        [a.data.x, b.data.x] = [bx, ax];
        [a.data.y, b.data.y] = [by, ay];

        this.tweens.add({
            targets: [a, b],
            x: t => this.boardX + t.data.x * this.TILE + this.TILE / 2,
            y: t => this.boardY + t.data.y * this.TILE + this.TILE / 2,
            duration: 200,
            ease: "Cubic.Out",
            onComplete: () => {
                this.locked = false;
                onComplete && onComplete();
            }
        });
    }

    mobTurn() {
        // простой ИИ: случайный допустимый swap
        let a, b;
        do {
            const x = Phaser.Math.Between(0, BASE_COLS - 2);
            const y = Phaser.Math.Between(0, BASE_ROWS - 1);
            a = this.grid[y][x];
            b = this.grid[y][x + 1];
        } while (!a || !b);

        this.swapTiles(a, b, () => {
            this.turn = "player";
        });
    }
}
