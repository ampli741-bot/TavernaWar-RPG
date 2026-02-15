import { SLOT_NAMES, ADJECTIVES } from "../config/constants.js";
import { app } from "./app.js";

export function generateLoot() {
    const slots = Object.keys(SLOT_NAMES);
    const slot = slots[Math.floor(Math.random() * slots.length)];

    const rar =
        Math.random() > 0.95 ? 3 :
        Math.random() > 0.8 ? 2 :
        Math.random() > 0.5 ? 1 : 0;

    const power = (10 + app.player.level * 8) * (1 + rar * 0.5);

    return {
        slot,
        rar,
        n: `${ADJECTIVES[Math.floor(Math.random()*ADJECTIVES.length)]} ${SLOT_NAMES[slot]}`,
        atk: Math.floor(slot === 'weapon' ? power : power / 4),
        arm: Math.floor(slot === 'body' ? power * 2 : power / 3),
        agi: Math.floor(Math.random() * 5 * (rar + 1))
    };
}
