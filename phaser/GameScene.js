import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS } from "../data/constants.js";
import { appState } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }
    
    preload() { 
        ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => this.load.image(`t_${c}`, `assets/rune_${c}.png`)); 
    }

    create() {
        // Ссылка на сцену для глобального доступа, если нужно
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

    // ... Скопируй сюда все остальные методы: spawnTile, update, handlePointer, 
    // checkPotentialMatch, swap, findMatches, check, explodeUnique, applySummaryEffect, refill, mobAI ...
    // ВАЖНО: Внутри методов замени window.app на appState
}
