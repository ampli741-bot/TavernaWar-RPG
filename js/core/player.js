export default class Player {
    constructor() {
        this.maxHp = 100;
        this.hp = 100;

        this.maxMana = 100;
        this.mana = 0;

        this.gold = 0;
    }

    applyTurn(result) {
        if (result.damage) {
            console.log("⚔️ Player deals", result.damage);
        }

        if (result.mana) {
            this.mana = Math.min(this.maxMana, this.mana + result.mana * 10);
            console.log("🔵 Player mana +", result.mana * 10);
        }

        if (result.heal) {
            this.hp = Math.min(this.maxHp, this.hp + result.heal * 5);
            console.log("💚 Player heal +", result.heal * 5);
        }

        if (result.gold) {
            this.gold += result.gold;
            console.log("💰 Gold +", result.gold);
        }

        if (result.curse) {
            console.log("💜 Curse applied:", result.curse);
        }
    }
}
