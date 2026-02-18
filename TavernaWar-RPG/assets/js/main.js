// ===============================
// TAVERNA WAR — STABLE MATCH-3
// ===============================

const TILE_S = 85;
const TILE_P = 4;
const VISUAL_S = TILE_S - TILE_P * 2;

let phaserGame;
let scene;
let isEnemyTurn = false;

// ===============================
// STATS
// ===============================

let playerHP = 1000;
let playerMana = 0;
let playerGold = 0;

let mobHP = 1500;
let mobMana = 0;

// ===============================

const RUNE_TYPES = ["red", "blue", "green", "purple", "yellow"];

const BG_COLORS = {
    red: 0x3d0a0a,
    blue: 0x0a1a2f,
    green: 0x0a240a,
    purple: 0x220a35,
    yellow: 0x2d2405
};

const GLOW_COLORS = {
    red: 0xff4444,
    blue: 0x44aaff,
    green: 0x44ff44,
    purple: 0xaa44ff,
    yellow: 0xffcc44
};

const ICON_TUNE = {
    red:    { scale: 2.15, y: 0 },
    blue:   { scale: 2.15, y: -1 },
    purple: { scale: 2.20, y: 0 },
    green:  { scale: 1.65, y: 0 },
    yellow: { scale: 1.75, y: 4 }
};

// ===============================
// GAME SCENE
// ===============================

