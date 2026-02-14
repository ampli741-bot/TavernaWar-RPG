import { startGame } from './game/game.js';

console.log("Taverna War app loaded");

window.app = {
  player: null,
  mob: null,
  lootActive: false,
  turn: "PLAYER"
};

window.startGame = startGame;
