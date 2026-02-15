export default class Mob {
    constructor() {
        this.maxHp = 80;
        this.hp = 80;
    }

    takeDamage(amount) {
        this.hp -= amount;
        console.log("👹 Mob HP:", this.hp);

        if (this.hp <= 0) {
            console.log("☠️ Mob defeated");
        }
    }
}
