export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    create() {
        console.log("🎮 GameScene V5 create");

        this.VERSION = "v5";

        const { width, height } = this.scale;

        // ===== GRID =====
        this.rows = 8;
        this.cols = 8;
        this.tileSize = Math.floor(Math.min(height * 0.8 / this.rows, 80));

        // ===== LAYOUT ZONES =====
        this.leftPanelWidth  = Math.floor(width * 0.22);
        this.rightPanelWidth = Math.floor(width * 0.22);
        this.fieldWidth      = this.cols * this.tileSize;

        this.offsetX = Math.floor(
            (width - this.fieldWidth) / 2
        );
        this.offsetY = Math.floor(
            (height - this.rows * this.tileSize) / 2
        );

        // ===== COLORS =====
        this.colors = [
            { key: "damage", color: 0xff4444 },
            { key: "mana",   color: 0x4488ff },
            { key: "heal",   color: 0x44ff44 },
            { key: "gold",   color: 0xffdd44 },
            { key: "curse",  color: 0xaa44ff }
        ];

        this.board = [];
        this.selected = null;
        this.isBusy = false;
        this.playerTurn = true;

        this.drawPanels(width, height);
        this.drawVersion();
        this.generateBoard();

        this.input.on("gameobjectdown", this.onTileClick, this);
    }

    /* ===================== UI ===================== */

    drawPanels(w, h) {
        // PLAYER PANEL
        this.add.rectangle(
            this.leftPanelWidth / 2,
            h / 2,
            this.leftPanelWidth - 10,
            h - 20,
            0x222222
        ).setStrokeStyle(2, 0xffffff);

        this.add.text(20, 30, "PLAYER", {
            fontSize: "20px",
            color: "#ffffff"
        });

        // MOB PANEL
        this.add.rectangle(
            w - this.rightPanelWidth / 2,
            h / 2,
            this.rightPanelWidth - 10,
            h - 20,
            0x222222
        ).setStrokeStyle(2, 0xffffff);

        this.add.text(w - this.rightPanelWidth + 20, 30, "MOB", {
            fontSize: "20px",
            color: "#ffffff"
        });
    }

    drawVersion() {
        this.add.text(
            this.offsetX,
            this.offsetY - 30,
            this.VERSION,
            { fontSize: "14px", color: "#ffffff" }
        );
    }

    /* ===================== BOARD ===================== */

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
        const tile = this.add.rectangle(
            this.offsetX + x * this.tileSize,
            this.offsetY + y * this.tileSize,
            this.tileSize - 6,
            this.tileSize - 6,
            this.colors[type].color
        ).setOrigin(0).setInteractive();

        tile.gridX = x;
        tile.gridY = y;
        tile.type = type;

        return tile;
    }

    /* ===================== INPUT ===================== */

    onTileClick(pointer, tile) {
        if (this.isBusy || !this.playerTurn) return;

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

    /* ===================== SWAP & MATCH ===================== */

    swapTiles(a, b, check) {
        this.isBusy = true;
        this.swapData(a, b);
        this.moveTile(a);
        this.moveTile(b);

        if (check && !this.hasAnyMatches()) {
            this.time.delayedCall(200, () => {
                this.swapData(a, b);
                this.moveTile(a);
                this.moveTile(b);
                this.isBusy = false;
            });
            return;
        }

        this.time.delayedCall(200, () => this.resolveBoard(true));
    }

    swapData(a, b) {
        const ax = a.gridX, ay = a.gridY;
        const bx = b.gridX, by = b.gridY;

        this.board[ay][ax] = b;
        this.board[by][bx] = a;

        a.gridX = bx; a.gridY = by;
        b.gridX = ax; b.gridY = ay;
    }

    moveTile(t) {
        t.x = this.offsetX + t.gridX * this.tileSize;
        t.y = this.offsetY + t.gridY * this.tileSize;
    }

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
        const out = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const t = this.board[y][x];
                if (!t) continue;
                if (
                    this.board[y][x+1]?.type === t.type &&
                    this.board[y][x+2]?.type === t.type
                ) out.push(t, this.board[y][x+1], this.board[y][x+2]);
                if (
                    this.board[y+1]?.[x]?.type === t.type &&
                    this.board[y+2]?.[x]?.type === t.type
                ) out.push(t, this.board[y+1][x], this.board[y+2][x]);
            }
        }
        return [...new Set(out)];
    }

    resolveBoard(player) {
        const matches = this.findMatches();
        if (!matches.length) {
            this.isBusy = false;
            if (player) this.enemyTurn();
            return;
        }

        const result = { damage:0, mana:0, heal:0, gold:0, curse:0 };

        matches.forEach(t => {
            result[this.colors[t.type].key]++;
            this.board[t.gridY][t.gridX] = null;
            t.destroy();
        });

        console.log(player ? "PLAYER TURN:" : "ENEMY TURN:", result);

        this.dropTiles();
        this.time.delayedCall(200, () => this.resolveBoard(player));
    }

    dropTiles() {
        for (let x = 0; x < this.cols; x++) {
            let p = this.rows - 1;
            for (let y = this.rows - 1; y >= 0; y--) {
                const t = this.board[y][x];
                if (t) {
                    this.board[p][x] = t;
                    t.gridY = p;
                    this.moveTile(t);
                    p--;
                }
            }
            for (let y = p; y >= 0; y--) {
                this.board[y][x] = this.createTile(x, y);
            }
        }
    }

    /* ===================== MOB ===================== */

    enemyTurn() {
        this.playerTurn = false;
        this.time.delayedCall(400, () => {
            console.log("🤖 MOB MOVE");
            this.playerTurn = true;
        });
    }
}
