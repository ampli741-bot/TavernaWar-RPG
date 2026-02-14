import { spawnMob } from './mob.js';
import { HERO_CLASSES } from '../data/classes.js';

export function startGame(key) {
  const base = HERO_CLASSES[key];

  const imgKey = key === 'assassin' ? 'assasin' : key;

  window.app.player = {
    job: base.name,
    key,
    hp: base.hp,
    maxHp: base.hp,
    armor: 0,
    maxArmor: 0,
    mana: 0,
    gold: 0,
    level: 1,
    baseAtk: base.atk,
    baseAgi: base.agi,
    equip: {
      weapon: { n: "Старая палка", atk: 12, arm: 0, agi: 0, rar: 0 }
    }
  };

  const portrait = document.getElementById('p-portrait');
  if (portrait) {
    portrait.style.backgroundImage = `url('assets/hero_${imgKey}.jpg')`;
  }

  window.app.log(`Выбран герой: ${base.name}`, 'sys');

  // ❗ ВАЖНО: враг появляется ТОЛЬКО после выбора героя
  spawnMob();
}
