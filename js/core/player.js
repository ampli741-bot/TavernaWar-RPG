export function createPlayer(type) {
    return {
        type,
        hp: 100,
        maxHp: 100,
        mana: 0,
        maxMana: 100,
        gold: 0,
        curse: 0
    };
}
