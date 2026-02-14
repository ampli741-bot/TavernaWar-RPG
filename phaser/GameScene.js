import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS } from "../data/constants.js";
import { appState, log, refreshUI } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => 
            this.load.image(`t_${c}`, `assets/rune_${c}.png`)
        );
    }

    create() {
        this.grid = [];
        this.isAnimating = false;
        this.sel = null;

        for(let r=0; r<8; r++) {
            this.grid[r] = [];
            for(let c=0; c<8; c++) this.spawnTile(r, c);
        }

        this.input.on('gameobjectover', (ptr, obj) => { if(obj.container) obj.container.setHover(true); });
        this.input.on('gameobjectout', (ptr, obj) => { if(obj.container) obj.container.setHover(false); });
    }

    spawnTile(r, c, fromTop=false) {
        let types = ['red', 'blue', 'green', 'purple', 'yellow'];
        let type = Phaser.Utils.Array.GetRandom(types);
        let x = c * TILE_S + TILE_S/2;
        let y = fromTop ? -TILE_S : r * TILE_S + TILE_S/2;
        
        let container = this.add.container(x, y);
        let glow = this.add.graphics().fillStyle(GLOW_COLORS[type], 0.4).fillRoundedRect(-VISUAL_S/2-2, -VISUAL_S/2-2, VISUAL_S+4, VISUAL_S+4, 14);
        let bg = this.add.graphics().fillStyle(BG_COLORS[type], 1).fillRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
        let img = this.add.image(0, 0, `t_${type}`);
        img.setDisplaySize(VISUAL_S * ((type==='red'||type==='blue'||type==='purple')?2.15:1.5), VISUAL_S * ((type==='red'||type==='blue'||type==='purple')?2.15:1.5));

        let maskShape = this.make.graphics().fillStyle(0xffffff).fillRoundedRect(x-VISUAL_S/2, y-VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
        img.setMask(maskShape.createGeometryMask());

        let hoverGlow = this.add.graphics().setAlpha(0).lineStyle(4, 0xffffff, 1).strokeRoundedRect(-VISUAL_S/2-4, -VISUAL_S/2-4, VISUAL_S+8, VISUAL_S+8, 14);
        container.add([glow, bg, img, hoverGlow]);
        
        container.gridR = r; container.gridC = c; container.type = type;
        container.maskShape = maskShape;
        container.setHover = (v) => this.tweens.add({ targets: hoverGlow, alpha: v?0.6:0, duration: 200 });

        let hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0, 0).setInteractive();
        hitArea.container = container;
        container.add(hitArea);
        hitArea.on('pointerdown', () => this.handlePointer(container));

        this.grid[r][c] = container;
        if(fromTop) this.tweens.add({targets: container, y: r*TILE_S+TILE_S/2, duration: 400});
    }

    async handlePointer(t) {
        if(this.isAnimating || appState.turn !== "PLAYER" || appState.lootActive) return;
        if(!this.sel) { this.sel = t; t.setScale(1.1); }
        else {
            if(this.sel === t) { t.setScale(1); this.sel = null; return; }
            if(Math.abs(this.sel.gridR-t.gridR)+Math.abs(this.sel.gridC-t.gridC) === 1) {
                if (this.checkPotential(this.sel, t)) {
                    this.sel.setScale(1);
                    await this.swap(this.sel, t);
                    await this.check();
                    appState.turn = "MOB";
                    this.time.delayedCall(800, () => this.mobAI());
                } else {
                    this.tweens.add({targets: [this.sel, t], x: "+=5", yoyo: true, duration: 50});
                }
            }
            if(this.sel) this.sel.setScale(1);
            this.sel = null;
        }
    }

    checkPotential(t1, t2) {
        let r1=t1.gridR, c1=t1.gridC, r2=t2.gridR, c2=t2.gridC;
        this.grid[r1][c1]=t2; this.grid[r2][c2]=t1;
        let hasMatch = this.findMatches().length > 0;
        this.grid[r1][c1]=t1; this.grid[r2][c2]=t2;
        return hasMatch;
    }

    async swap(t1, t2) {
        this.isAnimating = true;
        let r1=t1.gridR, c1=t1.gridC, r2=t2.gridR, c2=t2.gridC;
        this.grid[r1][c1]=t2; this.grid[r2][c2]=t1;
        t1.gridR=r2; t1.gridC=c2; t2.gridR=r1; t2.gridC=c1;
        return new Promise(res => {
            this.tweens.add({targets:t1, x:c2*TILE_S+TILE_S/2, y:r2*TILE_S+TILE_S/2, duration:200});
            this.tweens.add({targets:t2, x:c1*TILE_S+TILE_S/2, y:r1*TILE_S+TILE_S/2, duration:200, onComplete:()=>{this.isAnimating=false; res();}});
        });
    }

    findMatches() {
        let m = [];
        for(let r=0; r<8; r++) for(let c=0; c<6; c++) 
            if(this.grid[r][c] && this.grid[r][c+1] && this.grid[r][c+2] && this.grid[r][c].type===this.grid[r][c+1].type && this.grid[r][c].type===this.grid[r][c+2].type) m.push(this.grid[r][c], this.grid[r][c+1], this.grid[r][c+2]);
        for(let c=0; c<8; c++) for(let r=0; r<6; r++) 
            if(this.grid[r][c] && this.grid[r+1][c] && this.grid[r+2][c] && this.grid[r][c].type===this.grid[r+1][c].type && this.grid[r][c].type===this.grid[r+2][c].type) m.push(this.grid[r][c], this.grid[r+1][c], this.grid[r+2][c]);
        return m;
    }

    async check() {
        let m = this.findMatches();
        if(m.length > 0) { 
            await this.explode([...new Set(m)]); 
            await this.refill(); 
            await this.check(); 
        }
    }

    async explode(uniques) {
        this.isAnimating = true;
        let counts = { red:0, blue:0, green:0, purple:0, yellow:0 };
        uniques.forEach(t => { counts[t.type]++; });
        
        return new Promise(res => {
            this.tweens.add({
                targets: uniques, scale: 0, alpha: 0, duration: 250,
                onComplete: () => {
                    uniques.forEach(t => { this.grid[t.gridR][t.gridC] = null; t.destroy(); });
                    this.applySummary(counts);
                    this.isAnimating = false;
                    res();
                }
            });
        });
    }

    applySummary(counts) {
        let p = appState.player, m = appState.mob;
        if(appState.turn === "PLAYER") {
            if(counts.red > 0) { m.hp -= p.baseAtk * counts.red; log(`Удар: -${p.baseAtk * counts.red}`, 'p'); }
            if(counts.purple > 0) { m.hp -= (p.baseAtk*2) * counts.purple; log(`КРИТ: -${p.baseAtk*2*counts.purple}`, 'crit'); }
            if(counts.blue > 0) { p.mana = Math.min(100, p.mana + counts.blue*5); }
            if(counts.green > 0) { p.hp = Math.min(p.maxHp, p.hp + counts.green*20); }
        } else {
            let dmg = counts.red * 10 + counts.purple * 20;
            p.hp -= dmg; log(`Враг бьет: -${dmg}`, 'm');
        }
        if(m.hp <= 0) window.showLootScreen();
        refreshUI();
    }

    async refill() {
        for(let c=0; c<8; c++) {
            let empty = 0;
            for(let r=7; r>=0; r--) {
                if(!this.grid[r][c]) empty++;
                else if(empty > 0) {
                    let t = this.grid[r][c]; this.grid[r+empty][c]=t; this.grid[r][c]=null;
                    t.gridR = r+empty;
                    this.tweens.add({targets: t, y: t.gridR*TILE_S+TILE_S/2, duration: 200});
                }
            }
            for(let i=0; i<empty; i++) this.spawnTile(i, c, true);
        }
        await new Promise(r => this.time.delayedCall(250, r));
    }

    async mobAI() {
        if(appState.mob.hp <= 0) return;
        // Простейшая логика: ищем первый попавшийся ход
        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                if(c<7 && this.checkPotential(this.grid[r][c], this.grid[r][c+1])) {
                    await this.swap(this.grid[r][c], this.grid[r][c+1]);
                    await this.check();
                    appState.turn = "PLAYER";
                    return;
                }
            }
        }
        appState.turn = "PLAYER";
    }

    update() {
        // Обновление масок для плавности
        for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
            let t = this.grid[r][c];
            if(t && t.maskShape) {
                t.maskShape.clear().fillStyle(0xffffff).fillRoundedRect(t.x-VISUAL_S/2, t.y-VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
            }
        }
    }
}
