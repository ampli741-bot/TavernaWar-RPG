import { app } from "../core/app.js";
import { SLOT_NAMES } from "../config/constants.js";

function refreshUI() {
    const p = app.player;
    const m = app.mob;

    if (!p || !m) return;

    // === PLAYER HP ===
    document.getElementById("p-hp-t").innerText =
        `${Math.floor(p.hp)} / ${p.maxHp}`;
    document.getElementById("p-hp-f").style.width =
        (p.hp / p.maxHp * 100) + "%";

    // === PLAYER MANA ===
    document.getElementById("p-mn-t").innerText =
        `Мана: ${p.mana}%`;
    document.getElementById("p-mn-f").style.width =
        p.mana + "%";

    // === GOLD ===
    document.getElementById("gold-val").innerText = p.gold;

    // === STATS ===
    let atk = p.baseAtk;
    let agi = p.baseAgi;
    let armorMax = 0;

    for (const slot in SLOT_NAMES) {
        const item = p.equip[slot];
        if (item) {
            atk += item.atk || 0;
            agi += item.agi || 0;
            armorMax += item.arm || 0;
        }
    }

    p.maxArmor = armorMax;

    document.getElementById("stat-atk").innerText = atk;
    document.getElementById("stat-dodge").innerText =
        Math.min(60, agi) + "%";

    document.getElementById("p-arm-t").innerText =
        `Броня: ${Math.floor(p.armor)} / ${p.maxArmor}`;
    document.getElementById("p-arm-f").style.width =
        p.maxArmor > 0
            ? (p.armor / p.maxArmor * 100) + "%"
            : "0%";

    // === INVENTORY ===
    const inv = document.getElementById("inv-box");
    let html = "";

    for (const slot in SLOT_NAMES) {
        const item = p.equip[slot];
        html += `
            <div class="inv-item">
                <div>
                    <b>${SLOT_NAMES[slot]}:</b>
                    ${item ? item.n : "---"}
                </div>
                <div style="font-size:10px">
                    ${item ? `⚔️${item.atk} 🛡️${item.arm}` : ""}
                </div>
            </div>
        `;
    }

    inv.innerHTML = html;

    // === MOB ===
    document.getElementById("m-name").innerText = m.name;
    document.getElementById("m-hp-t").innerText =
        `HP: ${Math.floor(m.hp)} / ${m.maxHp}`;
    document.getElementById("m-hp-f").style.width =
        (m.hp / m.maxHp * 100) + "%";

    document.getElementById("m-mn-t").innerText =
        `Мана: ${m.mana}%`;
    document.getElementById("m-mn-f").style.width =
        m.mana + "%";
}

// 🔴 ВАЖНО: ИМЕННО ТАКОЙ ЭКСПОРТ
export { refreshUI };
