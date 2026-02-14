// src/data/classes.js
// Описание базовых классов героев

export const HERO_CLASSES = {
  warrior: {
    key: "warrior",
    name: "ВОИН",
    hp: 1600,
    atk: 25,
    agi: 5,
    ultra: "RED + GREEN"
  },

  mage: {
    key: "mage",
    name: "МАГ",
    hp: 800,
    atk: 65,
    agi: 2,
    ultra: "PURPLE + YELLOW"
  },

  archer: {
    key: "archer",
    name: "ЛУЧНИК",
    hp: 1000,
    atk: 40,
    agi: 18,
    ultra: "4 LINES"
  },

  assassin: {
    key: "assassin",
    name: "УБИЙЦА",
    hp: 900,
    atk: 55,
    agi: 14,
    ultra: "30% FIELD + HIT"
  }
};
