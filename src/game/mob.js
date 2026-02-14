import { refreshUI } from '../ui/ui.js';

export function spawnMob() {
  const lvl = window.app.player.level;

  window.app.mob = {
    name: `Гоблин Ур.${lvl}`,
    hp: 200 + lvl * 100,
    maxHp: 200 + lvl * 100,
    atk: 20 + lvl * 10,
    mana: 0
  };

  const portrait = document.getElementById('m-portrait');
  if (portrait) {
    portrait.style.backgroundImage = "url('assets/monster_goblin.jpg')";
  }

  window.app.turn = "PLAYER";
  window.app.lootActive = false;

  window.app.log(`Появился враг: ${window.app.mob.name}`, 'm');

  refreshUI();
}
