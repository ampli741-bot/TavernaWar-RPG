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
        this.grid = [];
        this.isAnimating = false;
        this.sel = null;

        // Создаем сетку 8x8
        for (let r = 0; r < 8; r++) {
            this.grid[r] = [];
            for (let c = 0; c < 8; c++) {
                this.spawnTile(r, c);
            }
        }
        console.log("✅ Скелет игры: Поле создано");
    }

    spawnTile(r, c, fromTop = false) {
        let types = ['red', 'blue', 'green', 'purple', 'yellow'];
        let type = Phaser.Utils.Array.GetRandom(types);
        let x = c * TILE_S + TILE_S / 2;
        let y = fromTop ? -TILE_S : r * TILE_S + TILE_S / 2;

        let container = this.add.container(x, y);
        
        // Визуал (упрощено для стабильности)
        let bg = this.add.graphics();
        bg.fillStyle(BG_COLORS[type], 1);
        bg.fillRoundedRect(-VISUAL_S/2, -VISUAL_S/2, VISUAL_S, VISUAL_S, 12);
        
        let img = this.add.image(0, 0, `t_${type}`);
        let zoom = (type === 'red' || type === 'blue' || type === 'purple') ? 2.15 : 1.5;
        img.setDisplaySize(VISUAL_S * zoom, VISUAL_S * zoom);

        let ghostGlow = this.add.graphics().setAlpha(0);
        ghostGlow.lineStyle(6, 0xffffff, 0.6);
        ghostGlow.strokeRoundedRect(-VISUAL_S/2 - 2, -VISUAL_S/2 - 2, VISUAL_S + 4, VISUAL_S + 4, 12);

        container.add([bg, img, ghostGlow]);
        container.gridR = r; 
        container.gridC = c; 
        container.type = type;
        container.ghostGlow = ghostGlow;

        let hitArea = this.add.rectangle(0, 0, TILE_S, TILE_S, 0, 0).setInteractive();
        hitArea.on('pointerdown', () => this.handlePointer(container));
        container.add(hitArea);

        this.grid[r][c] = container;
        return container;
    }

    async handlePointer(t) {
        // КРИТИЧЕСКАЯ ПРОВЕРКА: блокируем всё, если идет анимация или не наш ход
        if (this.isAnimating || appState.turn !== "PLAYER") return;

        if (!this.sel) {
            this.sel = t;
            t.ghostGlow.setAlpha(1);
            t.setScale(1.1);
        } else {
            let t1 = this.sel;
            let t2 = t;
            
            // Сброс выбора
            t1.ghostGlow.setAlpha(0);
            t1.setScale(1);
            this.sel = null;

            if (t1 === t2) return;

            const dist = Math.abs(t1.gridR - t2.gridR) + Math.abs(t1.gridC - t2.gridC);
            if (dist === 1) {
                this.isAnimating = true;
                console.log("🔄 Ход игрока: Обмен плиток...");
                
                await this.swap(t1, t2);
                let matches = this.findMatches();
                
                if (matches.length > 0) {
                    await this.runSequence(); // Запускаем цепочку взрывов
                    appState.turn = "MOB";
                    this.time.delayedCall(500, () => this.mobAI());
                } else {
                    await this.swap(t1, t2); // Возвращаем назад
                    this.isAnimating = false;
                }
            }
        }
    }

    // Главная последовательность: Взрыв -> Падение -> Проверка новых совпадений
    async runSequence() {
        let matches = this.findMatches();
        while (matches.length > 0) {
            await this.explodeUnique(matches);
            await this.fillGaps();
            matches = this.findMatches(); // Ищем новые комбо после падения
        }
        this.isAnimating = false;
        console.log("⌛ Цепочка завершена. Поле стабильно.");
    }

    async swap(t1, t2) {
        let r1 = t1.gridR, c1 = t1.gridC, r2 = t2.gridR, c2 = t2.gridC;
        this.grid[r1][c1] = t2; this.grid[r2][c2] = t1;
        t1.gridR = r2; t1.gridC = c2; t2.gridR = r1; t2.gridC = c1;

        return new Promise(res => {
            this.tweens.add({
                targets: t1,
                x: c2 * TILE_S + TILE_S / 2, y: r2 * TILE_S + TILE_S / 2,
                duration: 200, ease: 'Quad.easeInOut'
            });
            this.tweens.add({
                targets: t2,
                x: c1 * TILE_S + TILE_S / 2, y: r1 * TILE_S + TILE_S / 2,
                duration: 200, ease: 'Quad.easeInOut',
                onComplete: res
            });
        });
    }

    findMatches() {
        let matched = new Set();
        // Горизонталь
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 6; c++) {
                let t1 = this.grid[r][c], t2 = this.grid[r][c+1], t3 = this.grid[r][c+2];
                if (t1 && t2 && t3 && t1.type === t2.type && t1.type === t3.type) {
                    matched.add(t1); matched.add(t2); matched.add(t3);
                }
            }
        }
        // Вертикаль
        for (let c = 0; c < 8; c++) {
            for (let r = 0; r < 6; r++) {
                let t1 = this.grid[r][c], t2 = this.grid[r+1][c], t3 = this.grid[r+2][c];
                if (t1 && t2 && t3 && t1.type === t2.type && t1.type === t3.type) {
                    matched.add(t1); matched.add(t2); matched.add(t3);
                }
            }
        }
        return Array.from(matched);
    }

    async explodeUnique(matches) {
        let counts = { red: 0, blue: 0, green: 0, purple: 0, yellow: 0 };
        matches.forEach(t => {
            counts[t.type]++;
            this.grid[t.gridR][t.gridC] = null;
        });

        return new Promise(res => {
            this.tweens.add({
                targets: matches,
                scale: 0, alpha: 0,
                duration: 250,
                onComplete: () => {
                    matches.forEach(t => t.destroy());
                    this.applySummaryEffect(counts);
                    res();
                }
            });
        });
    }

    async fillGaps() {
        let promises = [];
        for (let c = 0; c < 8; c++) {
            let empty = 0;
            for (let r = 7; r >= 0; r--) {
                if (this.grid[r][c] === null) {
                    empty++;
                } else if (empty > 0) {
                    let t = this.grid[r][c];
                    this.grid[r + empty][c] = t;
                    this.grid[r][c] = null;
                    t.gridR = r + empty;
                    promises.push(new Promise(res => {
                        this.tweens.add({
                            targets: t,
                            y: t.gridR * TILE_S + TILE_S / 2,
                            duration: 300,
                            onComplete: res
                        });
                    }));
                }
            }
            // Создаем новые сверху
            for (let i = 0; i < empty; i++) {
                let r = i;
                let t = this.spawnTile(r, c, true);
                t.y = -(empty - i) * TILE_S; // Сдвигаем за верхнюю границу
                promises.push(new Promise(res => {
                    this.tweens.add({
                        targets: t,
                        y: r * TILE_S + TILE_S / 2,
                        duration: 400,
                        onComplete: res
                    });
                }));
            }
        }
        await Promise.all(promises);
    }

    // Остальная логика (AI, Эффекты) остается такой же, но с защитой
    applySummaryEffect(counts) {
        // (Твой код расчета урона)
        refreshUI();
    }

    async mobAI() {
        if (appState.mob.hp <= 0 || this.isAnimating) return;
        this.isAnimating = true;
        console.log("🤖 Ход моба...");

        // Имитируем поиск хода (упрощенно для теста)
        // Если хочешь полный AI — вставь свой старый код поиска bestMove здесь
        
        this.time.delayedCall(500, async () => {
            // ... логика хода моба ...
            // В конце хода моба всегда:
            appState.turn = "PLAYER";
            this.isAnimating = false;
            refreshUI();
        });
    }
}
