console.log("🧨 MAIN VERSION CLEAN");

import { app } from "./core/app.js";
import { createPlayer } from "./core/player.js";
import { createMob } from "./core/mob.js";
import { initPhaser } from "./phaser/game.js";
import refreshUi from "./ui/ui.js";

window.startGame = function (key) {
    console.log("▶ startGame:", key);

    // убираем меню
    const menu = document.getElementById("menu-overlay");
    if (menu) {
        menu.remove();
    }

    // === INIT GAME STATE ===
    app.player = createPlayer(key);
    app.mob = createMob(1);

    // === START PHASER ===
    initPhaser();

    // === UI (безопасно)
    try {
        refreshUi();
    } catch (e) {
        console.warn("UI not ready yet (ok)");
    }
};
