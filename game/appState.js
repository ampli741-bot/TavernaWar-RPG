export const appState = {
    player: null,
    mob: null,
    lootActive: false,
    turn: "PLAYER",
    
    log(msg, type) {
        const log = document.getElementById('battle-log');
        if (!log) return;
        const entry = document.createElement('div');
        entry.style.color = type === 'p' ? '#4f4' : type === 'm' ? '#f44' : type === 'crit' ? '#aa44ff' : '#ffd700';
        entry.innerText = `> ${msg}`;
        log.prepend(entry);
    }
};
