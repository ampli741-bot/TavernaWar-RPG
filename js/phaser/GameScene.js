export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    create() {
        console.log("🎮 GameScene V4 create");

        this.VERSION = "v4";

        this.rows = 8;
        this.cols = 8;
        this.tileSize = 70;
        this.offsetX = 300;
        this.offsetY = 40;

        this.colors = [
            { key: "damage", color: 0xff4444 }, // red
            { key: "mana",   color: 0x4488ff }, // blue
            { key: "heal",   color: 0x44ff44 }, // green
            { key: "gold",   color: 0xffdd44 }, // yellow
            { key: "curse",  color: 0xaa44ff }  // purple
        ];

        this.board = [];
        this.selected = null;
        this.isBusy = false;

        this.drawVersion();
        this.generateBoard();
        this.input.on("gameobjectdown", this.onTileClick, this);
    }

    /* ===================== INIT ===================== */

    drawVersion() {
        this.add.text(10, 10, this.VERSION, {
            fontSize: "14px",
            color: "#ffffff"
        });
    }

    generateBoard() {
        for (let y = 0; y < this.rows; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.cols; x++) {
                let tile;
                do {
                    tile = this.createTile(x, y);
                } while (this.causesMatch(x, y, tile.type));
                this.board[y][x] = tile;
            }
        }
    }

    createTile(x, y) {
        const type = Phaser.Math.Between(0, this.colors.length - 1);
        const rect = this.add.rectangle(
            this.offsetX + x * this.tileSize,
            this.offsetY + y * this.tileSize,
            this.tileSize - 6,
            this.tileSize - 6,
            this.colors[type].color
        ).setOrigin(0).setInteractive();

        rect.gridX = x;
        rect.gridY = y;
        rect.type = type;

        return rect;
    }

    /* ===================== INPUT ===================== */

    onTileClick(pointer, tile) {
        if (this.isBusy) return;

        if (!this.selected) {
            this.selectTile(tile);
            return;
        }

        if (this.isNeighbor(this.selected, tile)) {
            this.swapTiles(this.selected, tile, true);
            this.selected = null;
        } else {
            this.clearSelection();
            this.selectTile(tile);
        }
    }

    selectTile(tile) {
        this.clearSelection();
        this.selected = tile;
        tile.setStrokeStyle(4, 0xffffff);
    }

    clearSelection() {
        this.children.list.forEach(o => o.setStrokeStyle?.());
        this.selected = null;
    }

    isNeighbor(a, b) {
        return Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY) === 1;
    }

    /* ===================== SWAP ===================== */

    swapTiles(a, b, checkMatch) {
        this.isBusy = true;

        this.swapData(a, b);
        this.moveTile(a);
        this.moveTile(b);

        if (checkMatch && !this.hasAnyMatches()) {
            // rollback
            this.time.delayedCall(200, () => {
                this.swapData(a, b);
                this.moveTile(a);
                this.moveTile(b);
                this.isBusy = false;
            });
            return;
        }

        this.time.delayedCall(200, () => this.resolveBoard());
    }

    swapData(a, b) {
        const ax = a.gridX, ay = a.gridY;
        const bx = b.gridX, by = b.gridY;

        this.board[ay][ax] = b;
        this.board[by][bx] = a;

        a.gridX = bx; a.gridY = by;
        b.gridX = ax; b.gridY = ay;
    }

    moveTile(tile) {
        tile.x = this.offsetX + tile.gridX * this.tileSize;
        tile.y = this.offsetY + tile.gridY * this.tileSize;
    }

    /* ===================== MATCH ===================== */

    causesMatch(x, y, type) {
        let h = 1, v = 1;

        for (let i = 1; i <= 2; i++) {
            if (this.board[y]?.[x - i]?.type === type) h++;
            if (this.board[y]?.[x + i]?.type === type) h++;
            if (this.board[y - i]?.[x]?.type === type) v++;
            if (this.board[y + i]?.[x]?.type === type) v++;
        }

        return h >= 3 || v >= 3;
    }

    hasAnyMatches() {
        return this.findMatches().length > 0;
    }

    findMatches() {
        const matches = [];

        // horizontal
        for (let y = 0; y < this.rows; y++) {
            let run = [this.board[y][0]];
            for (let x = 1; x <= this.cols; x++) {
                const cur = this.board[y][x];
                if (cur && run[0].type === cur.type) {
                    run.push(cur);
                } else {
                    if (run.length >= 3) matches.push(...run);
                    run = [cur];
                }
            }
        }

        // vertical
        for (let x = 0; x < this.cols; x++) {
            let run = [this.board[0][x]];
            for (let y = 1; y <= this.rows; y++) {
                const cur = this.board[y]?.[x];
                if (cur && run[0].type === cur.type) {
                    run.push(cur);
                } else {
                    if (run.length >= 3) matches.push(...run);
                    run = [cur];
                }
            }
        }

        return [...new Set(matches)];
    }

    /* ===================== RESOLVE ===================== */

    resolveBoard() {
        const matches = this.findMatches();
        if (matches.length === 0) {
            this.isBusy = false;
            return;
        }

        const result = {
            damage: 0,
            mana: 0,
            heal: 0,
            gold: 0,
            curse: 0
        };

        matches.forEach(tile => {
            result[this.colors[tile.type].key]++;
            this.board[tile.gridY][tile.gridX] = null;
            tile.destroy();
        });

        console.log("TURN RESULT:", result);

        this.dropTiles();
        this.time.delayedCall(200, () => this.resolveBoard());
    }

    dropTiles() {
        for (let x = 0; x < this.cols; x++) {
            let pointer = this.rows - 1;
            for (let y = this.rows - 1; y >= 0; y--) {
                const tile = this.board[y][x];
                if (tile) {
                    this.board[pointer][x] = tile;
                    tile.gridY = pointer;
                    this.moveTile(tile);
                    pointer--;
                }
            }
            for (let y = pointer; y >= 0; y--) {
                const tile = this.createTile(x, y);
                this.board[y][x] = tile;
            }
        }
    }
}
