export function createPlayer(key) {
    const base = {
        warrior: { hp:1600, atk:25, agi:5 },
        mage: { hp:800, atk:65, agi:2 },
        archer: { hp:1000, atk:40, agi:18 },
        assassin: { hp:900, atk:55, agi:14 }
    }[key];

    return {
        job: key.toUpperCase(),
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
            weapon: { n:"Старая палка", atk:12, arm:0, agi:0, rar:0 }
        }
    };
}