class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
    }

    preload() {
        RUNE_TYPES.forEach(t => {
            this.load.image(`r_${t}`, `assets/rune_${t}.png`);
        });
    }

    create() {
        scene = this;
        this.grid = [];
        this.selected = null;
        this.isAnimating = false;

        for (let r = 0; r < 8; r++) {
            this.grid[r] = [];
            for (let c = 0; c < 8; c++) {
                this.spawnTile(r, c);
            }
        }

        updateBars();
    }

    spawnTile(r, c, yOverride = null) {
        const type = Phaser.Utils.Array.GetRandom(RUNE_TYPES);
        const x = c * TILE_S + TILE_S / 2;
        const y = yOverride !== null ? yOverride : r * TILE_S + TILE_S / 2;

        const container = this.add.container(x, y);
        container.type = type;
        container.gridR = r;
        container.gridC = c;

        const glow = this.add.graphics();
        glow.fillStyle(GLOW_COLORS[type], 0.35);
        glow.fillRoundedRect(-VISUAL_S/2-4, -VISUAL_S/2-4, VISUAL_S+8, VISUAL_S+8, 16);

        const bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type], 1);
        bg.fillRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 12);

        const icon = this.add.image(0, 0, `r_${type}`);
        const t = ICON_TUNE[type];
        icon.setDisplaySize(VISUAL_S * t.scale, VISUAL_S * t.scale);
        icon.y += t.y;

        const frame = this.add.graphics();
        frame.lineStyle(4, 0x444444, 1);
        frame.strokeRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 10);

        container.add([glow, bg, icon, frame]);

        const hit = this.add.rectangle(0, 0, TILE_S, TILE_S, 0x000000, 0)
            .setInteractive()
            .on("pointerdown", () => this.handleClick(container));

        container.add(hit);

        this.grid[r][c] = container;
        return container;
    }

    async handleClick(tile) {

        if (this.isAnimating || isEnemyTurn) return;

        if (!this.selected) {
            this.selected = tile;
            tile.setScale(1.15);
            return;
        }

        const a = this.selected;
        const b = tile;
        this.selected = null;
        a.setScale(1);

        if (Math.abs(a.gridR - b.gridR) + Math.abs(a.gridC - b.gridC) !== 1) return;

        await this.swap(a, b);

        const matches = this.findMatches();
        if (!matches.length) {
            await this.swap(a, b);
        } else {
            await this.resolve(matches, false);
            this.time.delayedCall(600, enemyTurn);
        }
    }

    async swap(a, b) {
        this.isAnimating = true;

        const ar = a.gridR, ac = a.gridC;
        const br = b.gridR, bc = b.gridC;

        this.grid[ar][ac] = b;
        this.grid[br][bc] = a;

        a.gridR = br; a.gridC = bc;
        b.gridR = ar; b.gridC = ac;

        await Promise.all([
            this.tweens.add({ targets: a, x: bc*TILE_S+TILE_S/2, y: br*TILE_S+TILE_S/2, duration: 200 }).promise,
            this.tweens.add({ targets: b, x: ac*TILE_S+TILE_S/2, y: ar*TILE_S+TILE_S/2, duration: 200 }).promise
        ]);

        this.isAnimating = false;
    }

    findMatches() {
        const matches = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 6; c++) {
                const t = this.grid[r][c];
                if (t &&
                    this.grid[r][c+1]?.type === t.type &&
                    this.grid[r][c+2]?.type === t.type) {
                        matches.push(t, this.grid[r][c+1], this.grid[r][c+2]);
                }
            }
        }

        for (let c = 0; c < 8; c++) {
            for (let r = 0; r < 6; r++) {
                const t = this.grid[r][c];
                if (t &&
                    this.grid[r+1][c]?.type === t.type &&
                    this.grid[r+2][c]?.type === t.type) {
                        matches.push(t, this.grid[r+1][c], this.grid[r+2][c]);
                }
            }
        }

        return matches;
    }

    async resolve(matches, enemy) {

        this.isAnimating = true;

        let red=0, blue=0, green=0, purple=0, yellow=0;

        matches.forEach(t => {
            if (t.type==="red") red++;
            if (t.type==="blue") blue++;
            if (t.type==="green") green++;
            if (t.type==="purple") purple++;
            if (t.type==="yellow") yellow++;

            this.grid[t.gridR][t.gridC] = null;
            this.tweens.add({ targets:t, scale:0, alpha:0, duration:200, onComplete:()=>t.destroy() });
        });

        if (!enemy) {
            mobHP -= red*5;
            mobHP -= purple*8;
            playerHP += green*4;
            playerMana += blue*3;
            playerGold += yellow*2;
        } else {
            playerHP -= red*5;
            playerHP -= purple*8;
            mobHP += green*4;
            mobMana += blue*3;
        }

        updateBars();

        await this.time.delayedCall(300);
        await this.drop();
        this.isAnimating = false;
    }

    async drop() {

        for (let c = 0; c < 8; c++) {
            let empty = 0;

            for (let r = 7; r >= 0; r--) {
                const t = this.grid[r][c];
                if (!t) empty++;
                else if (empty) {
                    this.grid[r+empty][c] = t;
                    this.grid[r][c] = null;
                    t.gridR += empty;
                    this.tweens.add({
                        targets:t,
                        y:t.gridR*TILE_S+TILE_S/2,
                        duration:200
                    });
                }
            }

            for (let i = 0; i < empty; i++) {
                this.spawnTile(i, c, -TILE_S);
            }
        }
    }
}

// ===============================
// ENEMY TURN
// ===============================

function enemyTurn() {
    if (!scene) return;

    isEnemyTurn = true;

    const matches = scene.findMatches();
    if (matches.length) {
        scene.resolve(matches, true).then(()=>{
            isEnemyTurn = false;
        });
    } else {
        isEnemyTurn = false;
    }
}

// ===============================
// UI
// ===============================

function updateBars() {

    document.querySelector("#ui-left .hp span").style.width =
        Math.max(playerHP,0)/10 + "%";

    document.querySelector("#ui-right .hp span").style.width =
        Math.max(mobHP,0)/15 + "%";

    document.querySelector("#ui-left .mana span").style.width =
        playerMana + "%";
}

// ===============================
// INIT
// ===============================

function initPhaser() {

    if (phaserGame) return;

    phaserGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: "game-container",
        width: TILE_S * 8,
        height: TILE_S * 8,
        backgroundColor: "transparent",
        scene: GameScene
    });
}

window.startGame = function (heroKey) {
    document.getElementById("menu-overlay").style.display = "none";
    initPhaser();
};
