console.log("🧨 MAIN VERSION CLEAN");

import { app } from "./core/app.js";
import { createPlayer } from "./core/player.js";
import { createMob } from "./core/mob.js";
import { initPhaser } from "./phaser/game.js";

window.startGame = function (key) {
    console.log("▶ startGame:", key);

    const menu = document.getElementById("menu-overlay");
    if (menu) menu.remove();

    app.player = createPlayer(key);
    app.mob = createMob(1);

    initPhaser();
};
