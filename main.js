export class GameScene extends Phaser.Scene {
    // ... твои методы preload и create ...

    async handlePointer(tile) {
        // Если анимация идет или сейчас ход моба — игнорируем клик
        if (this.isMoving || window.appState.turn !== "PLAYER") return;

        if (!this.selectedTile) {
            this.selectedTile = tile;
            tile.setAlpha(0.6); // Визуальный выбор
            return;
        }

        const t1 = this.selectedTile;
        const t2 = tile;
        const dist = Math.abs(t1.gridX - t2.gridX) + Math.abs(t1.gridY - t2.gridY);

        if (dist === 1) {
            this.isMoving = true; // Блокируем ввод
            t1.setAlpha(1);
            
            // Пытаемся поменять местами
            const success = await this.swapTiles(t1, t2);
            if (success) {
                // Если есть совпадение — запускаем цикл уничтожения и падения
                await this.processMatches();
                
                // Передаем ход монстру, если только игрок не в режиме суперспособности
                if (!this.ultraActive) {
                    this.enemyTurn();
                }
            } else {
                // Если совпадений нет — возвращаем назад и разблокируем
                this.isMoving = false;
            }
        } else {
            // Если кликнули далеко — просто перевыбираем плитку
            t1.setAlpha(1);
            this.selectedTile = t2;
            t2.setAlpha(0.6);
        }
    }

    // Обработка всех совпадений и падения новых плиток
    async processMatches() {
        let hasMatches = true;
        while (hasMatches) {
            const matches = this.getMatches(); // Ищем совпадения 3+ в ряд
            if (matches.length > 0) {
                await this.destroyTiles(matches); // Удаляем и начисляем урон
                await this.fillGaps(); // ТА САМАЯ ФУНКЦИЯ ПАДЕНИЯ
            } else {
                hasMatches = false;
            }
        }
        this.isMoving = false; // ОСВОБОЖДАЕМ ИГРУ ДЛЯ НОВОГО ХОДА
        this.selectedTile = null;
    }

    // Метод падения плиток (чтобы не зависало)
    async fillGaps() {
        return new Promise(resolve => {
            let maxDelay = 0;
            
            // Проходим по каждому столбцу
            for (let x = 0; x < this.gridSize; x++) {
                let emptySpaces = 0;
                // Идем снизу вверх
                for (let y = this.gridSize - 1; y >= 0; y--) {
                    const tile = this.grid[y][x];
                    if (!tile) {
                        emptySpaces++;
                    } else if (emptySpaces > 0) {
                        // Двигаем плитку вниз
                        const newY = y + emptySpaces;
                        this.grid[newY][x] = tile;
                        this.grid[y][x] = null;
                        tile.gridY = newY;
                        
                        this.tweens.add({
                            targets: tile,
                            y: newY * this.tileSize + this.offsetY,
                            duration: 300,
                            ease: 'Bounce.easeOut'
                        });
                        maxDelay = Math.max(maxDelay, 300);
                    }
                }
                
                // Создаем новые плитки сверху
                for (let i = 0; i < emptySpaces; i++) {
                    const newY = i;
                    const type = this.getRandomType();
                    const tile = this.createTile(x, newY - emptySpaces, type); // Спавним за экраном
                    
                    this.grid[newY][x] = tile;
                    tile.gridY = newY;
                    
                    this.tweens.add({
                        targets: tile,
                        y: newY * this.tileSize + this.offsetY,
                        duration: 300,
                        delay: 100,
                        ease: 'Bounce.easeOut'
                    });
                    maxDelay = Math.max(maxDelay, 400);
                }
            }
            this.time.delayedCall(maxDelay + 50, resolve);
        });
    }

    // ПРЕДОХРАНИТЕЛЬ: Метод для вызова из main.js
    resetBoardAfterBattle() {
        this.isMoving = false;
        this.selectedTile = null;
        if (this.grid) {
            this.grid.forEach(row => row.forEach(tile => {
                if (tile) tile.setAlpha(1);
            }));
        }
        console.log("Поле принудительно разблокировано для нового боя.");
    }
}
