import { slotNames, adjs } from "../data/constants.js";

export const appState = {
    player: null,
    mob: null,
    turn: "PLAYER",
    lootActive: false,
    currentLoot: null
};

export function log(msg, type) {
    const logBox = document.getElementById('battle-log');
    if (!logBox) return;
    const entry = document.createElement('div');
    entry.style.color = type==='p'?'#4f4':type==='m'?'#f44':type==='crit'?'#aa44ff':'#ffd700';
    entry.innerText = `> ${msg}`;
    logBox.prepend(entry);
}

export function refreshUI() {
    const p = appState.player; const m = appState.mob;
    if (!p || !m) return;

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
    document.getElementById('stat-dodge').innerText = Math.min(60, p.baseAgi + gearAgi) + "%";
    document.getElementById('gold-val').innerText = p.gold;
    document.getElementById('m-hp-t').innerText = `HP: ${Math.floor(m.hp)}/${m.maxHp}`;
    document.getElementById('m-hp-f').style.width = (m.hp/m.maxHp*100)+'%';
    document.getElementById('m-mn-t').innerText = `Мана: ${m.mana}%`;
    document.getElementById('m-mn-f').style.width = m.mana+'%';
    document.getElementById('inv-box').innerHTML = invH;
}
