export const app = {
    player: null,
    mob: null
};

export function initAppState(heroKey) {
    const base = {
        warrior: { hp: 1600, mana: 0, armor: 0 },
        mage: { hp: 800, mana: 0, armor: 0 },
        archer: { hp: 1000, mana: 0, armor: 0 },
        assassin: { hp: 900, mana: 0, armor: 0 }
    }[heroKey];

    app.player = {
        key: heroKey,
        maxHp: base.hp,
        hp: base.hp,
        maxMana: 100,
        mana: base.mana,
        maxArmor: 100,
        armor: base.armor
    };

    // моб-заглушка
    app.mob = {
        name: '???',
        maxHp: 1200,
        hp: 1200,
        maxMana: 100,
        mana: 0
    };

    updateUI();
}

/* ================= UI ================= */

export function updateUI() {
    const p = app.player;
    const m = app.mob;

    // PLAYER
    setBar('p-hp-f', p.hp / p.maxHp);
    setText('p-hp-t', `${p.hp} / ${p.maxHp}`);

    setBar('p-mn-f', p.mana / p.maxMana);
    setText('p-mn-t', `Мана: ${p.mana}%`);

    setBar('p-arm-f', p.armor / p.maxArmor);
    setText('p-arm-t', `Броня: ${p.armor}`);

    document.getElementById('p-portrait').style.backgroundImage =
        `url('assets/hero_${p.key}.jpg')`;

    // MOB
    setBar('m-hp-f', m.hp / m.maxHp);
    setText('m-hp-t', `${m.hp} / ${m.maxHp}`);

    setBar('m-mn-f', m.mana / m.maxMana);
    setText('m-mn-t', `Мана: ${m.mana}%`);

    document.getElementById('m-name').innerText = m.name;
    document.getElementById('m-portrait').style.backgroundImage =
        `url('assets/monster_placeholder.jpg')`;
}

/* ================= helpers ================= */

function setBar(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = `${Math.max(0, Math.min(1, value)) * 100}%`;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}
