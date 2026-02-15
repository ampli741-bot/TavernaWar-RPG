export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    init() {
        this.VERSION = "v7";
        this.GRID_SIZE = 9;
        this.COLORS = ["red", "blue", "green", "yellow", "purple"];
        this.COLOR_MAP = {
            red: 0xff4d4d,
            blue: 0x4d88ff,
            green: 0x4dff4d,
            yellow: 0xffdd4d,
            purple: 0xb44dff
        };

        this.tiles = [];
        this.selected = null;
        this.isBusy = false;
        this.turn = "player";
    }

    preload() {
        this.load.image("bg", "assets/bg.jpg");
        this.load.image("hero", "assets/hero_warrior.jpg");
        this.load.image("mob", "assets/hero_assassin.jpg");
    }

    create() {
        const { width, height } = this.scale;

        // ===== BACKGROUND =====
        this.add.image(width / 2, height / 2, "bg")
            .setDisplaySize(width * 0.6, height * 0.9)
            .setAlpha(0.4);

        // ===== VERSION =====
        this.add.text(width / 2, 10, this.VERSION, {
            font: "16px Arial",
            fill: "#fff"
        }).setOrigin(0.5, 0);

        // ===== PANELS =====
        this.createPanels();

        // ===== GRID SIZE AUTO =====
        this.TILE_SIZE = Math.floor(
            Math.min(height * 0.75, width * 0.4) / this.GRID_SIZE
        );

        this.offsetX = width / 2 - (this.GRID_SIZE * this.TILE_SIZE) / 2;
        this.offsetY = height / 2 - (this.GRID_SIZE * this.TILE_SIZE) / 2;

        this.createGrid();
    }

    createPanels() {
        const { width, height } = this.scale;

        // PLAYER
        this.add.rectangle(80, height / 2, 140, height * 0.8)
            .setStrokeStyle(2, 0xffffff);
        this.add.image(80, 80, "hero").setDisplaySize(96, 96);

        // MOB
        this.add.rectangle(width - 80, height / 2, 140, height * 0.8)
            .setStrokeStyle(2, 0xffffff);
        this.add.image(width - 80, 80, "mob").setDisplaySize(96, 96);
    }

    createGrid() {
        for (let y = 0; y < this.GRID_SIZE; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.GRID_SIZE; x++) {
                let color;
                do {
                    color = Phaser.Utils.Array.GetRandom(this.COLORS);
                } while (this.causesMatch(x, y, color));

                const tile = this.createTile(x, y, color);
                this.tiles[y][x] = tile;
            }
        }
    }

    createTile(x, y, color) {
        const rect = this.add.rectangle(
            this.offsetX + x * this.TILE_SIZE + this.TILE_SIZE / 2,
            this.offsetY + y * this.TILE_SIZE + this.TILE_SIZE / 2,
            this.TILE_SIZE - 4,
            this.TILE_SIZE - 4,
            this.COLOR_MAP[color]
        ).setInteractive();

        rect.data = { x, y, color };

        rect.on("pointerdown", () => this.onTileClick(rect));

        return rect;
    }

    onTileClick(tile) {
        if (this.isBusy || this.turn !== "player") return;

        if (!this.selected) {
            this.selected = tile;
            tile.setStrokeStyle(3, 0xffffff);
            return;
        }

        if (this.areAdjacent(this.selected, tile)) {
            this.swapTiles(this.selected, tile, true);
        } else {
            this.selected.setStrokeStyle();
            this.selected = tile;
            tile.setStrokeStyle(3, 0xffffff);
        }
    }

    areAdjacent(a, b) {
        const dx = Math.abs(a.data.x - b.data.x);
        const dy = Math.abs(a.data.y - b.data.y);
        return dx + dy === 1;
    }

    swapTiles(a, b, isPlayer) {
        this.isBusy = true;
        this.selected?.setStrokeStyle();
        this.selected = null;

        this.swapData(a, b);
        this.updateTilePositions(a, b);

        this.time.delayedCall(200, () => {
            const matches = this.findMatches();
            if (matches.length === 0) {
                this.swapData(a, b);
                this.updateTilePositions(a, b);
                this.isBusy = false;
            } else {
                this.resolveMatches(matches, isPlayer);
            }
        });
    }

    swapData(a, b) {
        const ax = a.data.x, ay = a.data.y;
        const bx = b.data.x, by = b.data.y;

        this.tiles[ay][ax] = b;
        this.tiles[by][bx] = a;

        [a.data.x, b.data.x] = [bx, ax];
        [a.data.y, b.data.y] = [by, ay];
    }

    updateTilePositions(...tiles) {
        tiles.forEach(t => {
            this.tweens.add({
                targets: t,
                x: this.offsetX + t.data.x * this.TILE_SIZE + this.TILE_SIZE / 2,
                y: this.offsetY + t.data.y * this.TILE_SIZE + this.TILE_SIZE / 2,
                duration: 150
            });
        });
    }

    causesMatch(x, y, color) {
        if (x >= 2) {
            const a = this.tiles[y]?.[x - 1];
            const b = this.tiles[y]?.[x - 2];
            if (a && b && a.data.color === color && b.data.color === color) return true;
        }
        if (y >= 2) {
            const a = this.tiles[y - 1]?.[x];
            const b = this.tiles[y - 2]?.[x];
            if (a && b && a.data.color === color && b.data.color === color) return true;
        }
        return false;
    }

    findMatches() {
        const matches = [];

        // horizontal
        for (let y = 0; y < this.GRID_SIZE; y++) {
            let run = [];
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const t = this.tiles[y][x];
                if (!run.length || run[0].data.color === t.data.color) {
                    run.push(t);
                } else {
                    if (run.length >= 3) matches.push(...run);
                    run = [t];
                }
            }
            if (run.length >= 3) matches.push(...run);
        }

        // vertical
        for (let x = 0; x < this.GRID_SIZE; x++) {
            let run = [];
            for (let y = 0; y < this.GRID_SIZE; y++) {
                const t = this.tiles[y][x];
                if (!run.length || run[0].data.color === t.data.color) {
                    run.push(t);
                } else {
                    if (run.length >= 3) matches.push(...run);
                    run = [t];
                }
            }
            if (run.length >= 3) matches.push(...run);
        }

        return [...new Set(matches)];
    }

    resolveMatches(matches, isPlayer) {
        matches.forEach(t => t.destroy());

        matches.forEach(t => {
            this.tiles[t.data.y][t.data.x] = null;
        });

        this.dropTiles();

        this.time.delayedCall(300, () => {
            const next = this.findMatches();
            if (next.length) {
                this.resolveMatches(next, isPlayer);
            } else {
                this.isBusy = false;
                this.turn = isPlayer ? "mob" : "player";
                if (this.turn === "mob") this.mobTurn();
            }
        });
    }

    dropTiles() {
        for (let x = 0; x < this.GRID_SIZE; x++) {
            for (let y = this.GRID_SIZE - 1; y >= 0; y--) {
                if (!this.tiles[y][x]) {
                    for (let yy = y - 1; yy >= 0; yy--) {
                        if (this.tiles[yy][x]) {
                            const t = this.tiles[yy][x];
                            this.tiles[y][x] = t;
                            this.tiles[yy][x] = null;
                            t.data.y = y;
                            this.updateTilePositions(t);
                            break;
                        }
                    }
                }
            }
        }
    }

    mobTurn() {
        this.time.delayedCall(500, () => {
            this.turn = "player";
        });
    }
}
