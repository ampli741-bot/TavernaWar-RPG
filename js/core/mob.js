export function createMob(level = 1) {
    return {
        level,
        hp: 80 + level * 20,
        maxHp: 80 + level * 20
    };
}
