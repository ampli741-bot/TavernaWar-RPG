export function refreshUI() {
  const p = window.app.player;
  const m = window.app.mob;
  if (!p || !m) return;

  // ===== ИГРОК =====
  document.getElementById('p-hp-t').innerText =
    `${Math.floor(p.hp)} / ${p.maxHp}`;
  document.getElementById('p-hp-f').style.width =
    (p.hp / p.maxHp * 100) + '%';

  document.getElementById('p-mn-t').innerText =
    `Мана: ${p.mana}%`;
  document.getElementById('p-mn-f').style.width =
    p.mana + '%';

  document.getElementById('gold-val').innerText = p.gold;

  document.getElementById('stat-atk').innerText = p.baseAtk;
  document.getElementById('stat-dodge').innerText =
    Math.min(60, p.baseAgi) + '%';

  // ===== ВРАГ =====
  document.getElementById('m-name').innerText = m.name;

  document.getElementById('m-hp-t').innerText =
    `${Math.floor(m.hp)} / ${m.maxHp}`;
  document.getElementById('m-hp-f').style.width =
    (m.hp / m.maxHp * 100) + '%';

  document.getElementById('m-mn-t').innerText =
    `Мана: ${m.mana}%`;
  document.getElementById('m-mn-f').style.width =
    m.mana + '%';
}
