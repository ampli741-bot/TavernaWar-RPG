export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    create() {
        console.log("🎮 GameScene create v3");

        // === VERSION LABEL ===
        this.add.text(20, 20, "v3", {
            fontSize: "18px",
            color: "#ffffff",
            backgroundColor: "#000000"
        }).setPadding(6);

        // === CONSTANTS ===
        this.cols = 8;
        this.rows = 8;
        this.tileSize = 64;

        this.boardWidth = this.cols * this.tileSize;
        this.boardHeight = this.rows * this.tileSize;

        // === CENTERED BOARD POSITION ===
        this.boardX = 640 - this.boardWidth / 2;
        this.boardY = 100;

        // === TILE COLORS (LOGIC) ===
        this.colors = {
            red: 0xff4444,     // damage
            blue: 0x4488ff,    // mana
            green: 0x44ff44,   // heal
            yellow: 0xffdd44,  // gold
            purple: 0xaa44ff   // curse
        };

        this.colorKeys = Object.keys(this.colors);

        // === ARRAYS ===
        this.grid = [];
        this.tiles = [];

        // === DRAW UI PANELS ===
        this.drawSidePanels();

        // === CREATE GRID ===
        this.createGrid();
    }

    // ===============================
    // UI PANELS
    // ===============================
    drawSidePanels() {
        // LEFT PANEL (PLAYER)
        this.add.rectangle(120, 360, 220, 520, 0x222222)
            .setStrokeStyle(2, 0xffffff);

        this.add.text(60, 120, "PLAYER", {
            fontSize: "18px",
            color: "#ffffff"
        });

        this.add.rectangle(120, 170, 100, 100, 0x333333)
            .setStrokeStyle(2, 0xffffff);

        // RIGHT PANEL (MOB)
        this.add.rectangle(1160, 360, 220, 520, 0x222222)
            .setStrokeStyle(2, 0xffffff);

        this.add.text(1100, 120, "ENEMY", {
            fontSize: "18px",
            color: "#ffffff"
        });

        this.add.rectangle(1160, 170, 100, 100, 0x333333)
            .setStrokeStyle(2, 0xffffff);
    }

    // ===============================
    // GRID
    // ===============================
    createGrid() {
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            this.tiles[y] = [];

            for (let x = 0; x < this.cols; x++) {
                const key = Phaser.Utils.Array.GetRandom(this.colorKeys);
                this.grid[y][x] = key;

                const tile = this.add.rectangle(
                    this.boardX + x * this.tileSize + this.tileSize / 2,
                    this.boardY + y * this.tileSize + this.tileSize / 2,
                    this.tileSize - 4,
                    this.tileSize - 4,
                    this.colors[key]
                );

                tile.setInteractive();
                tile.gridX = x;
                tile.gridY = y;

                tile.on("pointerdown", () => {
                    console.log(`CLICK [${x},${y}] ${key}`);
                });

                this.tiles[y][x] = tile;
            }
        }
    }
}
