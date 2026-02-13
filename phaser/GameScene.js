import { TILE_S, VISUAL_S, BG_COLORS, GLOW_COLORS, SLOT_NAMES, ADJECTIVES } from "../data/constants.js";
import { appState, refreshUI } from "../game/appState.js";

export class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    preload() {
        ['red', 'blue', 'green', 'purple', 'yellow'].forEach(c => 
            this.load.image(`t_${c}`, `assets/rune_${c}.png`)
        );
    }

    create() {
        scene = this; // Для обратной совместимости с твоими методами
        this.grid = [];
        this.isAnimating = false;
        this.sel = null;

        for (let r = 0; r < 8; r++) {
            this.grid[r] = [];
            for (let c = 0; c < 8; c++) this.spawnTile(r, c);
        }

        this.input.on('gameobjectover', (ptr, obj) => { if (obj.container) obj.container.setHover(true); });
        this.input.on('gameobjectout', (ptr, obj) => { if (obj.container) obj.container.setHover(false); });
    }

    spawnTile(r, c, fromTop = false) {
        let types = ['red', 'blue', 'green', 'purple', 'yellow'];
        let type = Phaser.Utils.Array.GetRandom(types);
        let x = c * TILE_S + TILE_S / 2;
        let y = fromTop ? -TILE_S : r * TILE_S + TILE_S / 2;

        let container = this.add.container(x, y);

        // Фоновое свечение
        let glow = this.add.graphics();
        glow.fillStyle(GLOW_COLORS[type], 0.4);
        glow.fillRoundedRect(-VISUAL_S / 2 - 2, -VISUAL_S / 2 - 2, VISUAL_S + 4, VISUAL_S + 4, 14);

        let bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type], 1);
        bg.fillRoundedRect(-VISUAL_S / 2, -VISUAL_S / 2, VISUAL_S, VISUAL_S, 12);

        let img = this.add.image(0, 0, `t_${type}`);
        let zoom = (type === 'red' || type === 'blue' || type === 'purple') ? 2.15 : 1.5;
        img.setDisplaySize(VISUAL_S * zoom, VISUAL_S * zoom);
        if (type === 'yellow') img.y += 4;

        // Маска
        let maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRoundedRect(x - VISUAL_S / 2, y - VISUAL_S / 2, VISUAL_S, VISUAL_S, 12);
        img.setMask(maskShape.createGeometryMask());

        let frame = this.add.graphics();
        frame.lineStyle(6, 0x444444, 1);
        frame.strokeRoundedRect(-VISUAL_S / 2, -VISUAL_S / 2, VISUAL_S, VISUAL_S, 10);
        frame.lineStyle(2, 0x666666, 0.8);
        frame.strokeRoundedRect(-VISUAL_S / 2 + 2, -VISUAL_S / 2 + 2, VISUAL_S - 4, VISUAL_S - 4, 8);
        frame.lineStyle(1.5, 0xbc962c, 0.4);
        frame.strokeRoundedRect(-VISUAL_S / 2 + 8, -VISUAL_S / 2 + 8, VISUAL_S - 16, VISUAL_S - 16, 6);

        let hoverGlow = this.add.graphics();
        hoverGlow.alpha = 0;
        hoverGlow.lineStyle(4, 0xffffff, 1);
        hoverGlow.strokeRoundedRect(-VISUAL_S / 2 - 4, -VISUAL_S / 2 - 4, VISUAL_S + 8, VISUAL_S + 8, 14);

        let ghostGlow = this.add.graphics();
        ghostGlow.alpha = 0;
        ghostGlow.lineStyle(8, 0xffffff, 0.6);
        ghostGlow.strokeRoundedRect(-VISUAL_S / 2 - 2, -VISUAL_S / 2 - 2, VISUAL_S + 4, VISUAL_S + 4, 12);

        container.add([glow, bg, img, frame, hoverGlow, ghostGlow]);
        container.gridR = r; container.gridC = c; container.type = type;
        container.maskShape = maskShape;
        container.hoverGlow = hoverGlow;
        container.ghostGlow = ghostGlow;

        let hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0x000000, 0).setInteractive();
        hitArea.container = container;
        container.add(hitArea);
        hitArea.on('pointerdown', () => this.handlePointer(container));

        container.setHover = (val) => {
            this.tweens.add({ targets: hoverGlow, alpha: val ? 0.6 : 0, duration: 200 });
        };

        container.setGhost = (val) => {
            if (val) {
                container.ghostGlow.alpha = 1;
                container.ghostPulse = this.tweens.add({
                    targets: container.ghostGlow,
                    alpha: 0.2, scale: 1.05, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                });
            } else {
                if (container.ghostPulse) container.ghostPulse.stop();
                container.ghostGlow.alpha = 0;
                container.ghostGlow.scale = 1;
            }
        };

        this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 800 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        this.grid[r][c] = container;
        if (fromTop) this.tweens.add({ targets: container, y: r * TILE_S + TILE_S / 2, duration: 400 });
    }

    update() {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let t = this.grid[r][c];
                if (t && t.maskShape) {
                    t.maskShape.clear(); t.maskShape.fillStyle(0xffffff);
                    t.maskShape.fillRoundedRect(t.x - VISUAL_S / 2, t.y - VISUAL_S / 2, VISUAL_S, VISUAL_S, 12);
                }
            }
        }
    }

    async handlePointer(t) {
        if (this.isAnimating || appState.turn !== "PLAYER" || appState.lootActive) return;

        if (!this.sel) {
            this.sel = t;
            t.setGhost(true);
            t.setScale(1.15);
        } else {
            if (this.sel === t) {
                t.setGhost(false); t.setScale(1); this.sel = null;
                return;
            }

            if (Math.abs(this.sel.gridR - t.gridR) + Math.abs(this.sel.gridC - t.gridC) === 1) {
                if (this.checkPotentialMatch(this.sel, t)) {
                    this.sel.setGhost(false);
                    await this.swap(this.sel, t);
                    await this.check();
                    appState.turn = "MOB";
                    this.time.delayedCall(800, () => this.mobAI());
                } else {
                    this.tweens.add({ targets: [this.sel, t], x: "+=5", yoyo: true, duration: 50 });
                }
            }

            if (this.sel) { this.sel.setGhost(false); this.sel.setScale(1); }
            this.sel = null;
        }
    }

    checkPotentialMatch(t1, t2) {
        let r1 = t1.gridR, c1 = t1.gridC, r2 = t2.gridR, c2 = t2.gridC;
        this.grid[r1][c1] = t2; this.grid[r2][c2] = t1;
        let hasMatch = this.findMatches().length > 0;
        this.grid[r1][c1] = t1; this.grid[r2][c2] = t2;
        return hasMatch;
    }

    async swap(t1, t2) {
        this.isAnimating = true;
        let r1 = t1.gridR, c1 = t1.gridC, r2 = t2.gridR, c2 = t2.gridC;
        this.grid[r1][c1] = t2; this.grid[r2][c2] = t1;
        t1.gridR = r2; t1.gridC = c2; t2.gridR = r1; t2.gridC = c1;
        return new Promise(res => {
            this.tweens.add({ targets: t1, x: c2 * TILE_S + TILE_S / 2, y: r2 * TILE_S + TILE_S / 2, duration: 200 });
            this.tweens.add({ targets: t2, x: c1 * TILE_S + TILE_S / 2, y: r1 * TILE_S + TILE_S / 2, duration: 200, onComplete: () => { this.isAnimating = false; res(); } });
        });
    }

    findMatches() {
        let match = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) if (this.grid[r][c] && this.grid[r][c + 1] && this.grid[r][c + 2] && this.grid[r][c].type === this.grid[r][c + 1].type && this.grid[r][c].type === this.grid[r][c + 2].type) match.push(this.grid[r][c], this.grid[r][c + 1], this.grid[r][c + 2]);
        for (let c = 0; c < 8; c++) for (let r = 0; r < 6; r++) if (this.grid[r][c] && this.grid[r + 1][c] && this.grid[r + 2][c] && this.grid[r][c].type === this.grid[r + 1][c].type && this.grid[r][c].type === this.grid[r + 2][c].type) match.push(this.grid[r][c], this.grid[r + 1][c], this.grid[r + 2][c]);
        return match;
    }

    async check() {
        let match = this.findMatches();
        if (match.length > 0) {
            await this.explodeUnique([...new Set(match)]);
            await this.refill();
            await this.check();
            return true;
        }
        return false;
    }

    async explodeUnique(unique) {
        this.isAnimating = true;
        let counts = { red: 0, blue: 0, green: 0, purple: 0, yellow: 0 };

        unique.forEach(t => {
            if (!t || !t.scene) return;
            counts[t.type]++;
            const particleColor = GLOW_COLORS[t.type];
            for (let i = 0; i < 8; i++) {
                let rect = this.add.rectangle(t.x, t.y, 8, 8, particleColor);
                this.tweens.add({
                    targets: rect,
                    x: t.x + Phaser.Math.Between(-50, 50), y: t.y + Phaser.Math.Between(-50, 50),
                    alpha: 0, scale: 0, duration: 500, onComplete: () => rect.destroy()
                });
            }
        });

        return new Promise(res => {
            this.tweens.add({
                targets: unique, scale: 0, alpha: 0, duration: 250,
                onComplete: () => {
                    unique.forEach(t => { if (t && t.scene) { this.grid[t.gridR][t.gridC] = null; t.destroy(); } });
                    this.applySummaryEffect(counts);
                    this.isAnimating = false;
                    res();
                }
            });
        });
    }

    applySummaryEffect(counts) {
        let p = appState.player, m = appState.mob;
        let gearAtk = 0; for (let s in p.equip) if (p.equip[s]) gearAtk += p.equip[s].atk;
        let unitAtk = Math.floor(p.baseAtk + gearAtk);

        if (appState.turn === "PLAYER") {
            if (counts.red > 0) { let d = unitAtk * counts.red; m.hp -= d; appState.log(`Комбо Удар: -${d}`, 'p'); }
            if (counts.purple > 0) { let d = Math.floor(unitAtk * 1.5) * counts.purple; m.hp -= d; appState.log(`Комбо КРИТ: -${d}`, 'crit'); }
            if (counts.blue > 0) { p.mana = Math.min(100, p.mana + counts.blue * 5); appState.log(`Мана +${counts.blue * 5}%`, 'sys'); }
            if (counts.green > 0) { p.hp = Math.min(p.maxHp, p.hp + counts.green * 15); p.armor = Math.min(p.maxArmor, p.armor + counts.green * 10); appState.log(`Лечение +${counts.green * 15}`, 'p'); }
            if (counts.yellow > 0) { p.gold += counts.yellow * 2; appState.log(`Золото +${counts.yellow * 2}`, 'sys'); }
        } else {
            let dmg = (counts.red * Math.floor(m.atk / 5)) + (counts.purple * Math.floor(m.atk / 3));
            if (dmg > 0) {
                if (p.armor > 0) { p.armor -= dmg; if (p.armor < 0) { p.hp += p.armor; p.armor = 0; } } else p.hp -= dmg;
                appState.log(`Урон от врага: -${dmg}`, 'm');
            }
            if (counts.blue > 0) m.mana = Math.min(100, m.mana + counts.blue * 10);
        }
        if (m.hp <= 0 && !appState.lootActive) this.showLootScreen();
        refreshUI();
    }

    async refill() {
        for (let c = 0; c < 8; c++) {
            let empty = 0;
            for (let r = 7; r >= 0; r--) {
                if (!this.grid[r][c]) empty++;
                else if (empty > 0) {
                    let t = this.grid[r][c]; this.grid[r + empty][c] = t; this.grid[r][c] = null;
                    t.gridR = r + empty; this.tweens.add({ targets: t, y: t.gridR * TILE_S + TILE_S / 2, duration: 250 });
                }
            }
            for (let i = 0; i < empty; i++) this.spawnTile(i, c, true);
        }
        await new Promise(r => this.time.delayedCall(250, r));
    }

    async mobAI() {
        if (appState.mob.hp <= 0 || appState.lootActive) return;
        let bestMove = null; let maxPoints = -1;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const directions = [[0, 1], [1, 0]];
                for (let [dr, dc] of directions) {
                    let nr = r + dr, nc = c + dc;
                    if (nr < 8 && nc < 8) {
                        let t1 = this.grid[r][c], t2 = this.grid[nr][nc];
                        if (!t1 || !t2) continue;
                        this.grid[r][c] = t2; this.grid[nr][nc] = t1;
                        let matches = this.findMatches();
                        if (matches.length > 0) {
                            let pts = matches.length; matches.forEach(m => { if (m.type === 'purple' || m.type === 'red') pts += 2; });
                            if (pts > maxPoints) { maxPoints = pts; bestMove = { t1, t2 }; }
                        }
                        this.grid[r][c] = t1; this.grid[nr][nc] = t2;
                    }
                }
            }
        }
        if (bestMove) {
            await this.swap(bestMove.t1, bestMove.t2); await this.check();
            if (appState.mob.mana >= 100) { appState.mob.mana = 0; appState.log(`ЯРОСТЬ ВРАГА!`, 'crit'); this.time.delayedCall(600, () => this.mobAI()); }
            else { appState.turn = "PLAYER"; }
        } else { appState.turn = "PLAYER"; }
        this.isAnimating = false; refreshUI();
    }

    async useUltra() {
        if (appState.player.mana < 100 || appState.lootActive || this.isAnimating) return;
        appState.player.mana = 0; let key = appState.player.key;
        appState.log(`УЛЬТА: ${appState.player.job}!`, 'crit');
        let toExplode = [];
        if (key === 'warrior') toExplode = this.grid.flat().filter(t => t && (t.type === 'red' || t.type === 'green'));
        if (key === 'mage') toExplode = this.grid.flat().filter(t => t && (t.type === 'purple' || t.type === 'yellow'));
        if (key === 'archer') { for (let i = 0; i < 4; i++) { let r = Math.floor(Math.random() * 8); for (let c = 0; c < 8; c++) if (this.grid[r][c]) toExplode.push(this.grid[r][c]); } }
        if (key === 'assassin') { toExplode = Phaser.Utils.Array.Shuffle(this.grid.flat().filter(t => t)).slice(0, 20); appState.mob.hp -= (appState.player.baseAtk * 2); }
        if (toExplode.length > 0) { await this.explodeUnique(toExplode); await this.refill(); await this.check(); }
        refreshUI();
    }

    showLootScreen() {
        appState.lootActive = true;
        const slots = Object.keys(SLOT_NAMES);
        const slot = slots[Math.floor(Math.random() * slots.length)];
        const rar = Math.random() > 0.95 ? 3 : Math.random() > 0.8 ? 2 : Math.random() > 0.5 ? 1 : 0;
        const power = (10 + appState.player.level * 8) * (1 + rar * 0.5);

        appState.currentLoot = {
            slot, rar,
            n: `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${SLOT_NAMES[slot]}`,
            atk: Math.floor(slot === 'weapon' || slot === 'ring' ? power : power / 4),
            arm: Math.floor(slot === 'body' || slot === 'head' ? power * 2 : power / 3),
            agi: Math.floor(Math.random() * 5 * (rar + 1))
        };

        let old = appState.player.equip[slot] || { n: "Пусто", atk: 0, arm: 0, agi: 0, rar: 0 };
        document.getElementById('loot-compare').innerHTML = `
            <div style="background:#222; padding:10px;"><b style="color:var(--rar${old.rar})">${old.n}</b><br>⚔️${old.atk} 🛡️${old.arm}</div>
            <div style="background:#222; padding:10px;"><b style="color:var(--rar${appState.currentLoot.rar})">${appState.currentLoot.n}</b><br>⚔️${appState.currentLoot.atk} 🛡️${appState.currentLoot.arm}</div>
        `;
        document.getElementById('loot-overlay').style.display = 'flex';
    }
}

let scene; // Для доступа в методах
