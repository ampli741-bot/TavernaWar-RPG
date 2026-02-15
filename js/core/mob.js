export function createMob(level) {
    return {
        name: `Гоблин Ур.${level}`,
        hp: 200 + level * 100,
        maxHp: 200 + level * 100,
        atk: 20 + level * 10,
        mana: 0
    };
}
