const SIZE = 8;
const TILE = 72; // ← можно увеличить дальше (80–90)

const COLORS = [
    0xff4444, // red – damage
    0x4488ff, // blue – mana
    0x44ff44, // green – heal
    0xffdd44, // yellow – gold
    0xaa55ff  // purple – curse
];

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
        this.grid = [];
        this.tiles = [];
        this.busy = false;
    }

    preload() {
        this.load.image("bg", "assets/bg.jpg");
        this.load.image("hero", "assets/hero_warrior.jpg");
        this.load.image("mob", "assets/hero_mage.jpg");
    }

    create() {
        // ===== FULLSCREEN BG =====
        this.bg = this.add.image(0, 0, "bg")
            .setOrigin(0)
            .setDepth(-100);

        this.resizeBg();
        this.scale.on("resize", () => this.resizeBg());

        // ===== FIELD CENTER =====
        const fieldSize = SIZE * TILE;
        this.offsetX = this.scale.width / 2 - fieldSize / 2;
        this.offsetY = this.scale.height / 2 - fieldSize / 2;

        // ===== PANELS =====
        this.drawPanels();

        // ===== GRID =====
        this.createGrid();

        console.log("✅ GameScene ready");
    }

    resizeBg() {
        this.bg.displayWidth = this.scale.width;
        this.bg.displayHeight = this.scale.height;
    }

    drawPanels() {
        // PLAYER
        this.add.rectangle(80, this.scale.height / 2, 240, this.scale.height - 120, 0x000000, 0.6)
            .setStrokeStyle(2, 0xffcc00);

        this.add.image(80, 120, "hero").setDisplaySize(120, 120).setCircle(60);

        // MOB
        this.add.rectangle(this.scale.width - 80, this.scale.height / 2, 240, this.scale.height - 120, 0x000000, 0.6)
            .setStrokeStyle(2, 0xffcc00);

        this.add.image(this.scale.width - 80, 120, "mob").setDisplaySize(120, 120).setCircle(60);
    }

    createGrid() {
        for (let y = 0; y < SIZE; y++) {
            this.grid[y] = [];
            this.tiles[y] = [];

            for (let x = 0; x < SIZE; x++) {
                const type = Phaser.Math.Between(0, COLORS.length - 1);
                this.grid[y][x] = type;

                const tile = this.add.rectangle(
                    this.offsetX + x * TILE + TILE / 2,
                    this.offsetY + y * TILE + TILE / 2,
                    TILE - 4,
                    TILE - 4,
                    COLORS[type]
                ).setInteractive();

                tile.xi = x;
                tile.yi = y;

                tile.on("pointerdown", () => this.onTileClick(tile));

                this.tiles[y][x] = tile;
            }
        }
    }

    onTileClick(tile) {
        if (this.busy) return;

        if (!this.selected) {
            this.selected = tile;
            tile.setStrokeStyle(4, 0xffffff);
        } else {
            const dx = Math.abs(tile.xi - this.selected.xi);
            const dy = Math.abs(tile.yi - this.selected.yi);

            this.selected.setStrokeStyle();

            if (dx + dy === 1) {
                this.swapTiles(tile, this.selected);
            }

            this.selected = null;
        }
    }

    swapTiles(a, b) {
        this.busy = true;

        const t = this.grid[a.yi][a.xi];
        this.grid[a.yi][a.xi] = this.grid[b.yi][b.xi];
        this.grid[b.yi][b.xi] = t;

        const ax = a.x, ay = a.y;
        this.tweens.add({
            targets: a,
            x: b.x,
            y: b.y,
            duration: 200
        });

        this.tweens.add({
            targets: b,
            x: ax,
            y: ay,
            duration: 200,
            onComplete: () => {
                this.busy = false;
            }
        });

        const tx = a.xi, ty = a.yi;
        a.xi = b.xi; a.yi = b.yi;
        b.xi = tx;   b.yi = ty;

        this.tiles[a.yi][a.xi] = a;
        this.tiles[b.yi][b.xi] = b;
    }
}
