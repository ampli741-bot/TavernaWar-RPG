export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.GRID = 8;
        this.TILE_S = 85;
        this.TILE_P = 4;
        this.VISUAL_S = this.TILE_S - this.TILE_P * 2;

        this.types = ['red', 'blue', 'green', 'purple', 'yellow'];
        this.BG_COLORS = {
            red: 0x3d0a0a,
            blue: 0x0a1a2f,
            green: 0x0a240a,
            purple: 0x220a35,
            yellow: 0x2d2405
        };
        this.GLOW_COLORS = {
            red: 0xff0000,
            blue: 0x00aaff,
            green: 0x00ff00,
            purple: 0xaa00ff,
            yellow: 0xffaa00
        };

        this.grid = [];
        this.selected = null;
        this.busy = false;
    }

    preload() {
    this.load.image("board-bg", "assets/bg.jpg");

    RUNE_TYPES.forEach(t => {
        this.load.image(`r_${t}`, `assets/rune_${t}.png`);
    });
}


    create() {
        for (let r = 0; r < this.GRID; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.GRID; c++) {
                this.spawnTile(r, c);
            }
        }
    }

    /* ================= TILE ================= */

    spawnTile(r, c, fromTop = false) {
        const type = Phaser.Utils.Array.GetRandom(this.types);

        const x = c * this.TILE_S + this.TILE_S / 2;
        const y = fromTop ? -this.TILE_S : r * this.TILE_S + this.TILE_S / 2;

        const cont = this.add.container(x, y);

        /* === GLOW (из HTML) === */
        const glow = this.add.graphics();
        glow.fillStyle(this.GLOW_COLORS[type], 0.4);
        glow.fillRoundedRect(
            -this.VISUAL_S / 2 - 2,
            -this.VISUAL_S / 2 - 2,
            this.VISUAL_S + 4,
            this.VISUAL_S + 4,
            14
        );

        /* === BG === */
        const bg = this.add.graphics();
        bg.fillStyle(this.BG_COLORS[type], 1);
        bg.fillRoundedRect(
            -this.VISUAL_S / 2,
            -this.VISUAL_S / 2,
            this.VISUAL_S,
            this.VISUAL_S,
            12
        );

        /* === RUNE IMAGE === */
        const img = this.add.image(0, 0, `r_${type}`);
        const zoom = (type === 'red' || type === 'blue' || type === 'purple') ? 2.15 : 1.5;
        img.setDisplaySize(this.VISUAL_S * zoom, this.VISUAL_S * zoom);
        if (type === 'yellow') img.y += 4;

        /* === MASK (как в HTML) === */
        const maskG = this.make.graphics();
        maskG.fillStyle(0xffffff);
        maskG.fillRoundedRect(
            x - this.VISUAL_S / 2,
            y - this.VISUAL_S / 2,
            this.VISUAL_S,
            this.VISUAL_S,
            12
        );
        img.setMask(maskG.createGeometryMask());

        /* === FRAME === */
        const frame = this.add.graphics();
        frame.lineStyle(6, 0x444444, 1);
        frame.strokeRoundedRect(
            -this.VISUAL_S / 2,
            -this.VISUAL_S / 2,
            this.VISUAL_S,
            this.VISUAL_S,
            10
        );
        frame.lineStyle(2, 0x666666, 0.8);
        frame.strokeRoundedRect(
            -this.VISUAL_S / 2 + 2,
            -this.VISUAL_S / 2 + 2,
            this.VISUAL_S - 4,
            this.VISUAL_S - 4,
            8
        );
        frame.lineStyle(1.5, 0xbc962c, 0.4);
        frame.strokeRoundedRect(
            -this.VISUAL_S / 2 + 8,
            -this.VISUAL_S / 2 + 8,
            this.VISUAL_S - 16,
            this.VISUAL_S - 16,
            6
        );

        cont.add([glow, bg, img, frame]);

        cont.type = type;
        cont.r = r;
        cont.c = c;
        cont.maskG = maskG;

        cont.setSize(this.TILE_S, this.TILE_S);
        cont.setInteractive();
        cont.on('pointerdown', () => this.click(cont));

        this.grid[r][c] = cont;

        this.tweens.add({
            targets: cont,
            scale: 1.03,
            duration: 900 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        if (fromTop) {
            this.tweens.add({
                targets: cont,
                y: r * this.TILE_S + this.TILE_S / 2,
                duration: 350
            });
        }
    }

    update() {
        for (let r = 0; r < this.GRID; r++) {
            for (let c = 0; c < this.GRID; c++) {
                const t = this.grid[r][c];
                if (t && t.maskG) {
                    t.maskG.clear();
                    t.maskG.fillStyle(0xffffff);
                    t.maskG.fillRoundedRect(
                        t.x - this.VISUAL_S / 2,
                        t.y - this.VISUAL_S / 2,
                        this.VISUAL_S,
                        this.VISUAL_S,
                        12
                    );
                }
            }
        }
    }

    /* ================= INPUT ================= */

    click(t) {
        if (this.busy) return;

        if (!this.selected) {
            this.selected = t;
            t.setScale(1.15);
        } else {
            if (this.adjacent(t, this.selected)) {
                this.swap(t, this.selected);
            } else {
                this.selected.setScale(1);
                this.selected = t;
                t.setScale(1.15);
            }
        }
    }

    adjacent(a, b) {
        return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
    }

    /* ================= SWAP + MATCH ================= */

    swap(a, b) {
        this.busy = true;
        this.selected = null;

        const ar = a.r, ac = a.c;
        const br = b.r, bc = b.c;

        this.grid[ar][ac] = b;
        this.grid[br][bc] = a;

        a.r = br; a.c = bc;
        b.r = ar; b.c = ac;

        this.move(a);
        this.move(b);

        this.time.delayedCall(250, () => {
            const m = this.findMatches();
            m.length ? this.remove(m) : this.swapBack(a, b);
        });
    }

    swapBack(a, b) {
        const ar = a.r, ac = a.c;
        const br = b.r, bc = b.c;

        this.grid[ar][ac] = b;
        this.grid[br][bc] = a;

        a.r = br; a.c = bc;
        b.r = ar; b.c = ac;

        this.move(a);
        this.move(b);

        this.time.delayedCall(250, () => this.busy = false);
    }

    move(t) {
        this.tweens.add({
            targets: t,
            x: t.c * this.TILE_S + this.TILE_S / 2,
            y: t.r * this.TILE_S + this.TILE_S / 2,
            duration: 220,
            ease: 'Sine.easeInOut'
        });
    }

    findMatches() {
        const out = [];
        const add = a => a.length >= 3 && out.push(...a);

        for (let r = 0; r < this.GRID; r++) {
            let run = [this.grid[r][0]];
            for (let c = 1; c < this.GRID; c++) {
                const t = this.grid[r][c];
                t && t.type === run[0].type ? run.push(t) : (add(run), run = [t]);
            }
            add(run);
        }

        for (let c = 0; c < this.GRID; c++) {
            let run = [this.grid[0][c]];
            for (let r = 1; r < this.GRID; r++) {
                const t = this.grid[r][c];
                t && t.type === run[0].type ? run.push(t) : (add(run), run = [t]);
            }
            add(run);
        }

        return [...new Set(out)];
    }

    remove(list) {
        this.busy = true;

        list.forEach(t => {
            this.grid[t.r][t.c] = null;
            this.tweens.add({
                targets: t,
                scale: 0,
                alpha: 0,
                duration: 200,
                onComplete: () => t.destroy()
            });
        });

        this.time.delayedCall(250, () => this.drop());
    }

    drop() {
        for (let c = 0; c < this.GRID; c++) {
            let empty = 0;
            for (let r = this.GRID - 1; r >= 0; r--) {
                const t = this.grid[r][c];
                if (!t) empty++;
                else if (empty) {
                    this.grid[r + empty][c] = t;
                    this.grid[r][c] = null;
                    t.r += empty;
                    this.move(t);
                }
            }
            for (let i = 0; i < empty; i++) {
                this.spawnTile(i, c, true);
            }
        }

        this.time.delayedCall(300, () => {
            const again = this.findMatches();
            again.length ? this.remove(again) : this.busy = false;
        });
    }
}
