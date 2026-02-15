import { app } from "./core/app.js";
import { createPlayer } from "./core/player.js";
import { createMob } from "./core/mob.js";
import { initPhaser } from "./phaser/game.js";
import { refreshUI } from "./ui/ui.js";

window.startGame = function(key) {
    document.getElementById('menu-overlay').style.display = 'none';

    app.player = createPlayer(key);
    app.mob = createMob(1);

    const imgKey = key === 'assassin' ? 'assasin' : key;
    document.getElementById('p-portrait').style.backgroundImage =
        `url('assets/hero_${imgKey}.jpg')`;

    initPhaser();
    refreshUI();
};
