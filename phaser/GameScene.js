import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS, SLOT_NAMES, ADJECTIVES } from "../data/constants.js";
import { appState, refreshUI } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() { 
        ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => this.load.image(`t_${c}`, `assets/rune_${c}.png`)); 
    }

    create() {
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

        // ... (Тут весь твой код графики из скелета: glow, bg, img, frame) ...
        // Копируй его один в один из своего старого GameScene.spawnTile
        
        let hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0x000000, 0).setInteractive();
        hitArea.container = container;
        container.add(hitArea);
        hitArea.on('pointerdown', () => this.handlePointer(container));

        container.gridR = r; container.gridC = c; container.type = type;
        this.grid[r][c] = container;
        if(fromTop) this.tweens.add({targets: container, y: r*TILE_S+TILE_S/2, duration: 400});
        
        // Функции setHover и setGhost тоже перенеси сюда
    }

    async handlePointer(t) {
        if(this.isAnimating || appState.turn !== "PLAYER" || appState.lootActive) return;
        // ... (вся логика handlePointer из твоего скелета, замени window.app на appState)
    }

    // Добавь остальные методы: swap, check, findMatches, refill, explodeUnique...
    // Важно: в applySummaryEffect используй appState и вызывай refreshUI()
    
    async useUltra() {
        if(appState.player.mana < 100 || appState.lootActive || this.isAnimating) return;
        appState.player.mana = 0;
        appState.log(`УЛЬТА: ${appState.player.job}!`, 'crit');
        // ... логика взрывов ...
        refreshUI();
    }
    
    showLootScreen() {
        appState.lootActive = true;
        const slots = Object.keys(SLOT_NAMES);
        const slot = slots[Math.floor(Math.random()*slots.length)];
        const rar = Math.random()>0.95?3:Math.random()>0.8?2:Math.random()>0.5?1:0;
        const power = (10 + appState.player.level * 8) * (1 + rar * 0.5);
        
        appState.currentLoot = { 
            slot, rar, 
            n: `${ADJECTIVES[Math.floor(Math.random()*ADJECTIVES.length)]} ${SLOT_NAMES[slot]}`, 
            atk: Math.floor(slot==='weapon'||slot==='ring'?power:power/4), 
            arm: Math.floor(slot==='body'||slot==='head'?power*2:power/3), 
            agi: Math.floor(Math.random()*5*(rar+1)) 
        };

        let old = appState.player.equip[slot] || {n:"Пусто", atk:0, arm:0, agi:0, rar:0};
        document.getElementById('loot-compare').innerHTML = `
            <div style="background:#222; padding:10px;"><b style="color:var(--rar${old.rar})">${old.n}</b><br>⚔️${old.atk} 🛡️${old.arm}</div>
            <div style="background:#222; padding:10px;"><b style="color:var(--rar${appState.currentLoot.rar})">${appState.currentLoot.n}</b><br>⚔️${appState.currentLoot.atk} 🛡️${appState.currentLoot.arm}</div>
        `;
        document.getElementById('loot-overlay').style.display = 'flex';
    }
}
