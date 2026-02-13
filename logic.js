// ==========================================
// КОНСТАНТЫ И НАСТРОЙКИ (RIGID SKELETON)
// ==========================================
const TILE_S = 85; 
const TILE_P = 4; 
const VISUAL_S = TILE_S - (TILE_P * 2);

let phaserGame, scene, currentLoot = null;
const adjs = ["Древний", "Мифический", "Проклятый", "Тёмный", "Вечный", "Стальной", "Святой", "Забытый", "Ледяной", "Кровавый"];
const slotNames = { weapon: "Оружие", body: "Доспех", legs: "Поножи", head: "Шлем", ring: "Перстень", necklace: "Амулет", hands: "Перчатки" };

const BG_COLORS = { red: 0x3d0a0a, blue: 0x0a1a2f, green: 0x0a240a, purple: 0x220a35, yellow: 0x2d2405 };
const GLOW_COLORS = { red: 0xff0000, blue: 0x00aaff, green: 0x00ff00, purple: 0xaa00ff, yellow: 0xffaa00 };

// Глобальный объект приложения
window.app = { 
    player: null, mob: null, lootActive: false, turn: "PLAYER",
    log: (msg, type) => {
        const log = document.getElementById('battle-log');
        const entry = document.createElement('div');
        entry.style.color = type==='p'?'#4f4':type==='m'?'#f44':type==='crit'?'#aa44ff':'#ffd700';
        entry.innerText = `> ${msg}`;
        log.prepend(entry);
    }
};

// ==========================================
// ЛОГИКА ИГРОКА И МОБОВ
// ==========================================

function startGame(key) {
    document.getElementById('menu-overlay').style.display = 'none';
    const base = { 
        'warrior':{hp:1600,atk:25,agi:5}, 
        'mage':{hp:800,atk:65,agi:2}, 
        'archer':{hp:1000,atk:40,agi:18}, 
        'assassin':{hp:900,atk:55,agi:14} 
    }[key];
    
    const imgKey = key === 'assassin' ? 'assasin' : key;
    window.app.player = { 
        job:key.toUpperCase(), 
        key, 
        hp:base.hp, 
        maxHp:base.hp, 
        armor:0, 
        maxArmor:0, 
        mana:0, 
        gold:0, 
        level:1, 
        baseAtk:base.atk, 
        baseAgi:base.agi, 
        equip: { weapon:{n:"Старая палка",atk:12,arm:0,agi:0,rar:0} } 
    };
    
    document.getElementById('p-portrait').style.backgroundImage = `url('assets/hero_${imgKey}.jpg')`;
    initPhaser(); 
    spawnMob(); 
    refreshUI();
}

function spawnMob() {
    let lvl = window.app.player.level;
    window.app.mob = { 
        name: "Гоблин Ур."+lvl, 
        hp: 200+(lvl*100), 
        maxHp: 200+(lvl*100), 
        atk: 20+(lvl*10), 
        mana: 0 
    };
    document.getElementById('m-portrait').style.backgroundImage = `url('assets/monster_goblin.jpg')`; 
    window.app.turn = "PLAYER"; 
    window.app.lootActive = false; 
    refreshUI();
}

function refreshUI() {
    const p = window.app.player; const m = window.app.mob;
    if(!p || !m) return;

    let gearAtk=0, gearArm=0, gearAgi=0, invH = "";
    for(let s in slotNames) { 
        let i = p.equip[s]; if(i) { gearAtk+=i.atk; gearArm+=i.arm; gearAgi+=i.agi; }
        let color = i ? `var(--rar${i.rar})` : '#444';
        invH += `<div class="inv-item" style="border-left: 4px solid ${color}">
            <div style="color:${color}"><b>${slotNames[s]}:</b> ${i?i.n:'---'}</div>
            <div style="font-size:10px">${i?'⚔️'+i.atk+' 🛡️'+i.arm:''}</div>
        </div>`;
    }
    p.maxArmor = gearArm;
    document.getElementById('p-hp-t').innerText = `${Math.floor(p.hp)}/${p.maxHp}`;
    document.getElementById('p-hp-f').style.width = (p.hp/p.maxHp*100)+'%';
    document.getElementById('p-arm-t').innerText = `Броня: ${Math.floor(p.armor)}/${p.maxArmor}`;
    document.getElementById('p-arm-f').style.width = p.maxArmor > 0 ? (p.armor/p.maxArmor*100)+'%' : '0%';
    document.getElementById('p-mn-t').innerText = `Мана: ${p.mana}%`;
    document.getElementById('p-mn-f').style.width = p.mana+'%';
    document.getElementById('btn-ultra').className = 'btn-ultra' + (p.mana>=100?' ready':'');
    document.getElementById('stat-atk').innerText = p.baseAtk + gearAtk;
    document.getElementById('gold-val').innerText = p.gold;
    document.getElementById('m-hp-t').innerText = `HP: ${Math.floor(m.hp)}/${m.maxHp}`;
    document.getElementById('m-hp-f').style.width = (m.hp/m.maxHp*100)+'%';
    document.getElementById('inv-box').innerHTML = invH;
}

