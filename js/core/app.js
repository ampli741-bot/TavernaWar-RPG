export const app = {
    player: null,
    mob: null,
    lootActive: false,
    turn: "PLAYER",

    log(msg, type = 'sys') {
        const log = document.getElementById('battle-log');
        if (!log) return;

        const e = document.createElement('div');
        e.style.color =
            type === 'p' ? '#4f4' :
            type === 'm' ? '#f44' :
            type === 'crit' ? '#aa44ff' :
            '#ffd700';

        e.innerText = `> ${msg}`;
        log.prepend(e);
    }
};

// ❗ ОБЯЗАТЕЛЬНО
window.app = app;
