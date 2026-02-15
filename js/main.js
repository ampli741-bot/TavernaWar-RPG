import { app } from "./core/app.js";
import { createPlayer } from "./core/player.js";
import { createMob } from "./core/mob.js";
import { initPhaser } from "./phaser/game.js";
import refreshUi from "./ui/ui.js";

console.log("🔥 main.js FINAL loaded");

window.startGame = function (key) {
    console.log("▶ startGame:", key);

    // ❌ БОЛЬШЕ НИКАКИХ .style У DOM
    const menu = document.getElementById("menu-overlay");
    if (menu) {
        menu.remove(); // 💥 просто удаляем меню
    }

    // === INIT GAME STATE ===
    app.player = createPlayer(key);
    app.mob = createMob(1);

    // === START PHASER ===
    initPhaser();

    // === SAFE UI UPDATE ===
    try {
        refreshUi();
    } catch (e) {
        console.warn("UI not ready yet (ok)");
    }
};