// ==========================================
// СУПЕРУДАРЫ
// ==========================================

async function useUltra() {
    if(window.app.player.mana < 100 || window.app.lootActive || scene.isAnimating) return;
    window.app.player.mana = 0; 
    let key = window.app.player.key;
    window.app.log(`УЛЬТА: ${window.app.player.job}!`, 'crit');
    
    let toExplode = [];
    if(key === 'warrior') toExplode = scene.grid.flat().filter(t => t && (t.type === 'red' || t.type === 'green'));
    if(key === 'mage') toExplode = scene.grid.flat().filter(t => t && (t.type === 'purple' || t.type === 'yellow'));
    if(key === 'archer') { for(let i=0; i<4; i++) { let r = Math.floor(Math.random()*8); for(let c=0; c<8; c++) if(scene.grid[r][c]) toExplode.push(scene.grid[r][c]); } }
    if(key === 'assassin') { toExplode = Phaser.Utils.Array.Shuffle(scene.grid.flat().filter(t => t)).slice(0, 20); window.app.mob.hp -= (window.app.player.baseAtk * 2); }
    
    if(toExplode.length > 0) { 
        await scene.explodeUnique([...new Set(toExplode)]); 
        await scene.refill(); 
        await scene.check(); 
    }
    refreshUI();
}

// ==========================================
// СИСТЕМА ЛУТА
// ==========================================

function showLootScreen() {
    window.app.lootActive = true; 
    currentLoot = generateLoot();
    let old = window.app.player.equip[currentLoot.slot] || {n:"Пусто", atk:0, arm:0, agi:0, rar:0};
    document.getElementById('loot-compare').innerHTML = `
        <div style="background:#222; padding:10px;"><b style="color:var(--rar${old.rar})">${old.n}</b><br>⚔️${old.atk} 🛡️${old.arm}</div>
        <div style="background:#222; padding:10px;"><b style="color:var(--rar${currentLoot.rar})">${currentLoot.n}</b><br>⚔️${currentLoot.atk} 🛡️${currentLoot.arm}</div>`;
    document.getElementById('loot-overlay').style.display = 'flex';
}

function generateLoot() {
    const slots = Object.keys(slotNames); 
    const slot = slots[Math.floor(Math.random()*slots.length)];
    const rar = Math.random()>0.95?3:Math.random()>0.8?2:Math.random()>0.5?1:0;
    const power = (10 + window.app.player.level * 8) * (1 + rar * 0.5);
    return { 
        slot, rar, 
        n: `${adjs[Math.floor(Math.random()*adjs.length)]} ${slotNames[slot]}`, 
        atk: Math.floor(slot==='weapon'||slot==='ring'?power:power/4), 
        arm: Math.floor(slot==='body'||slot==='head'?power*2:power/3), 
        agi: Math.floor(Math.random()*5*(rar+1)) 
    };
}

function takeLoot() { window.app.player.equip[currentLoot.slot] = currentLoot; window.app.player.armor = window.app.player.maxArmor; closeLoot(); }
function sellLoot() { window.app.player.gold += 50; closeLoot(); }
function closeLoot() { document.getElementById('loot-overlay').style.display = 'none'; window.app.player.level++; spawnMob(); }

