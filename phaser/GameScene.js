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
        window.gameScene = this; 
        this.grid = []; 
        this.isAnimating = false;
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
        let glow = this.add.graphics();
        glow.fillStyle(GLOW_COLORS[type], 0.4);
        glow.fillRoundedRect(-VISUAL_S/2 - 2, -VISUAL_S/2 - 2, VISUAL_S + 4, VISUAL_S + 4, 14);

        let bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type], 1);
        bg.fillRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 12);

        let img = this.add.image(0, 0, `t_${type}`);
        let zoom = (type === 'red' || type === 'blue' || type === 'purple') ? 2.15 : 1.5;
        img.setDisplaySize(VISUAL_S * zoom, VISUAL_S * zoom);

        let maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRoundedRect(x - VISUAL_S/2, y - VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
        img.setMask(maskShape.createGeometryMask());

        let frame = this.add.graphics();
        frame.lineStyle(6, 0x444444, 1);
        frame.strokeRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 10);

        let hoverGlow = this.add.graphics().setAlpha(0);
        hoverGlow.lineStyle(4, 0xffffff, 1);
        hoverGlow.strokeRoundedRect(-VISUAL_S/2 - 4, -VISUAL_S/2 - 4, VISUAL_S + 8, VISUAL_S + 8, 14);

        container.add([glow, bg, img, frame, hoverGlow]);
        container.gridR = r; container.gridC = c; container.type = type;
        container.maskShape = maskShape;
        container.hoverGlow = hoverGlow;
        
        let hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0, 0).setInteractive();
        hitArea.container = container;
        container.add(hitArea);
        hitArea.on('pointerdown', () => this.handlePointer(container));

        container.setHover = (v) => { this.tweens.add({ targets: hoverGlow, alpha: v ? 0.6 : 0, duration: 200 }); };

        this.grid[r][c] = container;
        if(fromTop) this.tweens.add({targets: container, y: r*TILE_S+TILE_S/2, duration: 400});
    }

    update() {
        for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
            let t = this.grid[r][c];
            if(t && t.maskShape) {
                t.maskShape.clear(); t.maskShape.fillStyle(0xffffff);
                t.maskShape.fillRoundedRect(t.x - VISUAL_S/2, t.y - VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
            }
        }
    }

    // ... handlePointer, swap, findMatches, check, explodeUnique, applySummaryEffect, refill, mobAI — скопируй полностью из своего старого кода без изменений
}