// ==========================================
// PHASER ENGINE (ИГРОВОЕ ПОЛЕ)
// ==========================================

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }
    preload() { ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => this.load.image(`t_${c}`, `assets/rune_${c}.png`)); }
    
    create() { 
        scene = this; this.grid = []; this.isAnimating = false; 
        for(let r=0; r<8; r++) { this.grid[r] = []; for(let c=0; c<8; c++) this.spawnTile(r, c); } 
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

        let frame = this.add.graphics();
        frame.lineStyle(4, 0x444444, 1);
        frame.strokeRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 10);

        let hoverGlow = this.add.graphics();
        hoverGlow.alpha = 0;
        hoverGlow.lineStyle(4, 0xffffff, 1);
        hoverGlow.strokeRoundedRect(-VISUAL_S/2 - 4, -VISUAL_S/2 - 4, VISUAL_S + 8, VISUAL_S + 8, 14);

        container.add([glow, bg, img, frame, hoverGlow]);
        container.gridR = r; container.gridC = c; container.type = type;
        container.hoverGlow = hoverGlow;
        
        let hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0, 0).setInteractive();
        hitArea.container = container;
        container.add(hitArea);

        hitArea.on('pointerdown', () => this.handlePointer(container));
        container.setHover = (v) => { this.tweens.add({ targets: hoverGlow, alpha: v ? 0.6 : 0, duration: 200 }); };

        this.grid[r][c] = container;
        if(fromTop) this.tweens.add({targets: container, y: r*TILE_S+TILE_S/2, duration: 400});
    }

    async handlePointer(t) {
        if(this.isAnimating || window.app.turn !== "PLAYER" || window.app.lootActive) return;
        if(!this.sel) { this.sel = t; t.setScale(1.1); }
        else {
            if(Math.abs(this.sel.gridR-t.gridR)+Math.abs(this.sel.gridC-t.gridC) === 1) {
                await this.swap(this.sel, t);
                let matched = await this.check();
                if(matched) {
                    window.app.turn = "MOB";
                    this.time.delayedCall(800, () => this.mobAI());
                } else {
                    await this.swap(this.sel, t); // Возврат если нет совпадений
                }
            }
            if(this.sel) this.sel.setScale(1);
            this.sel = null;
        }
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

    async check() {
        let match = this.findMatches();
        if(match.length > 0) { 
            await this.explodeUnique([...new Set(match)]); 
            await this.refill(); 
            await this.check(); 
            return true; 
        }
        return false;
    }

    findMatches() {
        let match = [];
        for(let r=0; r<8; r++) for(let c=0; c<6; c++) if(this.grid[r][c] && this.grid[r][c+1] && this.grid[r][c+2] && this.grid[r][c].type===this.grid[r][c+1].type && this.grid[r][c].type===this.grid[r][c+2].type) match.push(this.grid[r][c], this.grid[r][c+1], this.grid[r][c+2]);
        for(let c=0; c<8; c++) for(let r=0; r<6; r++) if(this.grid[r][c] && this.grid[r+1][c] && this.grid[r+2][c] && this.grid[r][c].type===this.grid[r+1][c].type && this.grid[r][c].type===this.grid[r+2][c].type) match.push(this.grid[r][c], this.grid[r+1][c], this.grid[r+2][c]);
        return match;
    }

    async explodeUnique(unique) {
        this.isAnimating = true;
        let counts = { red:0, blue:0, green:0, purple:0, yellow:0 };
        unique.forEach(t => { if(t && t.scene) { counts[t.type]++; } });

        return new Promise(res => {
            this.tweens.add({
                targets: unique, scale: 0, alpha: 0, duration: 250, 
                onComplete: () => {
                    unique.forEach(t => { if(t && t.scene) { this.grid[t.gridR][t.gridC] = null; t.destroy(); } });
                    this.applyEffects(counts);
                    res();
                }
            });
        });
    }

    applyEffects(counts) {
        let p = window.app.player, m = window.app.mob;
        let unitAtk = p.baseAtk + Object.values(p.equip).reduce((a, b) => a + (b.atk||0), 0);

        if(window.app.turn === "PLAYER") {
            if(counts.red > 0) { m.hp -= unitAtk * counts.red; window.app.log(`Удар: -${unitAtk*counts.red}`, 'p'); }
            if(counts.purple > 0) { m.hp -= unitAtk * 2 * counts.purple; window.app.log(`КРИТ: -${unitAtk*2*counts.purple}`, 'crit'); }
            if(counts.blue > 0) p.mana = Math.min(100, p.mana + counts.blue*10);
            if(counts.green > 0) p.hp = Math.min(p.maxHp, p.hp + counts.green*20);
            if(counts.yellow > 0) p.gold += counts.yellow * 5;
        } else {
            let dmg = counts.red * 20;
            if(dmg > 0) { p.hp -= dmg; window.app.log(`Враг бьет: -${dmg}`, 'm'); }
        }
        if(m.hp <= 0) showLootScreen();
        refreshUI();
    }

    async refill() {
        for(let c=0; c<8; c++) {
            let empty = 0;
            for(let r=7; r>=0; r--) {
                if(!this.grid[r][c]) empty++;
                else if(empty > 0) {
                    let t = this.grid[r][c]; this.grid[r+empty][c]=t; this.grid[r][c]=null;
                    t.gridR=r+empty; this.tweens.add({targets:t, y:t.gridR*TILE_S+TILE_S/2, duration:200});
                }
            }
            for(let i=0; i<empty; i++) this.spawnTile(i, c, true);
        }
        await new Promise(r => this.time.delayedCall(300, r));
    }

    async mobAI() {
        if(window.app.mob.hp <= 0) return;
        // Простейший ИИ: ищет первый попавшийся ход
        for(let r=0; r<8; r++) {
            for(let c=0; c<7; c++) {
                await this.swap(this.grid[r][c], this.grid[r][c+1]);
                if((this.findMatches()).length > 0) {
                    await this.check();
                    window.app.turn = "PLAYER";
                    refreshUI();
                    return;
                }
                await this.swap(this.grid[r][c], this.grid[r][c+1]);
            }
        }
        window.app.turn = "PLAYER";
        refreshUI();
    }
}

// Заменяем самый конец файла logic.js:
function initPhaser() { 
    if (phaserGame) return; // Чтобы не создавать игру дважды
    phaserGame = new Phaser.Game({ 
        type: Phaser.AUTO, 
        parent: 'game-container', 
        width: 680, 
        height: 680, 
        scene: GameScene, 
        transparent: true 
    }); 
}

// Добавляем проверку загрузки страницы
window.onload = () => {
    console.log("Страница загружена, скрипты готовы.");
};
